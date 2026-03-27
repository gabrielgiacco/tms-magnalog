import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const ctes = await prisma.cTe.findMany({
      where: { faturaId: null },
      orderBy: { dataEmissao: "asc" },
      include: {
        entrega: {
          select: {
            codigo: true,
            status: true,
            notas: { select: { numero: true, chaveAcesso: true } }
          }
        }
      }
    });

    // Agrupar no backend para facilitar a visualização no Frontend por "Tomador"
    const grouped = ctes.reduce((acc: any, cte) => {
      const cnpj = cte.tomadorCNPJ || "Sem CNPJ";
      if (!acc[cnpj]) {
        acc[cnpj] = {
          tomadorNome: cte.tomadorNome || "Tomador Desconhecido",
          tomadorCNPJ: cnpj,
          totalValor: 0,
          ctes: []
        };
      }
      acc[cnpj].ctes.push(cte);
      acc[cnpj].totalValor += cte.valor;
      return acc;
    }, {});

    return NextResponse.json(Object.values(grouped));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

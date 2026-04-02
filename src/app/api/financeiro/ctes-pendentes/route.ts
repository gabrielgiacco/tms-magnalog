import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const ctes = await prisma.cTe.findMany({
      where: { faturaId: null },
      orderBy: { dataEmissao: "desc" },
      include: {
        notas: {
          select: { numero: true, entregaId: true, destinatarioRazao: true },
        },
      },
    });

    // Agrupar por tomador (cliente que paga o frete)
    const grouped: Record<string, any> = {};
    for (const cte of ctes) {
      const cnpj = cte.tomadorCnpj || "SEM_CNPJ";
      if (!grouped[cnpj]) {
        grouped[cnpj] = {
          tomadorNome: cte.tomadorNome || "Tomador Desconhecido",
          tomadorCnpj: cnpj,
          totalValor: 0,
          ctes: [],
        };
      }
      grouped[cnpj].ctes.push({
        id: cte.id,
        numero: cte.numero,
        chaveAcesso: cte.chaveAcesso,
        dataEmissao: cte.dataEmissao,
        valorReceber: cte.valorReceber,
        notas: cte.notas,
      });
      grouped[cnpj].totalValor += cte.valorReceber;
    }

    return NextResponse.json(Object.values(grouped));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

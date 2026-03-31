import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const sessionUser = session.user as any;

  // Buscar fornecedores autorizados para o usuário
  const autorizados = await prisma.fornecedorAutorizado.findMany({
    where: { userId: sessionUser.id },
    select: { cnpjEmitente: true },
  });

  if (!autorizados.length) {
    return NextResponse.json({ notas: [], mensagem: "Nenhum fornecedor autorizado para visualização." });
  }

  const cnpjs = autorizados.map((a: any) => a.cnpjEmitente);

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 50;
  const skip = (page - 1) * limit;
  const busca = searchParams.get("numero");
  const status = searchParams.get("status");

  const where: any = {
    emitenteCnpj: { in: cnpjs },
  };

  if (busca) {
    const orConditions: any[] = [
      { numero: { contains: busca } },
      { destinatarioRazao: { contains: busca, mode: "insensitive" } },
      { emitenteRazao: { contains: busca, mode: "insensitive" } },
      { cidade: { contains: busca, mode: "insensitive" } },
      { chaveAcesso: { contains: busca } },
    ];
    const digits = busca.replace(/\D/g, "");
    if (digits.length > 0) {
      orConditions.push({ destinatarioCnpj: { contains: digits } });
    }
    where.OR = orConditions;
  }

  if (status) {
    where.entrega = { status };
  }

  const [notas, total] = await Promise.all([
    prisma.notaFiscal.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        entrega: {
          select: {
            id: true,
            codigo: true,
            status: true,
            dataAgendada: true,
            dataEntrega: true,
            cidade: true,
            notas: { select: { numero: true } },
            motorista: { select: { nome: true } },
          },
        },
      },
    }),
    prisma.notaFiscal.count({ where }),
  ]);

  return NextResponse.json({ notas, total, pages: Math.ceil(total / limit) });
}

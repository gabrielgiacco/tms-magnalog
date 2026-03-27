import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const faturas = await prisma.fatura.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        cliente: true,
        ctes: true,
        reembolsos: true, // Se existirem no banco como ContaPagar vinculada
        _count: { select: { ctes: true } }
      }
    });

    return NextResponse.json(faturas);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const body = await req.json();
    const { cnpj, razaoSocial, cteIds, vencimento } = body;

    // Achar cliente pelo CNPJ (ou criar) para relacionar
    const cliente = await prisma.cliente.upsert({
      where: { cnpj },
      update: { razaoSocial: razaoSocial || "Cliente do Faturamento" },
      create: { cnpj, razaoSocial: razaoSocial || "Cliente do Faturamento" }
    });

    // Calcular soma
    const ctes = await prisma.cTe.findMany({ where: { id: { in: cteIds } } });
    const valorTotal = ctes.reduce((sum, cte) => sum + cte.valor, 0);

    // Gerar num fatura
    const count = await prisma.fatura.count();
    const nfNum = `FAT-${String(count + 1).padStart(5, '0')}`;

    const fatura = await prisma.fatura.create({
      data: {
        numero: nfNum,
        clienteId: cliente.id,
        valorTotal,
        vencimento: vencimento ? new Date(vencimento) : new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 dias padrao
        status: "ABERTA",
        ctes: {
          connect: cteIds.map((id: string) => ({ id }))
        }
      }
    });

    return NextResponse.json(fatura, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const fatura = await prisma.fatura.update({
      where: { id: body.id },
      data: {
        status: body.status, // "PAGA" | "CANCELADA"
      }
    });
    return NextResponse.json(fatura);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

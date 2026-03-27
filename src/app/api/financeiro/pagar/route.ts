import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const tipo = searchParams.get("tipo"); // 'MOTORISTA', 'DESCARGA'
    const status = searchParams.get("status"); // 'PENDENTE', 'PAGO'

    const where: any = {};
    if (tipo) where.tipo = tipo;
    if (status) where.status = status;

    const contas = await prisma.contaPagar.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        entrega: {
          select: {
            codigo: true,
            notas: { select: { numero: true } }
          }
        },
        rota: {
          select: { codigo: true }
        }
      }
    });

    return NextResponse.json(contas);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const conta = await prisma.contaPagar.create({
      data: {
        descricao: body.descricao,
        valor: body.valor,
        vencimento: body.vencimento ? new Date(body.vencimento) : null,
        tipo: body.tipo, // 'MOTORISTA' | 'DESCARGA'
        entregaId: body.entregaId,
        rotaId: body.rotaId,
        status: "PENDENTE"
      }
    });
    return NextResponse.json(conta, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const conta = await prisma.contaPagar.update({
      where: { id: body.id },
      data: {
        status: body.status,
        dataPagamento: body.status === "PAGO" ? new Date() : null,
        valor: body.valor
      }
    });
    return NextResponse.json(conta);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

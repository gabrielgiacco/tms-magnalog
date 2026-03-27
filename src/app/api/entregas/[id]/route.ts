import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const entrega = await prisma.entrega.findUnique({
    where: { id: params.id },
    include: {
      motorista: true,
      veiculo: true,
      rota: true,
      notas: { orderBy: { createdAt: "asc" } },
      ocorrencias: { orderBy: { createdAt: "desc" } },
      cliente: true,
    },
  });

  if (!entrega) return NextResponse.json({ error: "Não encontrada" }, { status: 404 });
  return NextResponse.json(entrega);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json();

  // Recalcular saldo pendente automaticamente
  const valorFrete = body.valorFrete ?? undefined;
  const adiantamento = body.adiantamento ?? undefined;

  const data: any = { ...body };

  // Transformar strings vazias (UI blank fields) em nulos para o Prisma
  Object.keys(data).forEach((key) => {
    if (data[key] === "") {
      data[key] = null;
    }
  });

  if (data.dataChegada) data.dataChegada = new Date(data.dataChegada);
  if (data.dataAgendada) data.dataAgendada = new Date(data.dataAgendada);
  if (data.dataEntrega) data.dataEntrega = new Date(data.dataEntrega);
  if (data.dataPagamento) data.dataPagamento = new Date(data.dataPagamento);

  // Calcular saldo automaticamente se frete ou adiantamento mudou
  if (valorFrete !== undefined || adiantamento !== undefined) {
    const current = await prisma.entrega.findUnique({ where: { id: params.id } });
    const frete = valorFrete ?? current?.valorFrete ?? 0;
    const adt = adiantamento ?? current?.adiantamento ?? 0;
    data.saldoPendente = frete - adt;
  }

  // Calcular dias de armazenagem automaticamente
  if (body.status === "FINALIZADO" && body.dataEntrega) {
    const entrega = await prisma.entrega.findUnique({ where: { id: params.id } });
    if (entrega?.dataChegada) {
      const chegada = new Date(entrega.dataChegada);
      const entregaDate = new Date(body.dataEntrega);
      const dias = Math.floor((entregaDate.getTime() - chegada.getTime()) / (1000 * 60 * 60 * 24));
      data.diasArmazenagem = Math.max(0, dias);
    }
  }

  // Remove relational fields that can't be set directly
  delete data.notas;
  delete data.motorista;
  delete data.veiculo;
  delete data.rota;
  delete data.cliente;
  delete data.ocorrencias;
  delete data._count;
  delete data.id;
  delete data.codigo;
  delete data.createdAt;

  const entrega = await prisma.entrega.update({
    where: { id: params.id },
    data,
    include: {
      motorista: true,
      veiculo: true,
      rota: true,
      notas: true,
      ocorrencias: true,
    },
  });

  return NextResponse.json(entrega);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const user = (session.user as any);
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  await prisma.entrega.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const veiculos = await prisma.veiculo.findMany({
    where: { ativo: true },
    orderBy: { placa: "asc" },
    include: { motorista: { select: { nome: true } }, _count: { select: { entregas: true } } },
  });

  return NextResponse.json(veiculos);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  const veiculo = await prisma.veiculo.create({
    data: {
      placa: body.placa.toUpperCase(),
      tipo: body.tipo,
      modelo: body.modelo || null,
      ano: body.ano ? parseInt(body.ano) : null,
      capacidadeKg: body.capacidadeKg ? parseFloat(body.capacidadeKg) : null,
      motoristaId: body.motoristaId || null,
    },
  });

  return NextResponse.json(veiculo, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  const { id, ...data } = body;
  
  Object.keys(data).forEach((key) => {
    if (data[key] === "") data[key] = null;
  });

  if (data.placa) data.placa = data.placa.toUpperCase();
  if (data.ano) data.ano = parseInt(data.ano);
  if (data.capacidadeKg) data.capacidadeKg = parseFloat(data.capacidadeKg);

  const veiculo = await prisma.veiculo.update({ where: { id }, data });
  return NextResponse.json(veiculo);
}

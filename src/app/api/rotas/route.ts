import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { generateCodigoRota } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const where: any = {};
  if (status) where.status = status;

  const rotas = await prisma.rota.findMany({
    where,
    orderBy: { data: "desc" },
    include: {
      motorista: { select: { id: true, nome: true } },
      veiculo: { select: { id: true, placa: true, tipo: true } },
      entregas: {
        select: { id: true, codigo: true, razaoSocial: true, cidade: true, status: true, pesoTotal: true, volumeTotal: true, notas: { select: { numero: true } } },
      },
      _count: { select: { entregas: true } },
    },
  });

  return NextResponse.json(rotas);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  const count = await prisma.rota.count();
  const codigo = generateCodigoRota(count + 1);

  // Calcular totais das entregas se fornecidas
  let pesoTotal = 0;
  let volumeTotal = 0;
  if (body.entregaIds?.length) {
    const entregas = await prisma.entrega.findMany({
      where: { id: { in: body.entregaIds } },
      select: { pesoTotal: true, volumeTotal: true },
    });
    pesoTotal = entregas.reduce((s: number, e: any) => s + e.pesoTotal, 0);
    volumeTotal = entregas.reduce((s: number, e: any) => s + e.volumeTotal, 0);
  }

  const rota = await prisma.rota.create({
    data: {
      codigo,
      data: new Date(body.data),
      motoristaId: body.motoristaId || null,
      veiculoId: body.veiculoId || null,
      pesoTotal,
      volumeTotal,
      valorMotorista: parseFloat(body.valorMotorista) || 0,
      observacoes: body.observacoes,
      status: "PLANEJADA",
    },
  });

  // Associar entregas à rota e propagar dados
  if (body.entregaIds?.length) {
    await prisma.entrega.updateMany({
      where: { id: { in: body.entregaIds } },
      data: { 
        rotaId: rota.id,
        motoristaId: rota.motoristaId,
        veiculoId: rota.veiculoId,
        valorMotorista: rota.valorMotorista,
        status: "CARREGADO" // Quando entra na rota, assume que está pronto pra sair
      },
    });
  }

  return NextResponse.json(rota, { status: 201 });
}

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

  try {
    const body = await req.json();

    // Novo cálculo de código robusto (evita duplicatas se rotas forem excluídas)
    const lastRota = await prisma.rota.findFirst({
      orderBy: { codigo: "desc" },
    });
    
    let nextNum = 1;
    if (lastRota?.codigo) {
      const match = lastRota.codigo.match(/\d+/);
      if (match) nextNum = parseInt(match[0]) + 1;
    }
    const codigo = generateCodigoRota(nextNum);

    // Calcular totais das entregas se fornecidas
    let pesoTotal = 0;
    let volumeTotal = 0;
    if (body.entregaIds?.length) {
      const entregas = await prisma.entrega.findMany({
        where: { id: { in: body.entregaIds } },
        select: { pesoTotal: true, volumeTotal: true },
      });
      pesoTotal = entregas.reduce((s: number, e: any) => s + (e.pesoTotal || 0), 0);
      volumeTotal = entregas.reduce((s: number, e: any) => s + (e.volumeTotal || 0), 0);
    }

    const rota = await prisma.rota.create({
      data: {
        codigo,
        data: body.data ? new Date(body.data) : new Date(),
        motoristaId: body.motoristaId || null,
        veiculoId: body.veiculoId || null,
        pesoTotal,
        volumeTotal: Math.round(volumeTotal), // Garante que seja Int
        valorMotorista: parseFloat(String(body.valorMotorista).replace(",", ".")) || 0,
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
          status: "CARREGADO"
        },
      });
    }

    return NextResponse.json(rota, { status: 201 });
  } catch (error: any) {
    console.error("ERRO_CRIAR_ROTA:", error);
    return NextResponse.json({ 
      error: "Erro interno ao criar rota", 
      details: error.message,
      code: error.code // Prisma error codes
    }, { status: 500 });
  }
}

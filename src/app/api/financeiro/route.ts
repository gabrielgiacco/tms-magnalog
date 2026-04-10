import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const user = session.user as any;
  if (!["ADMIN", "FINANCEIRO"].includes(user.role)) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const pendente = searchParams.get("pendente") === "true";
  const search = searchParams.get("cliente");
  const dataInicio = searchParams.get("dataInicio");
  const dataFim = searchParams.get("dataFim");

  // Filter for Direct Deliveries (no rota)
  const whereEntrega: any = { 
    rotaId: null,
    status: { notIn: ["PROGRAMADO", "EM_SEPARACAO"] } 
  };
  if (pendente) whereEntrega.dataPagamentoSaldo = null;
  if (dataInicio || dataFim) {
    whereEntrega.createdAt = {};
    if (dataInicio) whereEntrega.createdAt.gte = new Date(dataInicio);
    if (dataFim) {
      const fim = new Date(dataFim);
      fim.setHours(23, 59, 59, 999);
      whereEntrega.createdAt.lte = fim;
    }
  }
  if (search) {
    whereEntrega.OR = [
      { motorista: { nome: { contains: search, mode: "insensitive" } } },
      { notas: { some: { numero: { contains: search } } } }
    ];
  }

  // Filter for Routes
  const whereRota: any = {
    status: { notIn: ["CANCELADA"] }
  };
  if (pendente) whereRota.dataPagamentoSaldo = null;
  if (dataInicio || dataFim) {
    whereRota.createdAt = {};
    if (dataInicio) whereRota.createdAt.gte = new Date(dataInicio);
    if (dataFim) {
      const fim = new Date(dataFim);
      fim.setHours(23, 59, 59, 999);
      whereRota.createdAt.lte = fim;
    }
  }
  if (search) {
    whereRota.OR = [
      { motorista: { nome: { contains: search, mode: "insensitive" } } },
      { entregas: { some: { notas: { some: { numero: { contains: search } } } } } }
    ];
  }

  const [entregasDiretas, rotas] = await Promise.all([
    prisma.entrega.findMany({
      where: whereEntrega,
      orderBy: { createdAt: "desc" },
      select: {
        id: true, codigo: true, razaoSocial: true, cidade: true, status: true,
        valorMotorista: true, valorSaida: true, adiantamentoMotorista: true, dataAdiantamento: true,
        descontosMotorista: true, saldoMotorista: true, dataPagamentoSaldo: true, statusCanhoto: true,
        dataEntrega: true, dataAgendada: true, motorista: { select: { nome: true } },
        notas: { select: { numero: true } },
        _count: { select: { notas: true } },
        createdAt: true,
      },
    }),
    prisma.rota.findMany({
      where: whereRota,
      orderBy: { createdAt: "desc" },
      include: {
        motorista: { select: { nome: true } },
        entregas: {
          select: { id: true, notas: { select: { numero: true } } }
        },
        _count: { select: { entregas: true } }
      }
    })
  ]);

  // Combine into a single list
  const viagens: any[] = [
    ...entregasDiretas.map(e => ({ ...e, isRota: false })),
    ...rotas.map((r: any) => ({
      id: r.id,
      codigo: r.codigo,
      razaoSocial: `Rota Fracionada (${r._count.entregas} entregas)`,
      cidade: "Múltiplos Destinos",
      status: r.status,
      valorMotorista: r.valorMotorista || 0,
      valorSaida: r.valorSaida || 0,
      adiantamentoMotorista: r.adiantamentoMotorista || 0,
      dataAdiantamento: r.dataAdiantamento,
      descontosMotorista: r.descontosMotorista || 0,
      saldoMotorista: r.saldoMotorista || 0,
      dataPagamentoSaldo: r.dataPagamentoSaldo,
      statusCanhoto: r.statusCanhoto,
      motorista: r.motorista,
      isRota: true,
      notas: r.entregas.flatMap((e: any) => e.notas),
      _count: { notas: r.entregas.length },
      dataEntrega: r.data,
      createdAt: r.createdAt,
    }))
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Aggregate totals
  const totais = viagens.reduce((acc, v) => ({
    valorMotorista: (acc.valorMotorista || 0) + v.valorMotorista,
    adiantamentoMotorista: (acc.adiantamentoMotorista || 0) + v.adiantamentoMotorista,
    saldoMotorista: (acc.saldoMotorista || 0) + v.saldoMotorista,
    valorSaida: (acc.valorSaida || 0) + v.valorSaida,
    descontosMotorista: (acc.descontosMotorista || 0) + v.descontosMotorista,
  }), {});

  return NextResponse.json({
    entregas: viagens, // maintain key name for frontend compatibility
    total: viagens.length,
    pages: 1, // pagination simplified for unified view
    totais,
  });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const user = session.user as any;
  if (!["ADMIN", "FINANCEIRO"].includes(user.role)) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const body = await req.json();
  const { 
    id, 
    isRota,
    adiantamentoMotorista, dataAdiantamento, 
    descontosMotorista, 
    dataPagamentoSaldo, 
    statusCanhoto,
    valorMotorista,
    valorSaida
  } = body;

  const model = isRota ? prisma.rota : prisma.entrega;
  const current = await (model as any).findUnique({ where: { id } });
  if (!current) return NextResponse.json({ error: "Não encontrada" }, { status: 404 });

  // Compute balance
  const vMotorista = valorMotorista ?? current.valorMotorista;
  const vAdiantamento = adiantamentoMotorista ?? current.adiantamentoMotorista;
  const vSaida = valorSaida ?? current.valorSaida;
  const vDescontos = descontosMotorista ?? current.descontosMotorista;
  
  const saldoFinalMotorista = vMotorista - vAdiantamento - vSaida - vDescontos;

  const result = await (model as any).update({
    where: { id },
    data: {
      ...(valorMotorista !== undefined && { valorMotorista }),
      ...(valorSaida !== undefined && { valorSaida }),
      ...(adiantamentoMotorista !== undefined && { adiantamentoMotorista }),
      ...(dataAdiantamento !== undefined && { dataAdiantamento: dataAdiantamento ? new Date(dataAdiantamento) : null }),
      ...(descontosMotorista !== undefined && { descontosMotorista }),
      ...(dataPagamentoSaldo !== undefined && { dataPagamentoSaldo: dataPagamentoSaldo ? new Date(dataPagamentoSaldo) : null }),
      ...(statusCanhoto !== undefined && { statusCanhoto }),
      saldoMotorista: saldoFinalMotorista,
    },
  });

  return NextResponse.json(result);
}

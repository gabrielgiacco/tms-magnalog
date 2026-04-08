import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const tipo = searchParams.get("tipo") || "mensal";
  const ano = parseInt(searchParams.get("ano") || String(new Date().getFullYear()));
  const mes = parseInt(searchParams.get("mes") || String(new Date().getMonth() + 1));

  // ─── Relatório Mensal ──────────────────────────────────────────────────────
  if (tipo === "mensal") {
    const inicio = new Date(ano, mes - 1, 1);
    const fim = new Date(ano, mes, 0, 23, 59, 59);

    const [entregasCount, porStatus, porCidade, finEntrega, finRota, notas] = await Promise.all([
      // Total de entregas
      prisma.entrega.count({ where: { dataAgendada: { gte: inicio, lte: fim } } }),
      // Por status
      prisma.entrega.groupBy({
        by: ["status"],
        where: { dataAgendada: { gte: inicio, lte: fim } },
        _count: true,
      }),
      // Por cidade (top 10)
      prisma.entrega.groupBy({
        by: ["cidade"],
        where: { dataAgendada: { gte: inicio, lte: fim } },
        _count: true,
        orderBy: { _count: { cidade: "desc" } },
        take: 10,
      }),
      // Financeiro Entregas Diretas (Sem Rota)
      (prisma.entrega as any).aggregate({
        where: { rotaId: null, dataAgendada: { gte: inicio, lte: fim } },
        _sum: { valorFrete: true, valorDescarga: true, valorArmazenagem: true, adiantamentoMotorista: true, saldoMotorista: true },
        _avg: { valorFrete: true },
      }),
      // Financeiro Rotas
      (prisma.rota as any).aggregate({
        where: { data: { gte: inicio, lte: fim } },
        _sum: { valorMotorista: true, adiantamentoMotorista: true, saldoMotorista: true },
      }),
      // Notas fiscais
      prisma.notaFiscal.count({ where: { createdAt: { gte: inicio, lte: fim } } }),
    ]);

    // Calcular receita total de todas as entregas (mesmo as em rotas)
    const receitaTotal: any = await prisma.entrega.aggregate({
      where: { dataAgendada: { gte: inicio, lte: fim } },
      _sum: { valorFrete: true },
      _avg: { valorFrete: true }
    });

    const financeiro = {
      _sum: {
        valorFrete: receitaTotal._sum.valorFrete || 0,
        valorDescarga: (finEntrega._sum as any).valorDescarga || 0,
        valorArmazenagem: (finEntrega._sum as any).valorArmazenagem || 0,
        adiantamento: ((finEntrega._sum as any).adiantamentoMotorista || 0) + ((finRota._sum as any).adiantamentoMotorista || 0),
        saldoPendente: ((finEntrega._sum as any).saldoMotorista || 0) + ((finRota._sum as any).saldoMotorista || 0),
      },
      _avg: {
        valorFrete: receitaTotal._avg.valorFrete || 0
      }
    };

    return NextResponse.json({ tipo, ano, mes, entregas: entregasCount, porStatus, porCidade, financeiro, notas });
  }

  // ─── Relatório Anual ───────────────────────────────────────────────────────
  if (tipo === "anual") {
    const meses = Array.from({ length: 12 }, (_, i) => i + 1);
    const dadosMensais = await Promise.all(
      meses.map(async (m: number) => {
        const inicio = new Date(ano, m - 1, 1);
        const fim = new Date(ano, m, 0, 23, 59, 59);
        const [count, aggEntrega, aggRota] = await Promise.all([
          prisma.entrega.count({ where: { dataAgendada: { gte: inicio, lte: fim } } }),
          prisma.entrega.aggregate({
            where: { dataAgendada: { gte: inicio, lte: fim } },
            _sum: { valorFrete: true, pesoTotal: true },
          }),
          (prisma.rota as any).aggregate({
            where: { data: { gte: inicio, lte: fim } },
            _sum: { valorMotorista: true },
          })
        ]);
        return { 
          mes: m, 
          entregas: count, 
          frete: aggEntrega._sum.valorFrete ?? 0, 
          peso: aggEntrega._sum.pesoTotal ?? 0,
          custoMotorista: (aggRota._sum as any)?.valorMotorista ?? 0
        };
      })
    );

    const totalAnual = await prisma.entrega.aggregate({
      where: { dataAgendada: { gte: new Date(ano, 0, 1), lte: new Date(ano, 11, 31, 23, 59, 59) } },
      _sum: { valorFrete: true, pesoTotal: true },
      _count: true,
    });

    return NextResponse.json({ tipo, ano, dadosMensais, totalAnual });
  }

  // ─── Relatório de Motoristas ───────────────────────────────────────────────
  if (tipo === "motoristas") {
    const inicio = new Date(ano, mes - 1, 1);
    const fim = new Date(ano, mes, 0, 23, 59, 59);

    const motoristas = await prisma.motorista.findMany({
      where: { ativo: true },
      include: {
        entregas: {
          where: { dataAgendada: { gte: inicio, lte: fim } },
          select: { status: true, valorFrete: true, pesoTotal: true, rotaId: true, valorMotorista: true, adiantamentoMotorista: true, saldoMotorista: true },
        },
        rotas: {
          where: { data: { gte: inicio, lte: fim } },
          include: {
            entregas: {
              select: { valorFrete: true, status: true },
            },
          },
        },
      },
    });

    const ranking = motoristas
      .map((m: any) => {
        const totalEntregas = m.entregas.length;
        const entregues = m.entregas.filter((e: any) => ["ENTREGUE", "FINALIZADO"].includes(e.status)).length;

        // Receita de frete: soma dos valorFrete das entregas diretas + entregas dentro das rotas
        const freteEntregasDiretas = m.entregas.filter((e: any) => !e.rotaId).reduce((s: number, e: any) => s + (e.valorFrete || 0), 0);
        const freteRotas = m.rotas.reduce((s: number, r: any) => s + (r.entregas || []).reduce((rs: number, re: any) => rs + (re.valorFrete || 0), 0), 0);
        const frete = freteEntregasDiretas + freteRotas;

        // Valor pago ao motorista: valorMotorista das entregas diretas + valorMotorista das rotas
        const valorMotorista =
          m.entregas.filter((e: any) => !e.rotaId).reduce((s: number, e: any) => s + (e.valorMotorista || 0), 0) +
          m.rotas.reduce((s: number, r: any) => s + (r.valorMotorista || 0), 0);

        // Adiantamentos e saldos
        const adiantamento =
          m.entregas.filter((e: any) => !e.rotaId).reduce((s: number, e: any) => s + (e.adiantamentoMotorista || 0), 0) +
          m.rotas.reduce((s: number, r: any) => s + (r.adiantamentoMotorista || 0), 0);

        const saldo =
          m.entregas.filter((e: any) => !e.rotaId).reduce((s: number, e: any) => s + (e.saldoMotorista || 0), 0) +
          m.rotas.reduce((s: number, r: any) => s + (r.saldoMotorista || 0), 0);

        // Peso: entregas diretas + rotas (pesoTotal da rota)
        const peso =
          m.entregas.filter((e: any) => !e.rotaId).reduce((s: number, e: any) => s + (e.pesoTotal || 0), 0) +
          m.rotas.reduce((s: number, r: any) => s + (r.pesoTotal || 0), 0);

        return {
          id: m.id,
          nome: m.nome,
          totalEntregas,
          rotas: m.rotas.length,
          entregues,
          frete,
          valorMotorista,
          adiantamento,
          saldo,
          peso,
          ocorrencias: m.entregas.filter((e: any) => e.status === "OCORRENCIA").length,
        };
      })
      .sort((a: any, b: any) => b.totalEntregas - a.totalEntregas);

    return NextResponse.json({ tipo, ano, mes, ranking });
  }

  return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  const inicio = new Date(2026, 3, 1);
  const fim = new Date(2026, 4, 0, 23, 59, 59);
  const where = {
    OR: [
      { dataAgendada: { gte: inicio, lte: fim } },
      { dataAgendada: null, createdAt: { gte: inicio, lte: fim } },
    ],
  };

  try {
    console.log("Testing queries...");
    const res = await Promise.all([
      prisma.entrega.count({ where }),
      prisma.entrega.groupBy({ by: ["status"], where, _count: true }),
      prisma.entrega.groupBy({ by: ["cidade"], where, _count: true, orderBy: { _count: { cidade: "desc" } }, take: 10 }),
      prisma.entrega.aggregate({
        where,
        _sum: { valorFrete: true, pesoTotal: true, volumeTotal: true },
        _avg: { valorFrete: true },
      }),
      prisma.entrega.aggregate({
        where: { ...where, rotaId: null },
        _sum: { valorDescarga: true, valorMotorista: true, adiantamentoMotorista: true, saldoMotorista: true },
      }),
      prisma.rota.aggregate({
        where: { data: { gte: inicio, lte: fim } },
        _sum: { valorMotorista: true, adiantamentoMotorista: true, saldoMotorista: true },
      }),
      prisma.notaFiscal.count({ where: { createdAt: { gte: inicio, lte: fim } } }),
      prisma.entrega.aggregate({ where, _sum: { volumeTotal: true } }),
    ]);
    console.log("Queries successful:", res);
  } catch (e) {
    console.error("Error in queries:", e);
  } finally {
    await prisma.$disconnect();
  }
}

test();

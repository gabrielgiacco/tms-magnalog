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
    const t0 = Date.now();
    await prisma.entrega.count({ where });
    console.log("Q1 count:", Date.now() - t0);

    const t1 = Date.now();
    await prisma.entrega.groupBy({ by: ["status"], where, _count: true });
    console.log("Q2 groupBy status:", Date.now() - t1);

    const t2 = Date.now();
    await prisma.entrega.groupBy({ by: ["cidade"], where, _count: true, orderBy: { _count: { cidade: "desc" } }, take: 10 });
    console.log("Q3 groupBy cidade:", Date.now() - t2);

    const t3 = Date.now();
    await prisma.entrega.aggregate({ where, _sum: { valorFrete: true, pesoTotal: true, volumeTotal: true }, _avg: { valorFrete: true } });
    console.log("Q4 aggregate:", Date.now() - t3);

    const t4 = Date.now();
    await prisma.entrega.aggregate({ where: { ...where, rotaId: null }, _sum: { valorDescarga: true, valorMotorista: true, adiantamentoMotorista: true, saldoMotorista: true } });
    console.log("Q5 aggregate (rotaId=null):", Date.now() - t4);

    const t5 = Date.now();
    await prisma.rota.aggregate({ where: { data: { gte: inicio, lte: fim } }, _sum: { valorMotorista: true, adiantamentoMotorista: true, saldoMotorista: true } });
    console.log("Q6 rota aggregate:", Date.now() - t5);

    const t6 = Date.now();
    await prisma.notaFiscal.count({ where: { createdAt: { gte: inicio, lte: fim } } });
    console.log("Q7 count notas:", Date.now() - t6);

    const t7 = Date.now();
    await prisma.entrega.aggregate({ where, _sum: { volumeTotal: true } });
    console.log("Q8 aggregate volumes:", Date.now() - t7);

    console.log("Total time:", Date.now() - t0);
  } catch (e) {
    console.error("Error in queries:", e);
  } finally {
    await prisma.$disconnect();
  }
}

test();

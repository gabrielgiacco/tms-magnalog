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
    console.log("Testing motoristas query...");
    const motoristas = await prisma.motorista.findMany({
      where: { ativo: true },
      include: {
        entregas: {
          where,
          select: { status: true, valorFrete: true, pesoTotal: true, rotaId: true, valorMotorista: true, adiantamentoMotorista: true, saldoMotorista: true },
        },
        rotas: {
          where: { data: { gte: inicio, lte: fim } },
          include: {
            entregas: { select: { valorFrete: true, status: true } },
          },
        },
      },
    });
    console.log("Motoristas found:", motoristas.length);
  } catch (e) {
    console.error("Error in queries:", e);
  } finally {
    await prisma.$disconnect();
  }
}

test();

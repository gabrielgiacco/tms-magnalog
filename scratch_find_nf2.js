const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.entrega.findFirst({
    where: {
      notas: {
        some: {
          numero: { in: ['2089883', '267327'] }
        }
      }
    },
    select: {
      id: true,
      valorMotorista: true,
      valorSaida: true,
      status: true,
      rotaId: true
    }
  });
  console.dir(result, { depth: null });
}

main().catch(console.error).finally(() => prisma.$disconnect());

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.entrega.update({
    where: { id: 'cmn9ah6k5000hjij2ovhh2tu7' },
    data: {
      rotaId: null,
      motoristaId: null,
      veiculoId: null,
    }
  });
  console.log("Delivery detached successfully!");
}

main().catch(console.error).finally(() => prisma.$disconnect());

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.rota.findUnique({
    where: {
      id: 'cmnd9pcvo000114n87vu1g8jq'
    },
    include: {
      entregas: {
        select: {
          id: true,
          status: true,
          ocorrencias: true
        }
      }
    }
  });
  console.dir(result, { depth: null });
}

main().catch(console.error).finally(() => prisma.$disconnect());

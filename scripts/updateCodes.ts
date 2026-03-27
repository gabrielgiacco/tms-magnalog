import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Iniciando migração de códigos de Entrega para NF...')
  
  const entregas = await prisma.entrega.findMany({
    include: {
      notas: true
    }
  })

  let updated = 0;

  for (const entrega of entregas) {
    if (entrega.codigo.startsWith('MAG-')) {
      const nfString = entrega.notas && entrega.notas.length > 0 
        ? entrega.notas.map(n => n.numero).join(' / ') 
        : `SEM-NF-${entrega.id.substring(0,4)}`;
        
      await prisma.entrega.update({
        where: { id: entrega.id },
        data: { codigo: nfString }
      })
      
      console.log(`Entrega atualizada: ${entrega.codigo} -> ${nfString}`)
      updated++;
    }
  }

  console.log(`Migração concluída. ${updated} entregas atualizadas.`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

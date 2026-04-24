const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const MS_PER_DAY = 1000 * 60 * 60 * 24;

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
    console.log("Testing remaining queries...");
    
    let armazenagemTotal = 0;
    try {
      const tabelas = await prisma.tabelaArmazenagem.findMany();
      if (tabelas.length > 0) {
        const cnpjs = tabelas.map((t) => t.cnpjCliente);
        const entregasArm = await prisma.entrega.findMany({
          where: { ...where, quantidadePaletes: { gt: 0 }, notas: { some: { emitenteCnpj: { in: cnpjs } } } },
          select: { id: true, quantidadePaletes: true, dataChegada: true, dataEntrega: true, createdAt: true, notas: { select: { emitenteCnpj: true } } },
        });
        const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
        for (const e of entregasArm) {
          const entrada = e.dataChegada || e.createdAt;
          const saida = e.dataEntrega || hoje;
          const dE = new Date(entrada); dE.setHours(0, 0, 0, 0);
          const dS = new Date(saida); dS.setHours(0, 0, 0, 0);
          const dias = Math.max(0, Math.floor((dS.getTime() - dE.getTime()) / MS_PER_DAY));
          const emitentes = Array.from(new Set((e.notas || []).map((n) => n.emitenteCnpj).filter(Boolean)));
          for (const cnpj of emitentes) {
            const tab = tabelas.find((t) => t.cnpjCliente === cnpj);
            if (!tab) continue;
            const cobraveis = Math.max(0, dias - (tab.diasFree || 0));
            armazenagemTotal += cobraveis * (tab.valorPaleteDia || 0) * (e.quantidadePaletes || 0);
          }
        }
      }
    } catch (e) { console.error("Arm erro", e); }

    let armazenagemFaturada = 0;
    try {
      const fatArm = await prisma.faturaArmazenagem.findMany({
        where: { dataEmissao: { gte: inicio, lte: fim }, status: { not: "CANCELADA" } },
        select: { valorTotal: true },
      });
      armazenagemFaturada = fatArm.reduce((s, f) => s + f.valorTotal, 0);
    } catch (e) { console.error("Fat erro", e); }
    
    console.log("Remaining queries successful.");
  } catch (e) {
    console.error("Error in remaining queries:", e);
  } finally {
    await prisma.$disconnect();
  }
}

test();

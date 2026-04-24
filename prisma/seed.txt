import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed...");

  // ─── Usuários ───────────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash("admin123", 10);
  const opHash = await bcrypt.hash("op123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@magnalog.com.br" },
    update: {},
    create: { email: "admin@magnalog.com.br", name: "Administrador", password: adminHash, role: "ADMIN", aprovado: true, ativo: true },
  });

  await prisma.user.upsert({
    where: { email: "operacional@magnalog.com.br" },
    update: {},
    create: { email: "operacional@magnalog.com.br", name: "Operacional", password: opHash, role: "OPERACIONAL", aprovado: true, ativo: true },
  });

  await prisma.user.upsert({
    where: { email: "financeiro@magnalog.com.br" },
    update: {},
    create: { email: "financeiro@magnalog.com.br", name: "Financeiro", password: opHash, role: "FINANCEIRO", aprovado: true, ativo: true },
  });

  // ─── Motoristas ─────────────────────────────────────────────────────────────
  const motoristas = await Promise.all([
    prisma.motorista.upsert({ where: { cpf: "111.111.111-11" }, update: {}, create: { nome: "Carlos Mendes", cpf: "111.111.111-11", cnh: "12345678901", categoriaCnh: "E", telefone: "(11) 99001-0001", ativo: true } }),
    prisma.motorista.upsert({ where: { cpf: "222.222.222-22" }, update: {}, create: { nome: "Roberto Silva", cpf: "222.222.222-22", cnh: "23456789012", categoriaCnh: "E", telefone: "(11) 99001-0002", ativo: true } }),
    prisma.motorista.upsert({ where: { cpf: "333.333.333-33" }, update: {}, create: { nome: "Ana Rodrigues", cpf: "333.333.333-33", cnh: "34567890123", categoriaCnh: "D", telefone: "(11) 99001-0003", ativo: true } }),
    prisma.motorista.upsert({ where: { cpf: "444.444.444-44" }, update: {}, create: { nome: "Paulo Costa", cpf: "444.444.444-44", cnh: "45678901234", categoriaCnh: "E", telefone: "(11) 99001-0004", ativo: true } }),
    prisma.motorista.upsert({ where: { cpf: "555.555.555-55" }, update: {}, create: { nome: "Juliana Ferreira", cpf: "555.555.555-55", cnh: "56789012345", categoriaCnh: "E", telefone: "(11) 99001-0005", ativo: true } }),
  ]);

  // ─── Veículos ───────────────────────────────────────────────────────────────
  const veiculos = await Promise.all([
    prisma.veiculo.upsert({ where: { placa: "ABC1D23" }, update: {}, create: { placa: "ABC1D23", tipo: "TRUCK", modelo: "VW Constellation 24.280", ano: 2021, capacidadeKg: 14000 } }),
    prisma.veiculo.upsert({ where: { placa: "DEF2E45" }, update: {}, create: { placa: "DEF2E45", tipo: "CARRETA", modelo: "Scania R 450", ano: 2022, capacidadeKg: 28000 } }),
    prisma.veiculo.upsert({ where: { placa: "GHI3F67" }, update: {}, create: { placa: "GHI3F67", tipo: "VUC", modelo: "VW Delivery 9.170", ano: 2023, capacidadeKg: 5000 } }),
    prisma.veiculo.upsert({ where: { placa: "JKL4G89" }, update: {}, create: { placa: "JKL4G89", tipo: "TOCO", modelo: "Mercedes-Benz Atego 1719", ano: 2020, capacidadeKg: 8000 } }),
  ]);

  // ─── Clientes ───────────────────────────────────────────────────────────────
  const clientes = await Promise.all([
    prisma.cliente.upsert({ where: { cnpj: "12345678000100" }, update: {}, create: { cnpj: "12345678000100", razaoSocial: "Mercado Central LTDA", email: "compras@mercadocentral.com.br" } }),
    prisma.cliente.upsert({ where: { cnpj: "23456789000100" }, update: {}, create: { cnpj: "23456789000100", razaoSocial: "Indústria Têxtil Alfa S.A.", email: "logistica@textilalfa.com.br" } }),
    prisma.cliente.upsert({ where: { cnpj: "34567890000100" }, update: {}, create: { cnpj: "34567890000100", razaoSocial: "Farmácia Saúde+ EIRELI", email: "estoque@farmaciasaude.com.br" } }),
    prisma.cliente.upsert({ where: { cnpj: "45678901000100" }, update: {}, create: { cnpj: "45678901000100", razaoSocial: "TechStore Brasil Comércio LTDA", email: "recebimento@techstore.com.br" } }),
    prisma.cliente.upsert({ where: { cnpj: "56789012000100" }, update: {}, create: { cnpj: "56789012000100", razaoSocial: "Distribuidora Norte LTDA", email: "logistica@distrNorte.com.br" } }),
  ]);

  // ─── Entregas de Exemplo ────────────────────────────────────────────────────
  const hoje = new Date();
  const ontem = new Date(hoje); ontem.setDate(hoje.getDate() - 1);
  const amanha = new Date(hoje); amanha.setDate(hoje.getDate() + 1);

  const entregasData = [
    { codigo:"ENT-00001", clienteId:clientes[0].id, cnpj:"12345678000100", razaoSocial:"Mercado Central LTDA", cidade:"Campinas", uf:"SP", endereco:"Rua das Flores, 100", status:"EM_ROTA", motoristaId:motoristas[0].id, veiculoId:veiculos[0].id, pesoTotal:2400, volumeTotal:18, valorFrete:1850, adiantamento:500, saldoPendente:1350, dataChegada:ontem, dataAgendada:hoje },
    { codigo:"ENT-00002", clienteId:clientes[1].id, cnpj:"23456789000100", razaoSocial:"Indústria Têxtil Alfa S.A.", cidade:"Ribeirão Preto", uf:"SP", endereco:"Av. Industrial, 500", status:"CARREGADO", motoristaId:motoristas[1].id, veiculoId:veiculos[1].id, pesoTotal:18000, volumeTotal:42, valorFrete:4200, adiantamento:1000, saldoPendente:3200, dataChegada:hoje, dataAgendada:amanha },
    { codigo:"ENT-00003", clienteId:clientes[2].id, cnpj:"34567890000100", razaoSocial:"Farmácia Saúde+ EIRELI", cidade:"Santos", uf:"SP", endereco:"Rua da Saúde, 22", status:"PROGRAMADO", pesoTotal:450, volumeTotal:8, valorFrete:780, adiantamento:0, saldoPendente:780, dataChegada:hoje, dataAgendada:amanha },
    { codigo:"ENT-00004", clienteId:clientes[3].id, cnpj:"45678901000100", razaoSocial:"TechStore Brasil Comércio LTDA", cidade:"Rio de Janeiro", uf:"RJ", endereco:"Av. Atlântica, 1000", status:"EM_SEPARACAO", motoristaId:motoristas[2].id, veiculoId:veiculos[2].id, pesoTotal:5200, volumeTotal:156, valorFrete:6800, adiantamento:2000, saldoPendente:4800, dataChegada:ontem, dataAgendada:hoje },
    { codigo:"ENT-00005", clienteId:clientes[4].id, cnpj:"56789012000100", razaoSocial:"Distribuidora Norte LTDA", cidade:"São José dos Campos", uf:"SP", endereco:"Rod. Presidente Dutra, km 154", status:"ENTREGUE", motoristaId:motoristas[3].id, veiculoId:veiculos[3].id, pesoTotal:3100, volumeTotal:25, valorFrete:1200, adiantamento:1200, saldoPendente:0, dataChegada:ontem, dataAgendada:ontem, dataEntrega:hoje },
    { codigo:"ENT-00006", clienteId:clientes[0].id, cnpj:"12345678000100", razaoSocial:"Mercado Central LTDA", cidade:"Sorocaba", uf:"SP", endereco:"Av. Ipanema, 300", status:"OCORRENCIA", motoristaId:motoristas[4].id, veiculoId:veiculos[0].id, pesoTotal:5800, volumeTotal:67, valorFrete:2300, adiantamento:500, saldoPendente:1800, dataChegada:ontem, dataAgendada:ontem },
  ];

  for (const data of entregasData) {
    await prisma.entrega.upsert({ where: { codigo: data.codigo }, update: {}, create: data as any });
  }

  // ─── Rota de Exemplo ────────────────────────────────────────────────────────
  const rot = await prisma.rota.upsert({
    where: { codigo: "RTA-0001" },
    update: {},
    create: { codigo:"RTA-0001", data:hoje, motoristaId:motoristas[0].id, veiculoId:veiculos[0].id, pesoTotal:20400, volumeTotal:60, status:"EM_ANDAMENTO" },
  });

  // Associar algumas entregas à rota
  await prisma.entrega.updateMany({
    where: { codigo: { in: ["ENT-00001","ENT-00002"] } },
    data: { rotaId: rot.id },
  });

  // ─── Notas de Exemplo ────────────────────────────────────────────────────────
  const entrega1 = await prisma.entrega.findUnique({ where: { codigo: "ENT-00001" } });
  if (entrega1) {
    const chaves = [
      "35240312345678000100550010000000011000000014",
      "35240312345678000100550010000000021000000021",
    ];
    for (let i = 0; i < chaves.length; i++) {
      await prisma.notaFiscal.upsert({
        where: { chaveAcesso: chaves[i] },
        update: {},
        create: {
          chaveAcesso: chaves[i],
          numero: String(1000 + i),
          serie: "1",
          emitenteCnpj: "98765432000100",
          emitenteRazao: "Fornecedor Modelo S.A.",
          destinatarioCnpj: "12345678000100",
          destinatarioRazao: "Mercado Central LTDA",
          cidade: "Campinas",
          uf: "SP",
          volumes: 9,
          pesoBruto: 1200,
          valorNota: 8500,
          dataEmissao: ontem,
          entregaId: entrega1.id,
        },
      });
    }
  }

  // ─── Ocorrência de Exemplo ───────────────────────────────────────────────────
  const entrega6 = await prisma.entrega.findUnique({ where: { codigo: "ENT-00006" } });
  if (entrega6) {
    const ocCount = await prisma.ocorrencia.count({ where: { entregaId: entrega6.id } });
    if (ocCount === 0) {
      await prisma.ocorrencia.create({
        data: { entregaId: entrega6.id, tipo: "CLIENTE_AUSENTE", descricao: "Cliente não estava presente no endereço de entrega. Tentativa às 14h30." },
      });
    }
  }

  console.log("\n✅ Seed concluído!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("👤 Admin:        admin@magnalog.com.br / admin123");
  console.log("👤 Operacional:  operacional@magnalog.com.br / op123");
  console.log("👤 Financeiro:   financeiro@magnalog.com.br / op123");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());

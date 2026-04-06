import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const entrega = await prisma.entrega.findUnique({
    where: { id: params.id },
    include: {
      motorista: true,
      veiculo: true,
      rota: true,
      notas: { orderBy: { createdAt: "asc" } },
      ocorrencias: { orderBy: { createdAt: "desc" } },
      cliente: true,
    },
  });

  if (!entrega) return NextResponse.json({ error: "Não encontrada" }, { status: 404 });
  return NextResponse.json(entrega);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json();

  // Recalcular saldo pendente automaticamente
  const valorFrete = body.valorFrete ?? undefined;
  const adiantamento = body.adiantamento ?? undefined;

  const data: any = { ...body };

  // Transformar strings vazias (UI blank fields) em nulos para o Prisma
  Object.keys(data).forEach((key) => {
    if (data[key] === "") {
      data[key] = null;
    }
  });

  if (data.dataChegada) data.dataChegada = new Date(data.dataChegada);
  if (data.dataAgendada) data.dataAgendada = new Date(data.dataAgendada);
  if (data.dataEntrega) data.dataEntrega = new Date(data.dataEntrega);
  if (data.dataPagamento) data.dataPagamento = new Date(data.dataPagamento);

  // Calcular saldo automaticamente se frete ou adiantamento mudou
  if (valorFrete !== undefined || adiantamento !== undefined) {
    const current = await prisma.entrega.findUnique({ where: { id: params.id } });
    const frete = valorFrete ?? current?.valorFrete ?? 0;
    const adt = adiantamento ?? current?.adiantamento ?? 0;
    data.saldoPendente = frete - adt;
  }

  // Calcular armazenagem automaticamente com base na tabela do cliente
  {
    const current = await prisma.entrega.findUnique({ where: { id: params.id } });
    if (current) {
      const chegada = data.dataChegada || current.dataChegada;
      const entregaDate = data.dataEntrega || current.dataEntrega;
      const paletes = data.quantidadePaletes ?? current.quantidadePaletes ?? 0;

      if (chegada && entregaDate && paletes > 0) {
        const dias = Math.max(0, Math.floor((new Date(entregaDate).getTime() - new Date(chegada).getTime()) / (1000 * 60 * 60 * 24)));
        data.diasArmazenagem = dias;

        // Buscar tabela de armazenagem do cliente
        const tabela = await prisma.tabelaArmazenagem.findUnique({ where: { cnpjCliente: current.cnpj } });
        if (tabela) {
          const diasCobrados = Math.max(0, dias - tabela.diasFree);
          data.valorArmazenagem = diasCobrados * paletes * tabela.valorPaleteDia;
        }
      } else if (chegada && entregaDate) {
        data.diasArmazenagem = Math.max(0, Math.floor((new Date(entregaDate).getTime() - new Date(chegada).getTime()) / (1000 * 60 * 60 * 24)));
      }
    }
  }

  // Remove relational fields that can't be set directly
  delete data.notas;
  delete data.motorista;
  delete data.veiculo;
  delete data.rota;
  delete data.cliente;
  delete data.ocorrencias;
  delete data._count;
  delete data.id;
  delete data.codigo;
  delete data.createdAt;

  const entrega = await prisma.entrega.update({
    where: { id: params.id },
    data,
    include: {
      motorista: true,
      veiculo: true,
      rota: true,
      notas: true,
      ocorrencias: true,
    },
  });

  return NextResponse.json(entrega);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  if (body.action !== "separar" || !Array.isArray(body.notaIds) || body.notaIds.length === 0) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const entregaOrigem = await prisma.entrega.findUnique({
    where: { id: params.id },
    include: { notas: true },
  });
  if (!entregaOrigem) return NextResponse.json({ error: "Entrega não encontrada" }, { status: 404 });

  const notasParaSeparar = entregaOrigem.notas.filter((n) => body.notaIds.includes(n.id));
  if (notasParaSeparar.length === 0) return NextResponse.json({ error: "Nenhuma nota válida selecionada" }, { status: 400 });
  if (notasParaSeparar.length === entregaOrigem.notas.length) return NextResponse.json({ error: "Não é possível separar todas as notas. Mova pelo menos uma." }, { status: 400 });

  // Calcular totais da nova entrega
  const pesoTotal = notasParaSeparar.reduce((s, n) => s + n.pesoBruto, 0);
  const volumeTotal = notasParaSeparar.reduce((s, n) => s + n.volumes, 0);

  // Gerar código para nova entrega
  const count = await prisma.entrega.count();
  const codigo = notasParaSeparar.map((n) => n.numero).join(" / ");

  // Criar nova entrega com dados do mesmo destinatário
  const novaEntrega = await prisma.entrega.create({
    data: {
      codigo,
      cnpj: entregaOrigem.cnpj,
      razaoSocial: entregaOrigem.razaoSocial,
      cidade: entregaOrigem.cidade,
      uf: entregaOrigem.uf,
      endereco: entregaOrigem.endereco,
      bairro: entregaOrigem.bairro,
      cep: entregaOrigem.cep,
      pesoTotal,
      volumeTotal,
      status: entregaOrigem.status,
    },
  });

  // Mover notas para nova entrega
  await prisma.notaFiscal.updateMany({
    where: { id: { in: body.notaIds } },
    data: { entregaId: novaEntrega.id },
  });

  // Recalcular totais da entrega original
  const notasRestantes = entregaOrigem.notas.filter((n) => !body.notaIds.includes(n.id));
  const novoCodigo = notasRestantes.map((n) => n.numero).join(" / ");
  await prisma.entrega.update({
    where: { id: params.id },
    data: {
      codigo: novoCodigo || entregaOrigem.codigo,
      pesoTotal: notasRestantes.reduce((s, n) => s + n.pesoBruto, 0),
      volumeTotal: notasRestantes.reduce((s, n) => s + n.volumes, 0),
    },
  });

  return NextResponse.json({ novaEntregaId: novaEntrega.id, notasSeparadas: notasParaSeparar.length }, { status: 201 });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const user = (session.user as any);
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  // Deletar registros relacionados antes de deletar a entrega
  await prisma.notaFiscal.deleteMany({ where: { entregaId: params.id } });

  await prisma.entrega.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

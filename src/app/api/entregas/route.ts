import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;
    const status = searchParams.get("status");
    const cliente = searchParams.get("cliente");
    const cidade = searchParams.get("cidade");
    const rotaId = searchParams.get("rotaId");
    const mostrarFinalizados = searchParams.get("mostrarFinalizados") === "true";
    const dataInicio = searchParams.get("dataInicio");
    const dataFim = searchParams.get("dataFim");
    const apenasAgendadas = searchParams.get("apenasAgendadas") === "true";
    const clienteNome = searchParams.get("clienteNome");
    const fornecedor = searchParams.get("fornecedor");
    const volume = searchParams.get("volume");
    const sortBy = searchParams.get("sortBy");
    const sortOrder = searchParams.get("sortOrder") as "asc" | "desc" | null;

    const where: any = {};

    // Ocultar finalizados por padrão
    if (!mostrarFinalizados) {
      where.status = { notIn: ["FINALIZADO"] };
    }
    if (status) where.status = status;
    if (cliente) {
      const orConditions: any[] = [
        { razaoSocial: { contains: cliente, mode: "insensitive" } },
        { cidade: { contains: cliente, mode: "insensitive" } },
        { codigo: { contains: cliente, mode: "insensitive" } },
        { notas: { some: { numero: { contains: cliente } } } },
        { notas: { some: { emitenteRazao: { contains: cliente, mode: "insensitive" } } } },
        { notas: { some: { chaveAcesso: { contains: cliente } } } },
      ];
      const digits = cliente.replace(/\D/g, "");
      if (digits.length > 0) orConditions.push({ cnpj: { contains: digits } });
      where.OR = orConditions;
    }
    if (clienteNome) {
      where.razaoSocial = { contains: clienteNome, mode: "insensitive" };
    }
    if (cidade) where.cidade = { contains: cidade, mode: "insensitive" };
    if (rotaId) where.rotaId = rotaId;
    
    if (apenasAgendadas) {
      where.dataAgendada = { not: null };
    }

    if (fornecedor) {
      where.notas = { some: { emitenteRazao: { contains: fornecedor, mode: "insensitive" } } };
    }
    
    if (volume) {
      where.volumeTotal = parseInt(volume);
    }

    if (dataInicio || dataFim) {
      // Se a busca é por agendadas, filtrar pela dataAgendada; senão, pela createdAt
      const dateField = apenasAgendadas ? "dataAgendada" : "createdAt";
      where[dateField] = { ...(where[dateField] || {}) };
      if (dataInicio) where[dateField].gte = new Date(dataInicio);
      if (dataFim) {
        const d = new Date(dataFim);
        d.setHours(23, 59, 59, 999);
        where[dateField].lte = d;
      }
    }

    // Ordenação dinâmica: suporta colunas diretas e relações (motorista.nome)
    const SORT_MAP: Record<string, any> = {
      codigo: { codigo: sortOrder },
      razaoSocial: { razaoSocial: sortOrder },
      cidade: { cidade: sortOrder },
      volumeTotal: { volumeTotal: sortOrder },
      pesoTotal: { pesoTotal: sortOrder },
      motorista: { motorista: { nome: sortOrder } },
      dataAgendada: { dataAgendada: sortOrder },
      status: { status: sortOrder },
      valorFrete: { valorFrete: sortOrder },
    };
    const orderBy = (sortBy && sortOrder && SORT_MAP[sortBy]) ? SORT_MAP[sortBy] : { createdAt: "desc" as const };

    const [entregas, total] = await Promise.all([
      prisma.entrega.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          motorista: { select: { id: true, nome: true } },
          veiculo: { select: { id: true, placa: true, tipo: true } },
          rota: { select: { id: true, codigo: true } },
          notas: { select: { id: true, numero: true, chaveAcesso: true, valorNota: true, volumes: true, pesoBruto: true, emitenteRazao: true } },
          _count: { select: { notas: true, ocorrencias: true } },
        },
      }),
      prisma.entrega.count({ where }),
    ]);

    return NextResponse.json({ entregas, total, pages: Math.ceil(total / limit) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const body = await req.json();
    const count = await prisma.entrega.count();
    const codigo = `SEM-NF-${String(count + 1).padStart(3, '0')}`;

    // Upsert cliente
    if (body.cnpj) {
      await prisma.cliente.upsert({
        where: { cnpj: body.cnpj },
        update: { razaoSocial: body.razaoSocial },
        create: { cnpj: body.cnpj, razaoSocial: body.razaoSocial },
      });
    }

    const entrega = await prisma.entrega.create({
      data: {
        codigo,
        cnpj: body.cnpj,
        razaoSocial: body.razaoSocial,
        cidade: body.cidade,
        uf: body.uf,
        endereco: body.endereco,
        bairro: body.bairro,
        cep: body.cep,
        dataChegada: body.dataChegada ? new Date(body.dataChegada) : null,
        dataAgendada: body.dataAgendada ? new Date(body.dataAgendada) : null,
        motoristaId: body.motoristaId || null,
        veiculoId: body.veiculoId || null,
        rotaId: body.rotaId || null,
        pesoTotal: body.pesoTotal || 0,
        volumeTotal: body.volumeTotal || 0,
        status: body.status || "PROGRAMADO",
        observacoes: body.observacoes,
        valorFrete: body.valorFrete || 0,
        valorDescarga: body.valorDescarga || 0,
        valorArmazenagem: body.valorArmazenagem || 0,
        adiantamento: body.adiantamento || 0,
        saldoPendente: (body.valorFrete || 0) - (body.adiantamento || 0),
      },
      include: {
        motorista: true,
        veiculo: true,
        notas: true,
      },
    });

    return NextResponse.json(entrega, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

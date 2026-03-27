import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json();

  if (!body.descricao) {
    return NextResponse.json({ error: "Descrição é obrigatória" }, { status: 400 });
  }

  const ocorrencia = await prisma.ocorrencia.create({
    data: {
      entregaId: params.id,
      tipo: body.tipo || "OUTROS",
      descricao: body.descricao,
      resolucao: body.resolucao || null,
    },
  });

  return NextResponse.json(ocorrencia, { status: 201 });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json();

  const ocorrencia = await prisma.ocorrencia.update({
    where: { id: body.ocorrenciaId },
    data: {
      resolucao: body.resolucao,
      resolvida: true,
    },
  });

  return NextResponse.json(ocorrencia);
}

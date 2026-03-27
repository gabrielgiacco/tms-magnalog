import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const skip = (page - 1) * limit;
  const q = searchParams.get("q");
  const entregaId = searchParams.get("entregaId");
  const semEntrega = searchParams.get("semEntrega") === "true";
  const emitenteCnpj = searchParams.get("emitenteCnpj");

  const where: any = {};
  if (q) {
    where.OR = [
      { numero: { contains: q } },
      { emitenteRazao: { contains: q, mode: "insensitive" } },
      { destinatarioRazao: { contains: q, mode: "insensitive" } },
      { chaveAcesso: { contains: q } },
    ];
  }
  if (entregaId) where.entregaId = entregaId;
  if (semEntrega) where.entregaId = null;
  if (emitenteCnpj) where.emitenteCnpj = emitenteCnpj;

  const [notas, total] = await Promise.all([
    prisma.notaFiscal.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        entrega: {
          select: { id: true, codigo: true, status: true, razaoSocial: true, cidade: true },
        },
      },
    }),
    prisma.notaFiscal.count({ where }),
  ]);

  return NextResponse.json({ notas, total, pages: Math.ceil(total / limit) });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  const { id, entregaId } = body;

  const nota = await prisma.notaFiscal.update({
    where: { id },
    data: { entregaId: entregaId || null },
  });

  // If associating with an entrega, update entrega totals
  if (entregaId) {
    const notasEntrega = await prisma.notaFiscal.findMany({
      where: { entregaId },
      select: { pesoBruto: true, volumes: true },
    });
    await prisma.entrega.update({
      where: { id: entregaId },
      data: {
        pesoTotal: notasEntrega.reduce((s: number, n: any) => s + n.pesoBruto, 0),
        volumeTotal: notasEntrega.reduce((s: number, n: any) => s + n.volumes, 0),
      },
    });
  }

  return NextResponse.json(nota);
}

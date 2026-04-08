import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// Simple event log for status changes — can be extended for webhooks/emails
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  const { entregaId, statusAnterior, statusNovo, observacao } = body;

  if (!entregaId || !statusNovo) {
    return NextResponse.json({ error: "entregaId e statusNovo obrigatórios" }, { status: 400 });
  }

  // Update entrega status
  const data: any = { status: statusNovo };
  if (statusNovo === "ENTREGUE" || statusNovo === "FINALIZADO") data.dataEntrega = new Date();
  if (statusNovo === "FINALIZADO") data.statusCanhoto = "RECEBIDO";

  const entrega = await prisma.entrega.update({
    where: { id: entregaId },
    data,
    include: { cliente: true, motorista: { select: { nome: true } } },
  });

  // Here you could send email/WhatsApp notifications
  // Example: await sendWhatsApp(entrega.cliente?.telefone, `Entrega ${entrega.codigo} - ${statusNovo}`)
  // Example: await sendEmail(entrega.cliente?.email, statusNovo, entrega)

  return NextResponse.json({
    ok: true,
    entrega: { id: entrega.id, codigo: entrega.codigo, status: entrega.status },
  });
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  // Return recent status changes from ocorrencias as event log
  const eventos = await prisma.ocorrencia.findMany({
    take: 50,
    orderBy: { createdAt: "desc" },
    include: {
      entrega: { select: { codigo: true, razaoSocial: true, status: true } },
    },
  });

  return NextResponse.json(eventos);
}

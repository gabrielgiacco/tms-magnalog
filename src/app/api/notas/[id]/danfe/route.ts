import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const nota = await prisma.notaFiscal.findUnique({
      where: { id: params.id },
      select: { xmlOriginal: true },
    });

    if (!nota || !nota.xmlOriginal) {
      return NextResponse.json({ error: "XML não disponível para esta nota fiscal" }, { status: 404 });
    }

    return NextResponse.json({ xml: nota.xmlOriginal });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");

  const clientes = await prisma.cliente.findMany({
    where: q
      ? {
          OR: [
            { razaoSocial: { contains: q, mode: "insensitive" } },
            { cnpj: { contains: q.replace(/\D/g, "") } },
          ],
        }
      : {},
    orderBy: { razaoSocial: "asc" },
    take: 50,
    include: { _count: { select: { entregas: true } } },
  });

  return NextResponse.json(clientes);
}

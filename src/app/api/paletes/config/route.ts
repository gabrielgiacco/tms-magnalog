import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const config = await prisma.paleteConfig.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });
  return NextResponse.json(config);
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const user = session.user as any;
  if (!["ADMIN", "FINANCEIRO"].includes(user.role)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await req.json();

  const config = await prisma.paleteConfig.upsert({
    where: { id: "default" },
    update: {
      cnpjPool: String(body.cnpjPool || "").replace(/\D/g, ""),
      razaoPool: body.razaoPool || "",
      glnPool: body.glnPool || "",
      tipoPallet: body.tipoPallet || "CHEP",
    },
    create: {
      id: "default",
      cnpjPool: String(body.cnpjPool || "").replace(/\D/g, ""),
      razaoPool: body.razaoPool || "",
      glnPool: body.glnPool || "",
      tipoPallet: body.tipoPallet || "CHEP",
    },
  });

  return NextResponse.json(config);
}

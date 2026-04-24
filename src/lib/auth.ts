import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { NextResponse } from "next/server";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "FINANCEIRO" | "OPERACIONAL" | "CLIENTE";
  aprovado: boolean;
};

export async function requireAuth(
  allowedRoles?: SessionUser["role"][]
): Promise<{ user: SessionUser } | NextResponse> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const user = session.user as SessionUser;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return NextResponse.json(
      { error: "Acesso negado para seu perfil" },
      { status: 403 }
    );
  }

  return { user };
}

export function isNextResponse(val: unknown): val is NextResponse {
  return val instanceof NextResponse;
}

import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, ADMIN_SESSION_VALUE, isValidAdminCredentials } from "@/lib/admin-auth";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { username?: string; password?: string } | null;

  if (!body?.username || !body?.password) {
    return NextResponse.json({ error: "Credenciais inválidas" }, { status: 400 });
  }

  if (!isValidAdminCredentials(body.username, body.password)) {
    return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, ADMIN_SESSION_VALUE, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 8,
  });

  return response;
}

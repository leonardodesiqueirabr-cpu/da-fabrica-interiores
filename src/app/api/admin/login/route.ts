import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  createAdminSessionToken,
  isValidAdminCredentials,
} from "@/lib/admin-auth";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { username?: string; password?: string } | null;

  if (!body?.username || !body?.password) {
    return NextResponse.json({ error: "Credenciais inválidas" }, { status: 400 });
  }

  if (!(await isValidAdminCredentials(body.username, body.password))) {
    return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
  }

  const token = await createAdminSessionToken();
  if (!token) {
    console.error("[admin/login] ADMIN_SESSION_SECRET em falta ou com menos de 32 caracteres.");
    return NextResponse.json({ error: "Login indisponível: sessão do administrador não configurada." }, { status: 500 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
  });

  return response;
}

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, isValidAdminSession } from "@/lib/admin-auth";

/** true quando o pedido atual tem uma sessão de administrador assinada e válida. */
export async function hasAdminSession(): Promise<boolean> {
  const cookieStore = await cookies();
  return isValidAdminSession(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
}

/**
 * Valida a sessão de admin para uso em API routes.
 * Retorna uma resposta 401 pronta a devolver quando não houver sessão válida,
 * ou `null` quando o pedido está autenticado.
 */
export async function requireAdminSession(): Promise<NextResponse | null> {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  return null;
}

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, isAdminSessionValue } from "@/lib/admin-auth";

/**
 * Valida a sessão de admin (cookie httpOnly) para uso em API routes.
 * Retorna uma resposta 401 pronta para ser retornada quando não houver
 * sessão válida, ou `null` quando o pedido está autenticado.
 */
export async function requireAdminSession(): Promise<NextResponse | null> {
  const cookieStore = await cookies();
  if (!isAdminSessionValue(cookieStore.get(ADMIN_SESSION_COOKIE)?.value)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  return null;
}

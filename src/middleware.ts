import { type NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, isValidAdminSession } from "@/lib/admin-auth";

// Rotas de API acessíveis sem sessão (o próprio login e o logout).
const PUBLIC_ADMIN_API = new Set(["/api/admin/login", "/api/admin/logout"]);

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const rawSession = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const isAuthenticated = await isValidAdminSession(rawSession);

  // Cookie presente mas inválida (antiga, falsificada ou expirada): é apagada.
  const withStaleCookieCleared = (response: NextResponse) => {
    if (rawSession && !isAuthenticated) response.cookies.delete(ADMIN_SESSION_COOKIE);
    return response;
  };

  if (pathname.startsWith("/api/admin")) {
    if (PUBLIC_ADMIN_API.has(pathname) || isAuthenticated) return NextResponse.next({ request });
    return withStaleCookieCleared(NextResponse.json({ error: "Não autorizado" }, { status: 401 }));
  }

  if (pathname === "/admin/login") {
    if (isAuthenticated) return NextResponse.redirect(new URL("/admin", request.url));
    return withStaleCookieCleared(NextResponse.next({ request }));
  }

  if (!isAuthenticated) {
    return withStaleCookieCleared(NextResponse.redirect(new URL("/admin/login", request.url)));
  }

  return NextResponse.next({ request });
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/api/admin/:path*"],
};

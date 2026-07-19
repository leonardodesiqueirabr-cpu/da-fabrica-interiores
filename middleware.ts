import { type NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, isAdminSessionValue } from "@/lib/admin-auth";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isAdminRoute = pathname.startsWith("/admin");
  const isLoginRoute = pathname === "/admin/login";

  if (!isAdminRoute || isLoginRoute) {
    if (isLoginRoute && isAdminSessionValue(request.cookies.get(ADMIN_SESSION_COOKIE)?.value)) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }

    return NextResponse.next({ request });
  }

  if (!isAdminSessionValue(request.cookies.get(ADMIN_SESSION_COOKIE)?.value)) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return NextResponse.next({ request });
}

export const config = {
  matcher: ["/admin/:path*"],
};

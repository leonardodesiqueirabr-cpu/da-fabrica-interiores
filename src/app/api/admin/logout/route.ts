import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE } from "@/lib/admin-auth";

export async function POST(request: Request) {
  const origin = new URL(request.url).origin;
  const response = NextResponse.redirect(new URL("/admin/login", origin), { status: 302 });
  response.cookies.delete(ADMIN_SESSION_COOKIE);

  return response;
}

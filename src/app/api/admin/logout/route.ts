import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE } from "@/lib/admin-auth";

export async function POST(request: Request) {
  const origin = new URL(request.url).origin;
  const response = NextResponse.redirect(new URL("/admin/login", origin), { status: 302 });
  response.cookies.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  });

  return response;
}

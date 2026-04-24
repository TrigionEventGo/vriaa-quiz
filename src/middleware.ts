import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSessionValue,
} from "@/lib/admin-session-crypto";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const needsAdmin =
    pathname.startsWith("/admin") || pathname.startsWith("/host");
  if (!needsAdmin) return NextResponse.next();
  if (pathname.startsWith("/admin/login")) return NextResponse.next();

  const secret = process.env.QUIZ_ADMIN_TOKEN;
  if (!secret) return NextResponse.next();

  const raw = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const ok = raw ? await verifyAdminSessionValue(secret, raw) : false;
  if (ok) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/admin/login";
  url.searchParams.set("from", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/host", "/host/:path*"],
};

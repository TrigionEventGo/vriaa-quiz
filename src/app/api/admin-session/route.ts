import { NextResponse } from "next/server";

import {
  ADMIN_SESSION_COOKIE,
  mintAdminSessionValue,
} from "@/lib/admin-session-crypto";

const TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function POST(request: Request) {
  const secret = process.env.QUIZ_ADMIN_TOKEN;
  if (!secret) {
    return NextResponse.json(
      {
        error:
          "QUIZ_ADMIN_TOKEN is not set on the server. Configure it before using admin login.",
      },
      { status: 400 }
    );
  }

  let body: { password?: string };
  try {
    body = (await request.json()) as { password?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const password = typeof body.password === "string" ? body.password : "";
  if (password !== secret) {
    return NextResponse.json({ error: "Onjuist wachtwoord" }, { status: 401 });
  }

  const value = await mintAdminSessionValue(secret, TTL_MS);
  const secure = process.env.NODE_ENV === "production";
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value,
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: Math.floor(TTL_MS / 1000),
  });
  return res;
}

export async function DELETE() {
  const secure = process.env.NODE_ENV === "production";
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 0,
  });
  return res;
}

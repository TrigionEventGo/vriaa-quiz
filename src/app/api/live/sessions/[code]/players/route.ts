import { NextResponse } from "next/server";

import { getLiveSession, registerLivePlayer } from "@/lib/live-session";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ code: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { code } = await context.params;
  if (!getLiveSession(code)) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  let body: { nickname?: string };
  try {
    body = (await request.json()) as { nickname?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const nickname =
    typeof body.nickname === "string" ? body.nickname : String(body.nickname ?? "");

  const result = registerLivePlayer(code, nickname);
  if (!result.ok) {
    const status = result.error === "Session not found" ? 404 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ playerId: result.playerId });
}

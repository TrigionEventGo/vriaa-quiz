import { NextResponse } from "next/server";

import { getLiveSession, submitLiveAnswer } from "@/lib/live-session";
import { readQuizQuestions } from "@/lib/quiz-storage";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ code: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { code } = await context.params;
  if (!getLiveSession(code)) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  let body: { playerId?: string; optionIndex?: number };
  try {
    body = (await request.json()) as { playerId?: string; optionIndex?: number };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const playerId = typeof body.playerId === "string" ? body.playerId.trim() : "";
  const optionIndex = body.optionIndex;

  if (!playerId) {
    return NextResponse.json({ error: "playerId is required" }, { status: 400 });
  }
  if (typeof optionIndex !== "number" || !Number.isInteger(optionIndex)) {
    return NextResponse.json({ error: "optionIndex must be an integer" }, { status: 400 });
  }

  let questions: Awaited<ReturnType<typeof readQuizQuestions>>;
  try {
    questions = await readQuizQuestions();
  } catch (e) {
    const message = e instanceof Error ? e.message : "Read failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const result = submitLiveAnswer(code, playerId, optionIndex, questions);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    questionIndex: result.questionIndex,
    pointsThisQuestion: result.pointsThisQuestion,
    totalPoints: result.totalPoints,
  });
}

import { NextResponse } from "next/server";

import { isAdminAuthorized } from "@/lib/admin-auth";
import { getLiveSession, patchLiveSession } from "@/lib/live-session";
import { readQuizQuestions } from "@/lib/quiz-storage";
import { totalScoreFromAnswerMap } from "@/lib/scoring";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ code: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { code } = await context.params;
  const session = getLiveSession(code);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  let questions: Awaited<ReturnType<typeof readQuizQuestions>> = [];
  try {
    questions = await readQuizQuestions();
  } catch {
    questions = [];
  }
  const total = questions.length;

  const url = new URL(request.url);
  const playerId = url.searchParams.get("playerId")?.trim() ?? "";
  const wantLeaderboard = url.searchParams.get("leaderboard") === "1";

  const now = Date.now();
  const timerLocked = now >= session.questionEndsAt;
  const base = {
    code: session.code,
    questionIndex: session.questionIndex,
    totalQuestions: total,
    updatedAt: session.updatedAt,
    secondsPerQuestion: session.secondsPerQuestion,
    questionEndsAt: session.questionEndsAt,
    timerLocked,
  };

  const standingsTop = Object.values(session.players)
    .map((p) => ({
      nickname: p.nickname,
      totalPoints: totalScoreFromAnswerMap(questions, p.answersByQuestion),
    }))
    .sort(
      (a, b) =>
        b.totalPoints - a.totalPoints || a.nickname.localeCompare(b.nickname, "nl")
    )
    .slice(0, 8);

  if (wantLeaderboard && (await isAdminAuthorized(request))) {
    const rows = Object.values(session.players).map((p) => ({
      playerId: p.id,
      nickname: p.nickname,
      totalPoints: totalScoreFromAnswerMap(questions, p.answersByQuestion),
    }));
    rows.sort(
      (a, b) =>
        b.totalPoints - a.totalPoints || a.nickname.localeCompare(b.nickname, "nl")
    );
    return NextResponse.json({ ...base, leaderboard: rows });
  }

  if (!playerId) {
    return NextResponse.json(base);
  }

  const player = session.players[playerId];
  if (!player) {
    return NextResponse.json(
      { ...base, error: "Unknown player" },
      { status: 404 }
    );
  }

  const qIdx = session.questionIndex;
  const answeredCurrent = player.answersByQuestion[qIdx] !== undefined;
  const totalPoints = totalScoreFromAnswerMap(questions, player.answersByQuestion);

  return NextResponse.json({
    ...base,
    player: {
      nickname: player.nickname,
      answeredCurrent,
      totalPoints,
    },
    standingsTop,
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  if (!(await isAdminAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { code } = await context.params;
  let body: { action?: string };
  try {
    body = (await request.json()) as { action?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const action = body.action;
  if (action !== "next" && action !== "prev") {
    return NextResponse.json(
      { error: 'Body must include action: "next" | "prev"' },
      { status: 400 }
    );
  }
  let maxIndex = 0;
  try {
    const qs = await readQuizQuestions();
    maxIndex = Math.max(0, qs.length - 1);
  } catch {
    maxIndex = 0;
  }
  const next = patchLiveSession(code, action, maxIndex);
  if (!next) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  const now = Date.now();
  return NextResponse.json({
    code: next.code,
    questionIndex: next.questionIndex,
    totalQuestions: maxIndex + 1,
    updatedAt: next.updatedAt,
    secondsPerQuestion: next.secondsPerQuestion,
    questionEndsAt: next.questionEndsAt,
    timerLocked: now >= next.questionEndsAt,
  });
}

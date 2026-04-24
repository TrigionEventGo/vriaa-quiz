import { NextResponse } from "next/server";

import { isAdminAuthorized } from "@/lib/admin-auth";
import { readQuizQuestions, writeQuizQuestions } from "@/lib/quiz-storage";
import { parseQuizQuestions } from "@/lib/quiz-types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const questions = await readQuizQuestions();
    return NextResponse.json(questions);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Read failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!(await isAdminAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseQuizQuestions(body);
  if (!parsed) {
    return NextResponse.json(
      {
        error:
          "Body must be a non-empty JSON array. Each item needs question (string), options (non-empty strings), and correct (valid index).",
      },
      { status: 400 }
    );
  }

  try {
    await writeQuizQuestions(parsed);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Write failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, count: parsed.length });
}

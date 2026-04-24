import { promises as fs } from "fs";
import path from "path";

import defaultQuestions from "@/data/quiz-questions.json";
import { parseQuizQuestions, type QuizQuestion } from "@/lib/quiz-types";

const RUNTIME_FILE = path.join(process.cwd(), "data", "quiz-questions.json");

export async function readQuizQuestions(): Promise<QuizQuestion[]> {
  try {
    const raw = await fs.readFile(RUNTIME_FILE, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    const questions = parseQuizQuestions(parsed);
    if (questions) return questions;
  } catch {
    /* use bundled default */
  }
  const fallback = parseQuizQuestions(defaultQuestions);
  if (!fallback) {
    throw new Error("Invalid default quiz questions");
  }
  return fallback;
}

export async function writeQuizQuestions(
  questions: QuizQuestion[]
): Promise<void> {
  await fs.mkdir(path.dirname(RUNTIME_FILE), { recursive: true });
  await fs.writeFile(
    RUNTIME_FILE,
    `${JSON.stringify(questions, null, 2)}\n`,
    "utf8"
  );
}

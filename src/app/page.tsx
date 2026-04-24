import seedQuestions from "@/data/quiz-questions.json";
import { readQuizQuestions } from "@/lib/quiz-storage";
import { parseQuizQuestions } from "@/lib/quiz-types";
import { QuizClient } from "./quiz-client";

export const dynamic = "force-dynamic";

const FALLBACK = parseQuizQuestions(seedQuestions) ?? [];

export default async function Home() {
  let questions;
  try {
    questions = await readQuizQuestions();
  } catch {
    questions = FALLBACK;
  }

  return <QuizClient initialQuestions={questions} />;
}

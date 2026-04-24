export type QuizQuestion = {
  question: string;
  options: string[];
  /** Index of the correct option in `options` */
  correct: number;
};

/** Versioned on-disk / API envelope (Phase 1+); runtime list endpoints stay arrays for now. */
export type QuizPackV1 = {
  version: 1;
  questions: QuizQuestion[];
};

export function isQuizQuestion(value: unknown): value is QuizQuestion {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (typeof v.question !== "string" || v.question.trim().length < 1)
    return false;
  if (!Array.isArray(v.options) || v.options.length < 2) return false;
  if (!v.options.every((o) => typeof o === "string" && o.trim().length > 0))
    return false;
  if (
    typeof v.correct !== "number" ||
    !Number.isInteger(v.correct) ||
    v.correct < 0 ||
    v.correct >= v.options.length
  )
    return false;
  return true;
}

export function parseQuizQuestions(raw: unknown): QuizQuestion[] | null {
  if (!Array.isArray(raw)) return null;
  if (raw.length === 0) return null;
  if (!raw.every(isQuizQuestion)) return null;
  return raw;
}

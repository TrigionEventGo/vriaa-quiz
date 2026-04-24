/**
 * Points for a single multiple-choice question (no speed bonus in v1).
 * `selectedIndex` null means no answer submitted before lock.
 */
export function scoreMultipleChoice(
  correctIndex: number,
  selectedIndex: number | null
): 0 | 1 {
  if (selectedIndex === null) return 0;
  return selectedIndex === correctIndex ? 1 : 0;
}

export function totalScoreForAnswers(
  questions: { correct: number }[],
  answers: (number | null)[]
): number {
  let sum = 0;
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const a = answers[i] ?? null;
    if (!q) continue;
    sum += scoreMultipleChoice(q.correct, a);
  }
  return sum;
}

/** Sum scores for sparse `questionIndex -> optionIndex` answers (live session sheet). */
export function totalScoreFromAnswerMap(
  questions: { correct: number }[],
  answersByQuestion: Record<number, number>
): number {
  let sum = 0;
  for (const [key, selected] of Object.entries(answersByQuestion)) {
    const i = Number(key);
    if (!Number.isInteger(i) || i < 0 || i >= questions.length) continue;
    const q = questions[i];
    if (!q) continue;
    sum += scoreMultipleChoice(q.correct, selected);
  }
  return sum;
}

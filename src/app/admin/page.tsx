import { readQuizQuestions } from "@/lib/quiz-storage";

import { AdminQuizClient } from "./admin-quiz-client";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const initialQuestions = await readQuizQuestions();
  return <AdminQuizClient initialQuestions={initialQuestions} />;
}

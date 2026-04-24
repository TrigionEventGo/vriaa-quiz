import { scoreMultipleChoice, totalScoreFromAnswerMap } from "@/lib/scoring";

/** One live run = implicit single round (quiz engine v1). */
export type LivePlayer = {
  id: string;
  nickname: string;
  createdAt: number;
  /** questionIndex -> selected option index */
  answersByQuestion: Record<number, number>;
};

export type LiveSessionState = {
  code: string;
  questionIndex: number;
  updatedAt: number;
  players: Record<string, LivePlayer>;
};

const store = new Map<string, LiveSessionState>();

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length]!;
  }
  return out;
}

export function createLiveSession(): LiveSessionState {
  let code = randomCode();
  while (store.has(code)) code = randomCode();
  const state: LiveSessionState = {
    code,
    questionIndex: 0,
    updatedAt: Date.now(),
    players: {},
  };
  store.set(code, state);
  return state;
}

export function getLiveSession(code: string): LiveSessionState | undefined {
  return store.get(code.trim().toUpperCase());
}

export function patchLiveSession(
  code: string,
  action: "next" | "prev",
  maxIndex: number
): LiveSessionState | null {
  const key = code.trim().toUpperCase();
  const cur = store.get(key);
  if (!cur) return null;
  let nextIdx = cur.questionIndex;
  if (action === "next") nextIdx = Math.min(cur.questionIndex + 1, maxIndex);
  else nextIdx = Math.max(cur.questionIndex - 1, 0);
  const updated: LiveSessionState = {
    ...cur,
    questionIndex: nextIdx,
    updatedAt: Date.now(),
    players: { ...cur.players },
  };
  store.set(key, updated);
  return updated;
}

const NICKNAME_MIN = 1;
const NICKNAME_MAX = 24;

export function registerLivePlayer(
  code: string,
  nickname: string
): { ok: true; playerId: string } | { ok: false; error: string } {
  const key = code.trim().toUpperCase();
  const session = store.get(key);
  if (!session) return { ok: false, error: "Session not found" };
  const name = nickname.trim();
  if (name.length < NICKNAME_MIN || name.length > NICKNAME_MAX) {
    return {
      ok: false,
      error: `Nickname must be ${NICKNAME_MIN}-${NICKNAME_MAX} characters`,
    };
  }
  const id = crypto.randomUUID();
  const player: LivePlayer = {
    id,
    nickname: name,
    createdAt: Date.now(),
    answersByQuestion: {},
  };
  const next: LiveSessionState = {
    ...session,
    players: { ...session.players, [id]: player },
    updatedAt: Date.now(),
  };
  store.set(key, next);
  return { ok: true, playerId: id };
}

export function submitLiveAnswer(
  code: string,
  playerId: string,
  optionIndex: number,
  questions: { correct: number; options: string[] }[]
):
  | {
      ok: true;
      questionIndex: number;
      pointsThisQuestion: 0 | 1;
      totalPoints: number;
    }
  | { ok: false; error: string; status: number } {
  const key = code.trim().toUpperCase();
  const session = store.get(key);
  if (!session) return { ok: false, error: "Session not found", status: 404 };
  const player = session.players[playerId];
  if (!player)
    return { ok: false, error: "Unknown player — join again", status: 404 };

  const qIdx = session.questionIndex;
  const q = questions[qIdx];
  if (!q)
    return { ok: false, error: "No active question for this session", status: 400 };

  if (
    typeof optionIndex !== "number" ||
    !Number.isInteger(optionIndex) ||
    optionIndex < 0 ||
    optionIndex >= q.options.length
  ) {
    return { ok: false, error: "Invalid option index", status: 400 };
  }

  if (player.answersByQuestion[qIdx] !== undefined) {
    return {
      ok: false,
      error: "Already answered this question",
      status: 409,
    };
  }

  const pointsThisQuestion = scoreMultipleChoice(q.correct, optionIndex);
  const answersByQuestion = {
    ...player.answersByQuestion,
    [qIdx]: optionIndex,
  };
  const updatedPlayer: LivePlayer = {
    ...player,
    answersByQuestion,
  };
  const next: LiveSessionState = {
    ...session,
    players: { ...session.players, [playerId]: updatedPlayer },
    updatedAt: Date.now(),
  };
  store.set(key, next);
  const totalPoints = totalScoreFromAnswerMap(questions, answersByQuestion);
  return {
    ok: true,
    questionIndex: qIdx,
    pointsThisQuestion,
    totalPoints,
  };
}

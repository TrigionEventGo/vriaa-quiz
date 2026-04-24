export type LiveSessionState = {
  code: string;
  questionIndex: number;
  updatedAt: number;
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
  };
  store.set(key, updated);
  return updated;
}

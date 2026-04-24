"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { QuizQuestion } from "@/lib/quiz-types";
import { cn } from "@/lib/utils";

const TILE_LABELS = ["A", "B", "C", "D"] as const;

const tileSurface = (idx: number) =>
  [
    "bg-quiz-tile-a text-white",
    "bg-quiz-tile-b text-white",
    "bg-quiz-tile-c text-quiz-tile-c-fg",
    "bg-quiz-tile-d text-white",
  ][idx] ?? "bg-muted text-foreground";

function storageKey(code: string) {
  return `vriaa-quiz-player:${code.trim().toUpperCase()}`;
}

type SessionBase = {
  questionIndex: number;
  totalQuestions: number;
};

type SessionWithPlayer = SessionBase & {
  player: {
    nickname: string;
    answeredCurrent: boolean;
    totalPoints: number;
  };
};

export function PlayClient({ code }: { code: string }) {
  const codeKey = useMemo(() => code.trim().toUpperCase(), [code]);

  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null);
  const [session, setSession] = useState<SessionWithPlayer | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [nickname, setNickname] = useState("");
  const [joinBusy, setJoinBusy] = useState(false);
  const [answerBusy, setAnswerBusy] = useState(false);
  const [lastSubmit, setLastSubmit] = useState<{
    points: 0 | 1;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadQuestions = useCallback(async () => {
    const res = await fetch("/api/quiz-questions", { cache: "no-store" });
    const data = (await res.json()) as QuizQuestion[] | { error?: string };
    if (!res.ok || !Array.isArray(data)) {
      throw new Error("Vragen laden mislukt.");
    }
    return data;
  }, []);

  const pollSession = useCallback(
    async (pid: string) => {
      const res = await fetch(
        `/api/live/sessions/${encodeURIComponent(codeKey)}?playerId=${encodeURIComponent(pid)}`,
        { cache: "no-store" }
      );
      const body = (await res.json()) as SessionWithPlayer & { error?: string };
      if (!res.ok) {
        if (res.status === 404 && body.error === "Unknown player") {
          return { kind: "unknown_player" as const };
        }
        throw new Error(body.error ?? "Sessie niet gevonden.");
      }
      return { kind: "ok" as const, body };
    },
    [codeKey]
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const qs = await loadQuestions();
        if (!cancelled) setQuestions(qs);
      } catch {
        if (!cancelled) setError("Vragen laden mislukt.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadQuestions]);

  useEffect(() => {
    const stored =
      typeof window !== "undefined" ? window.sessionStorage.getItem(storageKey(codeKey)) : null;
    if (stored) setPlayerId(stored);
  }, [codeKey]);

  useEffect(() => {
    if (!playerId) return;
    const pid = playerId;
    let timer: ReturnType<typeof setInterval> | undefined;
    let cancelled = false;

    async function tick() {
      try {
        const r = await pollSession(pid);
        if (cancelled) return;
        if (r.kind === "unknown_player") {
          window.sessionStorage.removeItem(storageKey(codeKey));
          setPlayerId(null);
          setSession(null);
          setError("Sessie verlopen — meld je opnieuw aan.");
          return;
        }
        setError(null);
        setSession(r.body);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Netwerkfout bij sessie.");
          setSession(null);
        }
      }
    }

    void tick();
    timer = setInterval(() => void tick(), 2000);
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [codeKey, playerId, pollSession]);

  useEffect(() => {
    if (!session) return;
    const answered = session.player.answeredCurrent;
    if (!answered) setLastSubmit(null);
  }, [session?.questionIndex, session?.player.answeredCurrent]);

  async function handleJoin() {
    const name = nickname.trim();
    if (name.length < 1) return;
    setJoinBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/live/sessions/${encodeURIComponent(codeKey)}/players`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: name }),
      });
      const body = (await res.json().catch(() => ({}))) as { playerId?: string; error?: string };
      if (!res.ok) {
        setError(body.error ?? `Aanmelden mislukt (${res.status})`);
        return;
      }
      if (!body.playerId) {
        setError("Ongeldig antwoord van server.");
        return;
      }
      window.sessionStorage.setItem(storageKey(codeKey), body.playerId);
      setPlayerId(body.playerId);
    } catch {
      setError("Netwerkfout.");
    } finally {
      setJoinBusy(false);
    }
  }

  async function submitAnswer(optionIndex: number) {
    const id = playerId;
    if (!id || !session || session.player.answeredCurrent || answerBusy) return;
    setAnswerBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/live/sessions/${encodeURIComponent(codeKey)}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: id, optionIndex }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        pointsThisQuestion?: 0 | 1;
        totalPoints?: number;
        error?: string;
      };
      if (!res.ok) {
        setError(body.error ?? `Antwoord versturen mislukt (${res.status})`);
        return;
      }
      if (typeof body.pointsThisQuestion === "number") {
        setLastSubmit({ points: body.pointsThisQuestion });
      }
      const poll = await pollSession(id);
      if (poll.kind === "ok") setSession(poll.body);
    } catch {
      setError("Netwerkfout.");
    } finally {
      setAnswerBusy(false);
    }
  }

  if (error && !session && !playerId) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4">
        <p className="text-center text-destructive">{error}</p>
        <Button type="button" variant="outline" onClick={() => setError(null)}>
          Opnieuw
        </Button>
      </div>
    );
  }

  if (!questions) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <p className="text-muted-foreground">Laden…</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <p className="max-w-md text-center text-muted-foreground">
          Er zijn nog geen vragen. De quizmaster moet eerst vragen toevoegen via het beheer.
        </p>
      </div>
    );
  }

  if (!playerId) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-8">
        <Card className="w-full max-w-md border border-white/10 bg-card/95 shadow-xl ring-1 ring-white/5 backdrop-blur-sm">
          <CardHeader className="gap-2 pb-2">
            <Badge variant="secondary" className="w-fit text-xs font-semibold">
              Live · code {codeKey}
            </Badge>
            <h2 className="quiz-display-title text-balance text-foreground">Meedoen</h2>
            <p className="text-sm text-muted-foreground">
              Vul je naam in om antwoord te kunnen geven. De host stuurt de vragen aan.
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Input
              placeholder="Jouw naam"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void handleJoin()}
              className="h-12 min-h-12 border-white/15 bg-input/40 text-center text-base"
              autoFocus
              maxLength={24}
            />
            <Button
              type="button"
              size="lg"
              className="h-12 min-h-12 w-full text-base font-semibold"
              disabled={nickname.trim().length < 1 || joinBusy}
              onClick={() => void handleJoin()}
            >
              {joinBusy ? "Bezig…" : "Start"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <p className="text-muted-foreground">Sessie laden…</p>
      </div>
    );
  }

  const idx = Math.min(session.questionIndex, questions.length - 1);
  const q = questions[idx]!;
  const answered = session.player.answeredCurrent;
  const canPick = !answered && !answerBusy;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] py-6">
      <Card className="w-full max-w-md border border-white/10 bg-card/95 shadow-xl ring-1 ring-white/5 backdrop-blur-sm">
        <CardHeader className="gap-2 pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge variant="secondary" className="text-xs font-semibold">
              Live · vraag {idx + 1}/{questions.length}
            </Badge>
            <Badge
              variant="outline"
              className="quiz-score-nums border-white/20 text-sm font-semibold tabular-nums"
            >
              {session.player.totalPoints} punten
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{session.player.nickname}</span> ·{" "}
            <span className="font-mono">{codeKey}</span>
          </p>
          <h2 className="quiz-display-title text-balance text-foreground">{q.question}</h2>
        </CardHeader>
        <CardContent>
          {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            {q.options.map((option, optIdx) => (
              <button
                key={optIdx}
                type="button"
                disabled={!canPick}
                onClick={() => void submitAnswer(optIdx)}
                className={cn(
                  "flex min-h-[88px] flex-col items-stretch justify-between gap-2 rounded-[20px] border-2 border-transparent px-3 py-3 text-left text-base font-semibold leading-snug shadow-md transition-all outline-none focus-visible:ring-[3px] focus-visible:ring-ring/60",
                  "motion-safe:active:scale-[0.99]",
                  tileSurface(optIdx),
                  canPick && "hover:brightness-110 motion-safe:hover:scale-[1.02]",
                  !canPick && "cursor-default opacity-90"
                )}
              >
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/20 text-xs font-extrabold text-inherit">
                  {TILE_LABELS[optIdx]}
                </span>
                <span className="text-pretty">{option}</span>
              </button>
            ))}
          </div>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            {answerBusy && "Antwoord verzenden…"}
            {!answerBusy && answered && lastSubmit && (
              <span className="font-medium text-foreground">
                {lastSubmit.points === 1 ? "Goed zo! +1 punt" : "Helaas, geen punt deze keer."}
              </span>
            )}
            {!answerBusy && answered && !lastSubmit && "Antwoord ontvangen. Wacht op de host."}
            {!answerBusy && !answered && "Tik op een antwoord. Je ziet daarna of het goed was."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

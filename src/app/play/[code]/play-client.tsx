"use client";

import { startTransition, useCallback, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { QuizQuestion } from "@/lib/quiz-types";
import { cn } from "@/lib/utils";

const TILE_LABELS = ["A", "B", "C", "D"] as const;

const PLAYER_SURFACE =
  "quiz-player-light min-h-dvh bg-background text-foreground";

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

type WinnerDto = { totalPoints: number; nicknames: string[] };

type SessionBase = {
  questionIndex: number;
  totalQuestions: number;
  secondsPerQuestion: number;
  questionEndsAt: number;
  timerLocked: boolean;
  sessionFinished: boolean;
  standingsTop: { nickname: string; totalPoints: number }[];
  winner: WinnerDto | null;
};

type SessionWithPlayer = SessionBase & {
  player: {
    nickname: string;
    answeredCurrent: boolean;
    totalPoints: number;
  };
};

function secondsLeft(endsAt: number): number {
  return Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
}

function joinNamesDutch(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0]!;
  if (names.length === 2) return `${names[0]} en ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} en ${names.at(-1)!}`;
}

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
  const [pickedIndex, setPickedIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 250);
    return () => clearInterval(id);
  }, []);

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
      const parsed = (await res.json()) as Partial<SessionWithPlayer> & {
        error?: string;
      };
      if (!res.ok) {
        if (res.status === 404 && parsed.error === "Unknown player") {
          return { kind: "unknown_player" as const };
        }
        throw new Error(parsed.error ?? "Sessie niet gevonden.");
      }
      if (!parsed.player) {
        throw new Error("Sessie-antwoord onvolledig.");
      }
      const rawWinner = parsed.winner as WinnerDto | null | undefined;
      const winner =
        rawWinner &&
        typeof rawWinner.totalPoints === "number" &&
        Array.isArray(rawWinner.nicknames)
          ? rawWinner
          : null;

      const body: SessionWithPlayer = {
        questionIndex: parsed.questionIndex ?? 0,
        totalQuestions: parsed.totalQuestions ?? 0,
        secondsPerQuestion: parsed.secondsPerQuestion ?? 25,
        questionEndsAt: parsed.questionEndsAt ?? Date.now(),
        timerLocked: parsed.timerLocked ?? false,
        sessionFinished: Boolean(parsed.sessionFinished),
        standingsTop: Array.isArray(parsed.standingsTop) ? parsed.standingsTop : [],
        winner,
        player: parsed.player,
      };
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
    if (stored) startTransition(() => setPlayerId(stored));
  }, [codeKey]);

  const syncSession = useCallback(async () => {
    const pid = playerId;
    if (!pid) return;
    try {
      const r = await pollSession(pid);
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
      setError(e instanceof Error ? e.message : "Netwerkfout bij sessie.");
      setSession(null);
    }
  }, [codeKey, playerId, pollSession]);

  useEffect(() => {
    if (!playerId) return;
    let cancelled = false;

    async function tick() {
      if (cancelled) return;
      await syncSession();
    }

    void tick();
    const timer = setInterval(() => void tick(), 10000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") void tick();
    };
    document.addEventListener("visibilitychange", onVisibility);

    const es = new EventSource(
      `/api/live/sessions/${encodeURIComponent(codeKey)}/events`
    );
    let lastSig = "";
    es.onmessage = (ev) => {
      try {
        const p = JSON.parse(ev.data) as {
          updatedAt?: number;
          questionIndex?: number;
          questionEndsAt?: number;
          sessionFinished?: boolean;
        };
        const sig = `${p.updatedAt}:${p.questionIndex}:${p.questionEndsAt}:${p.sessionFinished}`;
        if (sig !== lastSig) {
          lastSig = sig;
          void tick();
        }
      } catch {
        void tick();
      }
    };
    es.addEventListener("end", () => es.close());
    es.onerror = () => {
      es.close();
    };

    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      es.close();
    };
  }, [codeKey, playerId, syncSession]);

  useEffect(() => {
    if (!session) return;
    const answered = session.player.answeredCurrent;
    if (!answered)
      startTransition(() => {
        setLastSubmit(null);
        setPickedIndex(null);
      });
  }, [session, session?.questionIndex, session?.player.answeredCurrent]);

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
      setPickedIndex(optionIndex);
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
      <div
        className={cn(
          PLAYER_SURFACE,
          "flex flex-col items-center justify-center gap-4 px-4"
        )}
      >
        <p className="text-center text-destructive">{error}</p>
        <Button type="button" variant="outline" onClick={() => setError(null)}>
          Opnieuw
        </Button>
      </div>
    );
  }

  if (!questions) {
    return (
      <div className={cn(PLAYER_SURFACE, "flex items-center justify-center px-4")}>
        <p className="text-muted-foreground">Laden…</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className={cn(PLAYER_SURFACE, "flex items-center justify-center px-4")}>
        <p className="max-w-md text-center text-muted-foreground">
          Er zijn nog geen vragen. De quizmaster moet eerst vragen toevoegen via het beheer.
        </p>
      </div>
    );
  }

  if (!playerId) {
    return (
      <div
        className={cn(
          PLAYER_SURFACE,
          "flex flex-col items-center justify-center px-4 py-8"
        )}
      >
        <Card className="w-full max-w-md border border-border bg-card/95 shadow-xl ring-1 ring-black/[0.04] backdrop-blur-sm">
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
              className="h-12 min-h-12 border-border bg-input/50 text-center text-base"
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
      <div className={cn(PLAYER_SURFACE, "flex items-center justify-center px-4")}>
        <p className="text-muted-foreground">Sessie laden…</p>
      </div>
    );
  }

  if (session.sessionFinished) {
    const w = session.winner;
    const iWon = w ? w.nicknames.includes(session.player.nickname) : false;
    return (
      <div
        className={cn(
          PLAYER_SURFACE,
          "flex flex-col items-center justify-center px-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] py-6"
        )}
      >
        <Card className="w-full max-w-md border border-border bg-card/95 text-center shadow-xl ring-1 ring-black/[0.04] backdrop-blur-sm">
          <CardHeader className="gap-2 pb-2">
            <Badge variant="secondary" className="mx-auto w-fit text-xs font-semibold">
              Live · afgelopen
            </Badge>
            <div className="text-5xl" aria-hidden>
              🏆
            </div>
            <h2 className="quiz-display-title text-balance text-2xl font-extrabold text-foreground">
              De quiz is afgelopen
            </h2>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            {w && w.nicknames.length > 0 ? (
              <>
                <p className="text-lg text-muted-foreground">
                  {w.nicknames.length === 1 ? "Winnaar" : "Winnaars"} (
                  <span className="quiz-score-nums font-semibold text-foreground tabular-nums">
                    {w.totalPoints}
                  </span>{" "}
                  {w.totalPoints === 1 ? "punt" : "punten"}):
                </p>
                <p className="text-xl font-bold text-foreground">{joinNamesDutch(w.nicknames)}</p>
                {iWon && (
                  <p className="text-base font-semibold text-primary">
                    Gefeliciteerd — jij hoort bij de winnaars!
                  </p>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">
                Er was nog geen scorebord (geen deelnemers of nog geen antwoorden).
              </p>
            )}
            <div className="w-full rounded-xl border border-border bg-muted/15 p-4">
              <p className="text-sm text-muted-foreground">Jouw score</p>
              <p className="quiz-score-nums text-3xl font-extrabold tabular-nums text-foreground">
                {session.player.totalPoints}
                {session.totalQuestions > 0 ? (
                  <span className="text-lg font-semibold text-muted-foreground">
                    {" "}
                    / {session.totalQuestions}
                  </span>
                ) : null}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{session.player.nickname}</span> ·{" "}
                <span className="font-mono">{codeKey}</span>
              </p>
            </div>
            {session.standingsTop.length > 0 && (
              <div className="w-full rounded-xl border border-border bg-muted/15 p-3">
                <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Top {Math.min(8, session.standingsTop.length)}
                </p>
                <ol className="space-y-1 text-sm">
                  {session.standingsTop.map((row, i) => (
                    <li
                      key={`${row.nickname}-${i}`}
                      className="flex justify-between gap-2 tabular-nums text-muted-foreground"
                    >
                      <span>
                        {i + 1}.{" "}
                        <span
                          className={
                            row.nickname === session.player.nickname
                              ? "font-semibold text-foreground"
                              : ""
                          }
                        >
                          {row.nickname}
                        </span>
                      </span>
                      <span className="quiz-score-nums font-medium">{row.totalPoints}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            <p className="text-center text-xs text-muted-foreground">
              Je kunt dit venster sluiten. Bedankt voor het meedoen!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const idx = Math.min(session.questionIndex, questions.length - 1);
  const q = questions[idx]!;
  const answered = session.player.answeredCurrent;
  const lockedOut = session.timerLocked || secondsLeft(session.questionEndsAt) <= 0;
  const canPick = !answered && !answerBusy && !lockedOut;
  const left = secondsLeft(session.questionEndsAt);
  const showPickedResult = answered && pickedIndex !== null;
  const showCorrectAfterLock = lockedOut && !answered;
  const highlightCorrect = showPickedResult || showCorrectAfterLock;

  return (
    <div
      className={cn(
        PLAYER_SURFACE,
        "flex flex-col items-center justify-center px-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] py-6"
      )}
    >
      <Card className="w-full max-w-md border border-border bg-card/95 shadow-xl ring-1 ring-black/[0.04] backdrop-blur-sm">
        <CardHeader className="gap-2 pb-2" data-tick={tick}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge variant="secondary" className="text-xs font-semibold">
              Live · vraag {idx + 1}/{questions.length}
            </Badge>
            <Badge
              variant="outline"
              className="quiz-score-nums border-border text-sm font-semibold tabular-nums"
            >
              {session.player.totalPoints} punten
            </Badge>
          </div>
          <p
            role="status"
            aria-live="polite"
            className="text-center text-sm text-muted-foreground"
          >
            {lockedOut ? (
              <span className="font-medium text-destructive">Tijd is om</span>
            ) : (
              <>
                Nog <span className="font-mono font-semibold text-foreground">{left}</span>s
              </>
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{session.player.nickname}</span> ·{" "}
            <span className="font-mono">{codeKey}</span>
          </p>
          <h2 className="quiz-display-title text-balance text-foreground">{q.question}</h2>
        </CardHeader>
        <CardContent>
          {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            {q.options.map((option, optIdx) => {
              const isCorrect = highlightCorrect && optIdx === q.correct;
              const isWrongPick =
                showPickedResult && optIdx === pickedIndex && optIdx !== q.correct;
              const isDimmed =
                highlightCorrect &&
                !isCorrect &&
                !(showPickedResult && optIdx === pickedIndex);

              return (
              <button
                key={optIdx}
                type="button"
                disabled={!canPick}
                onClick={() => void submitAnswer(optIdx)}
                className={cn(
                  "flex min-h-[88px] flex-col items-stretch justify-between gap-2 rounded-[20px] border-2 border-transparent px-3 py-3 text-left text-base font-semibold leading-snug shadow-md transition-[transform,box-shadow,opacity,filter] duration-200 ease-out outline-none focus-visible:ring-[3px] focus-visible:ring-ring/60",
                  "motion-safe:active:scale-[0.99] motion-reduce:active:scale-100",
                  tileSurface(optIdx),
                  canPick &&
                    "hover:brightness-110 motion-safe:hover:scale-[1.02] motion-reduce:hover:scale-100",
                  isCorrect &&
                    "border-quiz-correct ring-2 ring-quiz-correct motion-safe:scale-[1.02] motion-reduce:scale-100",
                  isWrongPick &&
                    "border-quiz-incorrect opacity-95 ring-2 ring-quiz-incorrect",
                  isDimmed && "opacity-40 saturate-75",
                  !canPick && !highlightCorrect && "cursor-default opacity-90",
                  highlightCorrect && "cursor-default"
                )}
              >
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/20 text-xs font-extrabold text-inherit">
                  {TILE_LABELS[optIdx]}
                </span>
                <span className="text-pretty">{option}</span>
              </button>
            );
            })}
          </div>
          {highlightCorrect && (
            <p className="mt-3 text-center text-sm text-pretty">
              <span className="text-muted-foreground">Juiste antwoord: </span>
              <span className="font-semibold text-quiz-correct">{q.options[q.correct]}</span>
            </p>
          )}
          <p className="mt-4 text-center text-sm text-muted-foreground">
            {answerBusy && "Antwoord verzenden…"}
            {!answerBusy && answered && lastSubmit && (
              <span className="font-medium text-foreground">
                {lastSubmit.points === 1 ? "Goed zo! +1 punt" : "Helaas, geen punt deze keer."}
              </span>
            )}
            {!answerBusy && answered && !lastSubmit && "Antwoord ontvangen. Wacht op de host."}
            {!answerBusy && !answered && lockedOut && "Je kon niet meer antwoorden — wacht tot de host de volgende vraag opent."}
            {!answerBusy && !answered && !lockedOut && "Tik op een antwoord. Je ziet daarna of het goed was."}
          </p>
          {session.standingsTop.length > 0 && (answered || lockedOut) && (
            <div className="mt-4 rounded-xl border border-border bg-muted/15 p-3">
              <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Top {Math.min(8, session.standingsTop.length)}
              </p>
              <ol className="space-y-1 text-sm">
                {session.standingsTop.map((row, i) => (
                  <li
                    key={`${row.nickname}-${i}`}
                    className="flex justify-between gap-2 tabular-nums text-muted-foreground"
                  >
                    <span>
                      {i + 1}.{" "}
                      <span
                        className={
                          row.nickname === session.player.nickname
                            ? "font-semibold text-foreground"
                            : ""
                        }
                      >
                        {row.nickname}
                      </span>
                    </span>
                    <span className="quiz-score-nums font-medium">{row.totalPoints}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

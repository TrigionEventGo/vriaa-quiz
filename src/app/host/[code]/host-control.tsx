"use client";

import Link from "next/link";
import { startTransition, useCallback, useEffect, useState } from "react";

function formatSecondsLeft(endsAt: number): number {
  return Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
}

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type LeaderRow = {
  playerId: string;
  nickname: string;
  totalPoints: number;
};

type SessionDto = {
  code: string;
  questionIndex: number;
  totalQuestions: number;
  updatedAt: number;
  secondsPerQuestion?: number;
  questionEndsAt?: number;
  timerLocked?: boolean;
  sessionFinished?: boolean;
  winner?: { totalPoints: number; nicknames: string[] };
  leaderboard?: LeaderRow[];
};

export function HostControl({ code }: { code: string }) {
  const [state, setState] = useState<SessionDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 250);
    return () => clearInterval(id);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/live/sessions/${encodeURIComponent(code)}?leaderboard=1`,
        { cache: "no-store", credentials: "include" }
      );
      const body = (await res.json().catch(() => ({}))) as SessionDto & {
        error?: string;
      };
      if (!res.ok) {
        setError(body.error ?? `Sessie niet gevonden (${res.status})`);
        setState(null);
        return;
      }
      setError(null);
      setState(body);
    } catch {
      setError("Netwerkfout.");
    }
  }, [code]);

  useEffect(() => {
    startTransition(() => {
      void refresh();
    });
  }, [refresh]);

  useEffect(() => {
    const t = setInterval(() => void refresh(), 3000);
    return () => clearInterval(t);
  }, [refresh]);

  async function patch(action: "next" | "prev") {
    setError(null);
    try {
      const res = await fetch(`/api/live/sessions/${encodeURIComponent(code)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action }),
      });
      const errBody = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(errBody.error ?? `Actie mislukt (${res.status})`);
        return;
      }
      await refresh();
    } catch {
      setError("Netwerkfout.");
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col gap-4 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/admin"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "border-white/15"
          )}
        >
          Terug naar beheer
        </Link>
        <Link
          href={`/play/${encodeURIComponent(code)}`}
          className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
          target="_blank"
          rel="noreferrer"
        >
          Open spelersscherm
        </Link>
      </div>

      <Card className="border border-white/10 bg-card/95 shadow-lg ring-1 ring-white/5">
        <CardHeader>
          <CardTitle className="font-heading text-xl">Host — live sessie</CardTitle>
          <p className="text-sm text-muted-foreground">
            Code: <span className="font-mono font-semibold text-foreground">{code}</span>
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          {state && (
            <>
              <p className="text-lg">
                Vraag{" "}
                <span className="font-semibold tabular-nums">
                  {state.totalQuestions ? state.questionIndex + 1 : 0}
                </span>
                {state.totalQuestions ? (
                  <span className="text-muted-foreground">
                    {" "}
                    / {state.totalQuestions}
                  </span>
                ) : null}
              </p>
              {typeof state.questionEndsAt === "number" && (
                <p className="text-sm text-muted-foreground" data-tick={tick}>
                  Timer:{" "}
                  <span className="font-mono font-semibold text-foreground tabular-nums">
                    {state.timerLocked || formatSecondsLeft(state.questionEndsAt) <= 0
                      ? "0"
                      : formatSecondsLeft(state.questionEndsAt)}
                    s
                  </span>{" "}
                  <span className="text-xs">
                    (max {state.secondsPerQuestion ?? "—"}s)
                  </span>
                </p>
              )}
              {state.sessionFinished && (
                <p className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-foreground">
                  Quiz afgelopen — spelers zien de winnaar(s). Tik <strong>Vorige</strong> om de
                  laatste vraag weer te openen als dat nodig is.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => void patch("prev")}>
                  Vorige
                </Button>
                <Button
                  type="button"
                  disabled={Boolean(state.sessionFinished)}
                  onClick={() => void patch("next")}
                >
                  {state.sessionFinished
                    ? "Quiz is afgelopen"
                    : state.totalQuestions > 0 &&
                        state.questionIndex >= state.totalQuestions - 1
                      ? "Quiz afronden"
                      : "Volgende"}
                </Button>
                <Button type="button" variant="secondary" onClick={() => void refresh()}>
                  Vernieuwen
                </Button>
              </div>
              {state.leaderboard && state.leaderboard.length > 0 && (
                <div className="rounded-xl border border-white/10 bg-muted/20 p-3">
                  <p className="mb-2 text-sm font-semibold text-foreground">
                    Scorebord (tot nu toe)
                  </p>
                  <ol className="space-y-1.5 text-sm">
                    {state.leaderboard.map((row, i) => (
                      <li
                        key={row.playerId}
                        className="flex items-center justify-between gap-2 tabular-nums"
                      >
                        <span className="text-muted-foreground">
                          {i + 1}.{" "}
                          <span className="font-medium text-foreground">{row.nickname}</span>
                        </span>
                        <span className="quiz-score-nums font-semibold">{row.totalPoints}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

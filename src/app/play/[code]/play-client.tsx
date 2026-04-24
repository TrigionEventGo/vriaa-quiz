"use client";

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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

type SessionDto = {
  questionIndex: number;
  totalQuestions: number;
};

export function PlayClient({ code }: { code: string }) {
  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null);
  const [session, setSession] = useState<SessionDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadQs() {
      try {
        const res = await fetch("/api/quiz-questions", { cache: "no-store" });
        const data = (await res.json()) as QuizQuestion[] | { error?: string };
        if (!res.ok || !Array.isArray(data)) {
          if (!cancelled) setError("Vragen laden mislukt.");
          return;
        }
        if (!cancelled) setQuestions(data);
      } catch {
        if (!cancelled) setError("Netwerkfout bij vragen.");
      }
    }
    void loadQs();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    async function tick() {
      try {
        const res = await fetch(`/api/live/sessions/${encodeURIComponent(code)}`, {
          cache: "no-store",
        });
        const body = (await res.json()) as SessionDto & { error?: string };
        if (!res.ok) {
          setError(body.error ?? "Sessie niet gevonden.");
          setSession(null);
          return;
        }
        setError(null);
        setSession({
          questionIndex: body.questionIndex,
          totalQuestions: body.totalQuestions,
        });
      } catch {
        setError("Netwerkfout bij sessie.");
      }
    }
    void tick();
    timer = setInterval(() => void tick(), 2000);
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [code]);

  if (error && !session) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <p className="text-center text-destructive">{error}</p>
      </div>
    );
  }

  if (!questions || !session) {
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

  const idx = Math.min(session.questionIndex, questions.length - 1);
  const q = questions[idx]!;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]">
      <Card className="w-full max-w-md border border-white/10 bg-card/95 shadow-xl ring-1 ring-white/5 backdrop-blur-sm">
        <CardHeader className="gap-2 pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge variant="secondary" className="text-xs font-semibold">
              Live · vraag {idx + 1}/{questions.length}
            </Badge>
            <span className="font-mono text-xs text-muted-foreground">{code}</span>
          </div>
          <h2 className="quiz-display-title text-balance text-foreground">{q.question}</h2>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {q.options.map((option, optIdx) => (
              <div
                key={optIdx}
                className={cn(
                  "flex min-h-[88px] flex-col items-stretch justify-between gap-2 rounded-[20px] border-2 border-transparent px-3 py-3 text-left text-base font-semibold leading-snug shadow-md",
                  tileSurface(optIdx)
                )}
              >
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/20 text-xs font-extrabold text-inherit">
                  {TILE_LABELS[optIdx]}
                </span>
                <span className="text-pretty">{option}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Antwoorden volgen in een latere fase (real-time). Volg de instructies van de host.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

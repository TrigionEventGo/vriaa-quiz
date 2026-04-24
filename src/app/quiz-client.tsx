"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import type { QuizQuestion } from "@/lib/quiz-types";
import { cn } from "@/lib/utils";

type Screen = "join" | "waiting" | "quiz" | "results";

type Props = {
  initialQuestions: QuizQuestion[];
};

const TILE_LABELS = ["A", "B", "C", "D"] as const;

const tileSurface = (idx: number) =>
  [
    "bg-quiz-tile-a text-white",
    "bg-quiz-tile-b text-white",
    "bg-quiz-tile-c text-quiz-tile-c-fg",
    "bg-quiz-tile-d text-white",
  ][idx] ?? "bg-muted text-foreground";

function QuizScreenShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="quiz-player-light flex min-h-dvh flex-1 flex-col items-center justify-center bg-background px-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] text-foreground"
    >
      {children}
    </div>
  );
}

export function QuizClient({ initialQuestions }: Props) {
  const [questions] = useState<QuizQuestion[]>(initialQuestions);
  const [screen, setScreen] = useState<Screen>("join");
  const [name, setName] = useState("");
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);

  function handleJoin() {
    if (name.trim().length < 1) return;
    if (!questions.length) return;
    setScreen("quiz");
  }

  function handleAnswer(idx: number) {
    if (!questions.length || showResult) return;
    const q = questions[currentQ];
    if (!q) return;
    setSelectedAnswer(idx);
    setShowResult(true);
    if (idx === q.correct) {
      setScore((s) => s + 1);
    }
  }

  function handleNext() {
    if (!questions.length) return;
    if (currentQ < questions.length - 1) {
      setCurrentQ((q) => q + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      setScreen("results");
    }
  }

  if (questions.length === 0) {
    return (
      <QuizScreenShell>
        <Card className="w-full max-w-md border border-border bg-card/95 text-center shadow-xl ring-1 ring-black/[0.04] backdrop-blur-sm">
          <CardContent className="flex flex-col items-center gap-5 pt-10 pb-8">
            <div className="text-5xl" aria-hidden>
              💍
            </div>
            <p className="max-w-[40rem] text-pretty text-base text-muted-foreground">
              Er zijn nog geen quizvragen. Vraag de quizmaster om vragen toe te voegen via het beheerscherm (alleen voor de host).
            </p>
          </CardContent>
        </Card>
      </QuizScreenShell>
    );
  }

  if (screen === "join") {
    return (
      <QuizScreenShell>
        <Card className="w-full max-w-md border border-border bg-card/95 text-center shadow-xl ring-1 ring-black/[0.04] backdrop-blur-sm">
          <CardHeader className="gap-2 pb-2">
            <div className="text-5xl" aria-hidden>
              💍
            </div>
            <h1 className="quiz-display-title bg-gradient-to-r from-primary via-chart-2 to-chart-3 bg-clip-text font-heading text-transparent">
              Vrijgezellenfeest
            </h1>
            <p className="font-heading text-2xl font-bold text-foreground">Marion</p>
            <p className="text-base leading-relaxed text-muted-foreground">
              Hoe goed ken jij de aanstaande bruid? Doe mee met de quiz!
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Input
              placeholder="Jouw naam"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              className="h-12 min-h-12 border-border bg-input/50 text-center text-base"
              autoFocus
              maxLength={24}
            />
            <Button
              size="lg"
              className="h-12 min-h-12 w-full text-base font-semibold shadow-lg shadow-primary/20"
              onClick={handleJoin}
              disabled={name.trim().length < 1}
            >
              Doe mee!
            </Button>
          </CardContent>
        </Card>
      </QuizScreenShell>
    );
  }

  if (screen === "quiz") {
    const q = questions[currentQ];
    if (!q) return null;
    const progress =
      ((currentQ + (showResult ? 1 : 0)) / questions.length) * 100;

    return (
      <QuizScreenShell>
        <Card className="w-full max-w-md border border-border bg-card/95 shadow-xl ring-1 ring-black/[0.04] backdrop-blur-sm">
          <CardHeader className="gap-3 pb-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Badge variant="secondary" className="text-xs font-semibold">
                Vraag {currentQ + 1}/{questions.length}
              </Badge>
              <Badge
                variant="outline"
                className="quiz-score-nums border-border text-sm font-semibold tabular-nums"
              >
                {score} punten
              </Badge>
            </div>
            <Progress value={progress} className="h-2 gap-0 [&_[data-slot=progress-track]]:h-2 [&_[data-slot=progress-track]]:bg-muted [&_[data-slot=progress-indicator]]:bg-gradient-to-r [&_[data-slot=progress-indicator]]:from-primary [&_[data-slot=progress-indicator]]:to-chart-2" />
            <h2 className="quiz-display-title text-balance text-foreground">
              {q.question}
            </h2>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              {q.options.map((option, idx) => {
                const base = tileSurface(idx);
                const isCorrect = showResult && idx === q.correct;
                const isWrongPick =
                  showResult &&
                  idx === selectedAnswer &&
                  idx !== q.correct;
                const isDimmed =
                  showResult && idx !== q.correct && idx !== selectedAnswer;

                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={showResult}
                    onClick={() => handleAnswer(idx)}
                    className={cn(
                      "flex min-h-[88px] flex-col items-stretch justify-between gap-2 rounded-[20px] border-2 border-transparent px-3 py-3 text-left text-base font-semibold leading-snug shadow-md transition-[transform,box-shadow,opacity,filter] duration-200 ease-out outline-none focus-visible:ring-[3px] focus-visible:ring-ring/60 disabled:cursor-default",
                      "motion-safe:active:scale-[0.99] motion-reduce:active:scale-100",
                      base,
                      !showResult &&
                        "hover:brightness-110 motion-safe:hover:scale-[1.02] motion-reduce:hover:scale-100",
                      isCorrect &&
                        "border-quiz-correct ring-2 ring-quiz-correct motion-safe:scale-[1.02] motion-reduce:scale-100",
                      isWrongPick &&
                        "border-quiz-incorrect opacity-95 ring-2 ring-quiz-incorrect",
                      isDimmed && "opacity-40 saturate-75"
                    )}
                  >
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/20 text-xs font-extrabold text-inherit">
                      {TILE_LABELS[idx]}
                    </span>
                    <span className="text-pretty">{option}</span>
                  </button>
                );
              })}
            </div>

            {showResult && (
              <div className="mt-1 flex flex-col gap-2">
                <p className="text-center text-lg font-semibold text-muted-foreground">
                  {selectedAnswer === q.correct
                    ? "Goed zo!"
                    : `Het juiste antwoord was: ${q.options[q.correct]}`}
                </p>
                <Button
                  size="lg"
                  className="h-12 min-h-12 w-full text-base font-semibold"
                  onClick={handleNext}
                >
                  {currentQ < questions.length - 1
                    ? "Volgende vraag"
                    : "Bekijk resultaat"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </QuizScreenShell>
    );
  }

  if (screen === "results") {
    const percentage = Math.round((score / questions.length) * 100);
    let emoji = "🎉";
    let message = "Wauw, je kent Marion door en door!";
    if (percentage < 40) {
      emoji = "😅";
      message = "Oeps! Tijd om Marion beter te leren kennen!";
    } else if (percentage < 70) {
      emoji = "💪";
      message = "Niet slecht! Je kent Marion best goed!";
    }

    return (
      <QuizScreenShell>
        <Card className="w-full max-w-md border border-border bg-card/95 text-center shadow-xl ring-1 ring-black/[0.04] backdrop-blur-sm">
          <CardHeader className="gap-2">
            <div className="text-6xl" aria-hidden>
              {emoji}
            </div>
            <h2 className="font-heading text-2xl font-extrabold text-foreground">
              {name}, jouw score:
            </h2>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div className="quiz-score-nums bg-gradient-to-br from-primary via-chart-2 to-chart-3 bg-clip-text text-6xl font-extrabold tabular-nums text-transparent">
              {score}/{questions.length}
            </div>
            <p className="max-w-[40rem] text-lg text-muted-foreground">{message}</p>
            <Button
              size="lg"
              className="mt-2 h-12 min-h-12 w-full text-base font-semibold"
              onClick={() => {
                setScreen("join");
                setName("");
                setCurrentQ(0);
                setScore(0);
                setSelectedAnswer(null);
                setShowResult(false);
              }}
            >
              Opnieuw spelen
            </Button>
          </CardContent>
        </Card>
      </QuizScreenShell>
    );
  }

  return null;
}

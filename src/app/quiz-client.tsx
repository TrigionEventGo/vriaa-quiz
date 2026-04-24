"use client";

import { useState } from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import type { QuizQuestion } from "@/lib/quiz-types";
import { cn } from "@/lib/utils";

type Screen = "join" | "waiting" | "quiz" | "results";

type Props = {
  initialQuestions: QuizQuestion[];
};

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
      <div className="flex min-h-screen flex-1 flex-col items-center justify-center gap-4 p-4">
        <p className="text-center text-muted-foreground">
          Er zijn nog geen quizvragen. Voeg vragen toe in het beheer.
        </p>
        <Link
          href="/admin"
          className={cn(
            buttonVariants({ variant: "default", size: "lg" }),
            "h-12 w-full max-w-md text-lg"
          )}
        >
          Naar beheer
        </Link>
      </div>
    );
  }

  if (screen === "join") {
    return (
      <div className="flex min-h-screen flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-md border-primary/20 text-center shadow-lg">
          <CardHeader className="pb-4">
            <div className="mb-2 text-5xl">💍</div>
            <CardTitle className="text-3xl font-bold text-primary">
              Vrijgezellenfeest
            </CardTitle>
            <p className="mt-1 text-2xl font-semibold text-foreground">Marion</p>
            <p className="mt-2 text-base text-muted-foreground">
              Hoe goed ken jij de aanstaande bruid? Doe mee met de quiz!
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Input
              placeholder="Jouw naam"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              className="h-12 text-center text-lg"
              autoFocus
            />
            <Button
              size="lg"
              className="h-12 w-full text-lg"
              onClick={handleJoin}
              disabled={name.trim().length < 1}
            >
              Doe mee!
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              <Link href="/admin" className="underline underline-offset-2">
                Beheer quizvragen
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (screen === "quiz") {
    const q = questions[currentQ];
    if (!q) return null;
    const progress =
      ((currentQ + (showResult ? 1 : 0)) / questions.length) * 100;

    return (
      <div className="flex min-h-screen flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-md border-primary/20 shadow-lg">
          <CardHeader className="pb-3">
            <div className="mb-2 flex items-center justify-between">
              <Badge variant="secondary" className="text-sm">
                Vraag {currentQ + 1}/{questions.length}
              </Badge>
              <Badge variant="outline" className="text-sm">
                {score} punten
              </Badge>
            </div>
            <Progress value={progress} className="mb-3 h-2" />
            <CardTitle className="text-xl leading-snug">{q.question}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {q.options.map((option, idx) => {
              let variant: "outline" | "default" | "secondary" | "destructive" =
                "outline";
              if (showResult) {
                if (idx === q.correct) variant = "default";
                else if (idx === selectedAnswer) variant = "destructive";
              }

              return (
                <Button
                  key={idx}
                  variant={variant}
                  size="lg"
                  className={`h-auto w-full justify-start px-4 py-3 text-left text-base ${
                    showResult && idx === q.correct
                      ? "border-green-500 bg-green-500 text-white hover:bg-green-500"
                      : ""
                  } ${
                    showResult &&
                    idx === selectedAnswer &&
                    idx !== q.correct
                      ? "border-red-300 bg-red-100 text-red-700"
                      : ""
                  }`}
                  onClick={() => handleAnswer(idx)}
                  disabled={showResult}
                >
                  {option}
                </Button>
              );
            })}

            {showResult && (
              <Button
                size="lg"
                className="mt-2 h-12 w-full text-lg"
                onClick={handleNext}
              >
                {currentQ < questions.length - 1
                  ? "Volgende vraag"
                  : "Bekijk resultaat"}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
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
      <div className="flex min-h-screen flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-md border-primary/20 text-center shadow-lg">
          <CardHeader>
            <div className="mb-2 text-6xl">{emoji}</div>
            <CardTitle className="text-2xl font-bold">
              {name}, jouw score:
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div className="text-6xl font-bold text-primary">
              {score}/{questions.length}
            </div>
            <p className="text-lg text-muted-foreground">{message}</p>
            <Button
              size="lg"
              className="mt-2 h-12 w-full text-lg"
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
      </div>
    );
  }

  return null;
}

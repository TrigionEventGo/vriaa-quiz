"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const questions = [
  {
    question: "Wat is Marions favoriete vakantiebestemming?",
    options: ["Spanje", "Italië", "Griekenland", "Frankrijk"],
    correct: 1,
  },
  {
    question: "Welk drankje bestelt Marion het liefst?",
    options: ["Prosecco", "Gin-tonic", "Witte wijn", "Aperol Spritz"],
    correct: 0,
  },
  {
    question: "Wat is Marions guilty pleasure op tv?",
    options: [
      "Love Island",
      "Married at First Sight",
      "Temptation Island",
      "The Bachelor",
    ],
    correct: 1,
  },
  {
    question: "Welk eten kan Marion niet weerstaan?",
    options: ["Sushi", "Pizza", "Pasta", "Tacos"],
    correct: 2,
  },
  {
    question: "Waar heeft Marion haar partner ontmoet?",
    options: ["Op werk", "Via vrienden", "Online", "Op vakantie"],
    correct: 0,
  },
];

type Screen = "join" | "waiting" | "quiz" | "results";

export default function Home() {
  const [screen, setScreen] = useState<Screen>("join");
  const [name, setName] = useState("");
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);

  function handleJoin() {
    if (name.trim().length < 1) return;
    setScreen("quiz");
  }

  function handleAnswer(idx: number) {
    if (showResult) return;
    setSelectedAnswer(idx);
    setShowResult(true);
    if (idx === questions[currentQ].correct) {
      setScore((s) => s + 1);
    }
  }

  function handleNext() {
    if (currentQ < questions.length - 1) {
      setCurrentQ((q) => q + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      setScreen("results");
    }
  }

  if (screen === "join") {
    return (
      <div className="flex flex-1 items-center justify-center p-4 min-h-screen">
        <Card className="w-full max-w-md text-center shadow-lg border-primary/20">
          <CardHeader className="pb-4">
            <div className="text-5xl mb-2">💍</div>
            <CardTitle className="text-3xl font-bold text-primary">
              Vrijgezellenfeest
            </CardTitle>
            <p className="text-2xl font-semibold text-foreground mt-1">
              Marion
            </p>
            <p className="text-muted-foreground text-base mt-2">
              Hoe goed ken jij de aanstaande bruid? Doe mee met de quiz!
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Input
              placeholder="Jouw naam"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              className="text-center text-lg h-12"
              autoFocus
            />
            <Button
              size="lg"
              className="w-full text-lg h-12"
              onClick={handleJoin}
              disabled={name.trim().length < 1}
            >
              Doe mee!
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (screen === "quiz") {
    const q = questions[currentQ];
    const progress = ((currentQ + (showResult ? 1 : 0)) / questions.length) * 100;

    return (
      <div className="flex flex-1 items-center justify-center p-4 min-h-screen">
        <Card className="w-full max-w-md shadow-lg border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between mb-2">
              <Badge variant="secondary" className="text-sm">
                Vraag {currentQ + 1}/{questions.length}
              </Badge>
              <Badge variant="outline" className="text-sm">
                {score} punten
              </Badge>
            </div>
            <Progress value={progress} className="h-2 mb-3" />
            <CardTitle className="text-xl leading-snug">
              {q.question}
            </CardTitle>
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
                  className={`w-full text-left justify-start text-base h-auto py-3 px-4 ${
                    showResult && idx === q.correct
                      ? "bg-green-500 text-white border-green-500 hover:bg-green-500"
                      : ""
                  } ${
                    showResult &&
                    idx === selectedAnswer &&
                    idx !== q.correct
                      ? "bg-red-100 text-red-700 border-red-300"
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
                className="w-full text-lg h-12 mt-2"
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
      <div className="flex flex-1 items-center justify-center p-4 min-h-screen">
        <Card className="w-full max-w-md text-center shadow-lg border-primary/20">
          <CardHeader>
            <div className="text-6xl mb-2">{emoji}</div>
            <CardTitle className="text-2xl font-bold">
              {name}, jouw score:
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 items-center">
            <div className="text-6xl font-bold text-primary">
              {score}/{questions.length}
            </div>
            <p className="text-lg text-muted-foreground">{message}</p>
            <Button
              size="lg"
              className="w-full text-lg h-12 mt-2"
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

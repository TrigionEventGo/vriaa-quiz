"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { QuizQuestion } from "@/lib/quiz-types";
import { cn } from "@/lib/utils";

const OPTION_TILE_BORDER = [
  "border-l-quiz-tile-a",
  "border-l-quiz-tile-b",
  "border-l-quiz-tile-c",
  "border-l-quiz-tile-d",
] as const;

type LocalRow = QuizQuestion & { localId: string };

function newLocalId(): string {
  return crypto.randomUUID();
}

function emptyRow(): LocalRow {
  return {
    localId: newLocalId(),
    question: "",
    options: ["", "", "", ""],
    correct: 0,
  };
}

function toRows(questions: QuizQuestion[]): LocalRow[] {
  return questions.map((q) => ({ ...q, localId: newLocalId() }));
}

function fromRows(rows: LocalRow[]): QuizQuestion[] {
  return rows.map(
    (row): QuizQuestion => ({
      question: row.question,
      options: row.options,
      correct: row.correct,
    })
  );
}

export type AdminQuizClientProps = {
  initialQuestions: QuizQuestion[];
};

export function AdminQuizClient({ initialQuestions }: AdminQuizClientProps) {
  const router = useRouter();
  const [items, setItems] = useState<LocalRow[]>(() =>
    initialQuestions.length ? toRows(initialQuestions) : [emptyRow()]
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [liveBusy, setLiveBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/quiz-questions", {
        cache: "no-store",
        credentials: "include",
      });
      if (!res.ok) {
        setLoadError(`Laden mislukt (${res.status})`);
        return;
      }
      const data = (await res.json()) as QuizQuestion[];
      setItems(data.length ? toRows(data) : [emptyRow()]);
    } catch {
      setLoadError("Netwerkfout bij laden.");
    } finally {
      setLoading(false);
    }
  }, []);

  async function save() {
    setSaving(true);
    setSaveError(null);
    setSaveOk(null);
    try {
      const res = await fetch("/api/quiz-questions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(fromRows(items)),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        count?: number;
      };
      if (!res.ok) {
        setSaveError(body.error ?? `Opslaan mislukt (${res.status})`);
        return;
      }
      setSaveOk(`Opgeslagen (${body.count ?? items.length} vragen).`);
    } catch {
      setSaveError("Netwerkfout bij opslaan.");
    } finally {
      setSaving(false);
    }
  }

  async function startLiveSession() {
    setLiveBusy(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/live/sessions", {
        method: "POST",
        credentials: "include",
      });
      const body = (await res.json().catch(() => ({}))) as {
        code?: string;
        hostPath?: string;
        error?: string;
      };
      if (!res.ok) {
        setSaveError(body.error ?? `Live sessie starten mislukt (${res.status})`);
        return;
      }
      if (body.hostPath) router.push(body.hostPath);
    } catch {
      setSaveError("Netwerkfout bij live sessie.");
    } finally {
      setLiveBusy(false);
    }
  }

  async function logout() {
    try {
      await fetch("/api/admin-session", { method: "DELETE", credentials: "include" });
    } finally {
      router.push("/admin/login");
      router.refresh();
    }
  }

  function updateRow(localId: string, next: QuizQuestion) {
    setItems((prev) =>
      prev.map((row) =>
        row.localId === localId ? { ...next, localId: row.localId } : row
      )
    );
  }

  function addQuestion() {
    setItems((prev) => [...prev, emptyRow()]);
  }

  function removeRow(localId: string) {
    setItems((prev) => prev.filter((row) => row.localId !== localId));
  }

  function move(localId: string, dir: -1 | 1) {
    setItems((prev) => {
      const index = prev.findIndex((r) => r.localId === localId);
      const j = index + dir;
      if (index < 0 || j < 0 || j >= prev.length) return prev;
      const copy = [...prev];
      [copy[index], copy[j]] = [copy[j], copy[index]];
      return copy;
    });
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-4 px-[max(1rem,env(safe-area-inset-left))] pb-[max(1.5rem,env(safe-area-inset-bottom))] pr-[max(1rem,env(safe-area-inset-right))] pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-heading text-2xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-primary via-chart-2 to-chart-3 bg-clip-text text-transparent">
              Quiz beheer
            </span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Bewerk vragen en antwoorden. Opslaan schrijft naar{" "}
            <code className="rounded-md border border-white/10 bg-muted/80 px-1.5 py-0.5 text-xs text-foreground">
              data/quiz-questions.json
            </code>{" "}
            op de server.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "min-h-9 border-white/15 bg-card/50"
            )}
          >
            Naar quiz
          </Link>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="min-h-9"
            disabled={liveBusy}
            onClick={() => void startLiveSession()}
          >
            {liveBusy ? "Starten…" : "Live sessie (host)"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-9 border-white/15"
            onClick={() => void logout()}
          >
            Uitloggen
          </Button>
        </div>
      </div>

      {loadError && (
        <p className="text-sm text-destructive">{loadError}</p>
      )}

      {items.map((q, index) => (
        <Card
          key={q.localId}
          className="border border-white/10 bg-card/90 shadow-md ring-1 ring-white/5"
        >
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Vraag {index + 1}</Badge>
            </div>
            <div className="flex flex-wrap gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => move(q.localId, -1)}
                disabled={index === 0}
              >
                Omhoog
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => move(q.localId, 1)}
                disabled={index === items.length - 1}
              >
                Omlaag
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => removeRow(q.localId)}
                disabled={items.length <= 1}
              >
                Verwijderen
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <label className="text-sm font-medium text-foreground">
              Vraag
              <textarea
                className={cn(
                  "mt-1 flex min-h-[4.5rem] w-full rounded-lg border border-white/15 bg-input/30 px-2.5 py-2 text-base outline-none transition-colors",
                  "placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                )}
                value={q.question}
                onChange={(e) =>
                  updateRow(q.localId, { ...q, question: e.target.value })
                }
                rows={3}
              />
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              {q.options.map((opt, optIdx) => (
                <label
                  key={optIdx}
                  className={cn(
                    "text-sm font-medium",
                    "rounded-lg border border-white/10 bg-card/40 pl-2",
                    OPTION_TILE_BORDER[optIdx] ?? "border-l-muted",
                    "border-l-4"
                  )}
                >
                  <span className="pl-1 text-muted-foreground">
                    Antwoord {optIdx + 1} ({String.fromCharCode(65 + optIdx)})
                  </span>
                  <Input
                    className="mt-1 border-0 bg-transparent pl-1 text-base focus-visible:ring-0"
                    value={opt}
                    onChange={(e) => {
                      const options = [...q.options];
                      options[optIdx] = e.target.value;
                      let correct = q.correct;
                      if (correct >= options.length) correct = options.length - 1;
                      updateRow(q.localId, { ...q, options, correct });
                    }}
                  />
                </label>
              ))}
            </div>
            <label className="text-sm font-medium">
              Juiste antwoord
              <select
                className={cn(
                  "mt-1 flex h-10 min-h-10 w-full rounded-lg border border-white/15 bg-input/30 px-2.5 text-base outline-none",
                  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                )}
                value={q.correct}
                onChange={(e) =>
                  updateRow(q.localId, {
                    ...q,
                    correct: Number.parseInt(e.target.value, 10),
                  })
                }
              >
                {q.options.map((_, optIdx) => (
                  <option key={optIdx} value={optIdx}>
                    Antwoord {optIdx + 1}
                  </option>
                ))}
              </select>
            </label>
          </CardContent>
        </Card>
      ))}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          className="min-h-9"
          onClick={addQuestion}
        >
          Nieuwe vraag
        </Button>
        <Button
          type="button"
          className="min-h-9 font-semibold shadow-md shadow-primary/15"
          onClick={() => void save()}
          disabled={saving}
        >
          {saving ? "Opslaan…" : "Alles opslaan"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-9 border-white/15"
          onClick={() => void load()}
          disabled={loading}
        >
          {loading ? "Laden…" : "Herladen"}
        </Button>
      </div>

      {saveError && (
        <p className="text-sm text-destructive">{saveError}</p>
      )}
      {saveOk && (
        <p className="text-sm font-medium text-quiz-correct">{saveOk}</p>
      )}
    </div>
  );
}

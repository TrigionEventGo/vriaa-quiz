"use client";

import { useCallback, useState } from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { QuizQuestion } from "@/lib/quiz-types";
import { cn } from "@/lib/utils";

const TOKEN_KEY = "vriaa-quiz-admin-token";

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
  const [items, setItems] = useState<LocalRow[]>(() =>
    initialQuestions.length ? toRows(initialQuestions) : [emptyRow()]
  );
  const [token, setToken] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/quiz-questions", { cache: "no-store" });
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

  function persistToken(next: string) {
    setToken(next);
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(TOKEN_KEY, next);
    }
  }

  async function save() {
    setSaving(true);
    setSaveError(null);
    setSaveOk(null);
    try {
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token.trim()) headers["x-quiz-admin-token"] = token.trim();
      const res = await fetch("/api/quiz-questions", {
        method: "PUT",
        headers,
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
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 p-4 pb-24">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-primary">Quiz beheer</h1>
          <p className="text-sm text-muted-foreground">
            Bewerk vragen en antwoorden. Opslaan schrijft naar{" "}
            <code className="rounded bg-muted px-1">data/quiz-questions.json</code>{" "}
            op de server.
          </p>
        </div>
        <Link
          href="/"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Naar quiz
        </Link>
      </div>

      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Beveiliging (optioneel)</CardTitle>
          <p className="text-sm text-muted-foreground">
            Zet <code className="rounded bg-muted px-1">QUIZ_ADMIN_TOKEN</code> in
            de omgeving om opslaan te beveiligen. Vul dezelfde waarde hier in; bij
            wijziging wordt die in{" "}
            <code className="rounded bg-muted px-1">sessionStorage</code> bewaard.
          </p>
        </CardHeader>
        <CardContent>
          <Input
            type="password"
            autoComplete="off"
            placeholder="Admin-token (indien geconfigureerd)"
            value={token}
            onChange={(e) => persistToken(e.target.value)}
          />
        </CardContent>
      </Card>

      {loadError && (
        <p className="text-sm text-destructive">{loadError}</p>
      )}

      {items.map((q, index) => (
        <Card key={q.localId} className="border-primary/15">
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
                  "mt-1 flex min-h-[4.5rem] w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base outline-none transition-colors",
                  "placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
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
                <label key={optIdx} className="text-sm font-medium">
                  <span className="text-muted-foreground">Antwoord {optIdx + 1}</span>
                  <Input
                    className="mt-1"
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
                  "mt-1 flex h-10 w-full rounded-lg border border-input bg-transparent px-2.5 text-base outline-none md:text-sm",
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
        <Button type="button" variant="secondary" onClick={addQuestion}>
          Nieuwe vraag
        </Button>
        <Button type="button" onClick={() => void save()} disabled={saving}>
          {saving ? "Opslaan…" : "Alles opslaan"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => void load()}
          disabled={loading}
        >
          {loading ? "Laden…" : "Herladen"}
        </Button>
      </div>

      {saveError && (
        <p className="text-sm text-destructive">{saveError}</p>
      )}
      {saveOk && <p className="text-sm text-green-700">{saveOk}</p>}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type SessionDto = {
  code: string;
  questionIndex: number;
  totalQuestions: number;
  updatedAt: number;
};

export function HostControl({ code }: { code: string }) {
  const [state, setState] = useState<SessionDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/live/sessions/${encodeURIComponent(code)}`, {
        cache: "no-store",
      });
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
    void refresh();
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
      const body = (await res.json().catch(() => ({}))) as SessionDto & {
        error?: string;
      };
      if (!res.ok) {
        setError(body.error ?? `Actie mislukt (${res.status})`);
        return;
      }
      setState(body);
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
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => void patch("prev")}>
                  Vorige
                </Button>
                <Button type="button" onClick={() => void patch("next")}>
                  Volgende
                </Button>
                <Button type="button" variant="secondary" onClick={() => void refresh()}>
                  Vernieuwen
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

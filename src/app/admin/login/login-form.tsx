"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "/admin";

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? `Inloggen mislukt (${res.status})`);
        return;
      }
      router.replace(from.startsWith("/admin") ? from : "/admin");
      router.refresh();
    } catch {
      setError("Netwerkfout.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md border border-white/10 bg-card/95 shadow-xl ring-1 ring-white/5">
        <CardHeader>
          <CardTitle className="font-heading text-2xl">Quiz beheer — inloggen</CardTitle>
          <p className="text-sm text-muted-foreground">
            Voer hetzelfde wachtwoord in als{" "}
            <code className="rounded bg-muted px-1">QUIZ_ADMIN_TOKEN</code> op de server.
          </p>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={onSubmit}>
            <Input
              type="password"
              autoComplete="current-password"
              placeholder="Wachtwoord"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 min-h-12 border-white/15 bg-input/40 text-base"
              autoFocus
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" size="lg" className="h-12 font-semibold" disabled={busy}>
              {busy ? "Bezig…" : "Ga verder"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

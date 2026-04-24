"use client";

import { useEffect, useRef } from "react";

export type LiveStreamWire = "ok" | "reconnecting";

type Pulse = {
  updatedAt?: number;
  questionIndex?: number;
  questionEndsAt?: number;
  sessionFinished?: boolean;
};

/**
 * Subscribes to `/api/live/sessions/[code]/events` with manual reconnect + backoff
 * (browser EventSource does not read `retry:` from our stream).
 */
export function useLiveSessionSse(
  code: string | null,
  onPulse: () => void,
  opts?: { onWire?: (w: LiveStreamWire) => void }
): void {
  const pulseRef = useRef(onPulse);
  pulseRef.current = onPulse;
  const wireRef = useRef(opts?.onWire);
  wireRef.current = opts?.onWire;

  useEffect(() => {
    if (!code?.trim()) return;
    const codeKey = code.trim().toUpperCase();
    let disposed = false;
    let attempt = 0;
    let es: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    function open() {
      if (disposed) return;
      es?.close();
      es = new EventSource(
        `/api/live/sessions/${encodeURIComponent(codeKey)}/events`
      );
      let lastSig = "";

      es.onopen = () => {
        attempt = 0;
        wireRef.current?.("ok");
      };

      es.onmessage = (ev) => {
        try {
          const p = JSON.parse(ev.data) as Pulse;
          const sig = `${p.updatedAt}:${p.questionIndex}:${p.questionEndsAt}:${p.sessionFinished}`;
          if (sig !== lastSig) {
            lastSig = sig;
            pulseRef.current();
          }
        } catch {
          pulseRef.current();
        }
      };

      es.addEventListener("end", () => {
        es?.close();
        es = null;
      });

      es.onerror = () => {
        if (disposed) return;
        es?.close();
        es = null;
        wireRef.current?.("reconnecting");
        if (retryTimer) clearTimeout(retryTimer);
        const delay = Math.min(30_000, 800 * 2 ** Math.min(attempt, 5));
        attempt += 1;
        retryTimer = setTimeout(open, delay);
      };
    }

    open();
    return () => {
      disposed = true;
      if (retryTimer) clearTimeout(retryTimer);
      es?.close();
    };
  }, [code]);
}

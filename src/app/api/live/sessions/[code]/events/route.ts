import { getLiveSession } from "@/lib/live-session";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ code: string }> };

/**
 * Server-Sent Events: compact pulses when the live session changes.
 * Clients should refetch their full view (`GET ...?playerId=` or `?leaderboard=1`).
 */
export async function GET(request: Request, context: RouteContext) {
  const { code } = await context.params;
  const key = code.trim().toUpperCase();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let lastSig = "";
      try {
        while (!request.signal.aborted) {
          const session = getLiveSession(key);
          if (!session) {
            controller.enqueue(
              encoder.encode(`event: end\ndata: ${JSON.stringify({ error: "Session ended" })}\n\n`)
            );
            break;
          }
          const now = Date.now();
          const sig = `${session.updatedAt}:${session.questionIndex}:${session.questionEndsAt}:${session.sessionFinished}`;
          if (sig !== lastSig) {
            lastSig = sig;
            const payload = JSON.stringify({
              updatedAt: session.updatedAt,
              questionIndex: session.questionIndex,
              questionEndsAt: session.questionEndsAt,
              sessionFinished: session.sessionFinished,
              timerLocked: now >= session.questionEndsAt,
            });
            controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
          }
          await new Promise<void>((resolve) => setTimeout(resolve, 400));
        }
      } catch {
        controller.enqueue(
          encoder.encode(`event: end\ndata: ${JSON.stringify({ error: "stream_error" })}\n\n`)
        );
      } finally {
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

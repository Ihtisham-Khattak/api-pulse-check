import { json } from '@/lib/server/http';
import { isRunId } from '@/lib/server/paths';
import { readMeta } from '@/lib/server/results';
import { snapshotOf, subscribe } from '@/lib/server/runner';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

// Server-Sent Events: one "snapshot" with everything so far, then "sample",
// "log" and finally "done". A page reload simply reconnects and gets a new snapshot.
export async function GET(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!isRunId(id)) return json({ error: 'That is not a valid run id.' }, 400);

  const enc = new TextEncoder();
  const snapshot = snapshotOf(id);
  let cleanup = () => {};

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        try { controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)); } catch { /* client went away */ }
      };

      if (!snapshot) {
        send('done', { meta: readMeta(id) });
        controller.close();
        return;
      }

      send('snapshot', snapshot);
      const unsubscribe = subscribe(id, (event) => {
        if (event.type === 'sample') send('sample', { sample: event.sample, totals: event.totals });
        else if (event.type === 'log') send('log', { line: event.line });
        else {
          send('done', { meta: event.meta });
          cleanup();
          try { controller.close(); } catch { /* already closed */ }
        }
      });
      const heartbeat = setInterval(() => {
        try { controller.enqueue(enc.encode(': ping\n\n')); } catch { /* client went away */ }
      }, 15000);

      cleanup = () => {
        clearInterval(heartbeat);
        if (unsubscribe) unsubscribe();
      };
      req.signal.addEventListener('abort', () => {
        cleanup();
        try { controller.close(); } catch { /* already closed */ }
      });
    },
    cancel() {
      cleanup();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no'
    }
  });
}

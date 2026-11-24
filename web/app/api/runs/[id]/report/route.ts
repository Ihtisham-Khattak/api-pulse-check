import fs from 'node:fs';
import path from 'node:path';
import { json } from '@/lib/server/http';
import { isRunId, runDir } from '@/lib/server/paths';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ?type=html (default) opens the k6 HTML report. ?type=json downloads the raw summary.
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!isRunId(id)) return json({ error: 'That is not a valid run id.' }, 400);
  const type = new URL(req.url).searchParams.get('type') === 'json' ? 'json' : 'html';
  const file = path.join(runDir(id), type === 'json' ? 'summary.json' : 'report.html');
  if (!fs.existsSync(file)) return json({ error: 'No report is available for this run.' }, 404);

  const body = fs.readFileSync(file);
  return new Response(body, {
    headers: type === 'json'
      ? { 'Content-Type': 'application/json', 'Content-Disposition': `attachment; filename="pulsecheck-${id}.json"` }
      : { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

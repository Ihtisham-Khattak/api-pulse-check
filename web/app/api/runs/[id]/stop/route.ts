import { guard, HttpError, json } from '@/lib/server/http';
import { isRunId } from '@/lib/server/paths';
import { stopRun } from '@/lib/server/runner';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  return guard(async () => {
    const { id } = await ctx.params;
    if (!isRunId(id)) throw new HttpError(400, 'That is not a valid run id.');
    stopRun(id);
    return json({ ok: true });
  });
}

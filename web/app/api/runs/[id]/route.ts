import { guard, HttpError, json } from '@/lib/server/http';
import { isRunId } from '@/lib/server/paths';
import { deleteRun, loadRunResult, markStale } from '@/lib/server/results';
import { getActiveId, snapshotOf } from '@/lib/server/runner';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export function GET(_req: Request, ctx: Ctx) {
  return guard(async () => {
    const { id } = await ctx.params;
    if (!isRunId(id)) throw new HttpError(400, 'That is not a valid run id.');
    const result = loadRunResult(id);
    if (!result) throw new HttpError(404, 'That run was not found. It may have been deleted.');
    markStale(result.meta, getActiveId());
    const live = snapshotOf(id);
    if (live) result.series = live.series;
    return json(result);
  });
}

export function DELETE(_req: Request, ctx: Ctx) {
  return guard(async () => {
    const { id } = await ctx.params;
    if (!isRunId(id)) throw new HttpError(400, 'That is not a valid run id.');
    if (getActiveId() === id) throw new HttpError(409, 'Stop the test before deleting it.');
    if (!deleteRun(id)) throw new HttpError(404, 'That run was not found.');
    return json({ ok: true });
  });
}

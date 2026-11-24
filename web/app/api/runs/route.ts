import { guard, HttpError, json } from '@/lib/server/http';
import { listHistory, startRun } from '@/lib/server/runner';
import { validateRunRequest } from '@/lib/validate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 3_000_000;

export function GET() {
  return guard(() => json({ runs: listHistory() }));
}

export function POST(req: Request) {
  return guard(async () => {
    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) throw new HttpError(413, 'The test configuration is too large.');
    let input: unknown;
    try {
      input = JSON.parse(raw);
    } catch {
      throw new HttpError(400, 'The request was not valid JSON.');
    }
    const result = validateRunRequest(input);
    if (!result.ok) throw new HttpError(400, 'Please fix the highlighted problems.', { code: 'invalid', details: result.errors });
    return json(startRun(result.value), 201);
  });
}

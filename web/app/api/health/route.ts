import { json } from '@/lib/server/http';
import { getHealth } from '@/lib/server/runner';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET() {
  return json(getHealth());
}

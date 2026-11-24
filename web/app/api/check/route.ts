import { guard, HttpError, json } from '@/lib/server/http';
import { probe } from '@/lib/server/probe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function POST(req: Request) {
  return guard(async () => {
    let body: { baseUrl?: unknown };
    try {
      body = await req.json();
    } catch {
      throw new HttpError(400, 'The request was not valid JSON.');
    }
    let url: URL;
    try {
      url = new URL(typeof body.baseUrl === 'string' ? body.baseUrl.trim() : '');
    } catch {
      throw new HttpError(400, 'That is not a full address. Example: http://localhost:8080');
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new HttpError(400, 'The address must start with http:// or https://');
    if (url.username || url.password) throw new HttpError(400, 'Do not put a username or password in the address.');
    return json(await probe(url.origin + url.pathname));
  });
}

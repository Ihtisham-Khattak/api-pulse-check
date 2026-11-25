export class HttpError extends Error {
  status: number;
  code?: string;
  details?: string[];

  constructor(status: number, message: string, opts: { code?: string; details?: string[] } = {}) {
    super(message);
    this.status = status;
    this.code = opts.code;
    this.details = opts.details;
  }
}

export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

/** Wrap a route handler so thrown HttpErrors become clean JSON responses. */
export async function guard(fn: () => Promise<Response> | Response): Promise<Response> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message, code: e.code, details: e.details }, e.status);
    console.error('[pulsar] unexpected error', e);
    return json({ error: 'Something went wrong on the server.' }, 500);
  }
}

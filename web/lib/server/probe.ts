// "Test connection": one quick GET to the address the user typed, so they can see
// what is really answering there before they run a test.
import type { ProbeResult } from '../types';

const TIMEOUT_MS = 4000;

function hostOf(url: URL): string {
  return url.host;
}

export async function probe(baseUrl: string): Promise<ProbeResult> {
  const url = new URL(baseUrl);
  const started = Date.now();
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'manual',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });
    void res.body?.cancel();
    const ms = Date.now() - started;
    const contentType = (res.headers.get('content-type') ?? '').split(';')[0].trim() || undefined;
    const server = res.headers.get('server') ?? undefined;
    const base = { reachable: true, status: res.status, contentType, server, ms };
    const who = server ? ` It identifies itself as "${server}".` : '';

    if (res.status >= 500) {
      return { ...base, kind: 'error', message: `Reached ${hostOf(url)}, but it answered HTTP ${res.status} (a server error).${who}` };
    }
    if (res.status >= 300 && res.status < 400) {
      const where = res.headers.get('location');
      return { ...base, kind: 'warn', message: `Reached ${hostOf(url)}, but it redirects${where ? ` to ${where}` : ''} (HTTP ${res.status}). Use the final address if that is your API.${who}` };
    }
    if (res.status === 401 || res.status === 403) {
      return { ...base, kind: 'warn', message: `Reached ${hostOf(url)}, but it answered HTTP ${res.status} ${res.status === 401 ? 'Unauthorized' : 'Forbidden'}. Check this is the right application, and add authentication if your API needs it.${who}` };
    }
    if (contentType && /html/i.test(contentType) && res.status < 400) {
      return { ...base, kind: 'warn', message: `Reached ${hostOf(url)} (HTTP ${res.status}), but it answered with a web page, not JSON. If this should be an API, double check the address.${who}` };
    }
    if (res.status === 404) {
      return { ...base, kind: 'ok', message: `Reached ${hostOf(url)} in ${ms} ms. The root path returned 404, which is normal for many APIs. Your request paths are added to this address.${who}` };
    }
    return { ...base, kind: 'ok', message: `Reached ${hostOf(url)} in ${ms} ms (HTTP ${res.status}${contentType ? `, ${contentType}` : ''}).${who}` };
  } catch (e) {
    const ms = Date.now() - started;
    const err = e as Error & { cause?: { code?: string } };
    const code = err.cause?.code;
    let message: string;
    if (err.name === 'TimeoutError' || code === 'UND_ERR_CONNECT_TIMEOUT') {
      message = `No answer from ${hostOf(url)} within ${TIMEOUT_MS / 1000} seconds. Is the site running, and is the address right?`;
    } else if (code === 'ECONNREFUSED') {
      message = `Nothing is listening at ${hostOf(url)} (connection refused). Start your site first, or check the port number.`;
    } else if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
      message = `The host name "${url.hostname}" could not be found. Check the spelling.`;
    } else if (code === 'ECONNRESET') {
      message = `${hostOf(url)} closed the connection. If it uses https, check the certificate; if not, check the port.`;
    } else {
      message = `Could not connect to ${hostOf(url)}${code ? ` (${code})` : ''}.`;
    }
    return { kind: 'error', reachable: false, ms, message };
  }
}

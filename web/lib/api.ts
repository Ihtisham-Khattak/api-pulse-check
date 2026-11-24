import type { HealthInfo, ProbeResult, RunMeta, RunRequest, RunResult } from './types';

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: string[];

  constructor(status: number, message: string, code?: string, details?: string[]) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { cache: 'no-store', ...init });
  } catch {
    throw new ApiError(0, 'Could not reach the PulseCheck server. Is it still running?');
  }
  const data = (await res.json().catch(() => null)) as (T & { error?: string; code?: string; details?: string[] }) | null;
  if (!res.ok) throw new ApiError(res.status, data?.error ?? `Request failed (${res.status})`, data?.code, data?.details);
  return data as T;
}

const post = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
});

export const api = {
  check: (baseUrl: string) => request<ProbeResult>('/api/check', post({ baseUrl })),
  health: () => request<HealthInfo>('/api/health'),
  runs: () => request<{ runs: RunMeta[] }>('/api/runs').then((r) => r.runs),
  run: (id: string) => request<RunResult>(`/api/runs/${id}`),
  start: (req: RunRequest) => request<{ id: string }>('/api/runs', post(req)),
  stop: (id: string) => request<{ ok: true }>(`/api/runs/${id}/stop`, { method: 'POST' }),
  remove: (id: string) => request<{ ok: true }>(`/api/runs/${id}`, { method: 'DELETE' })
};

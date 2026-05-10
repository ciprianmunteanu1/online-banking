const BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:3000';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly data: unknown,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiFetch<T>(
  path: string,
  opts: {
    method?: string;
    token?: string;
    idempotencyKey?: string;
    body?: unknown;
  } = {},
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (opts.token) headers['Authorization'] = `Bearer ${opts.token}`;
  if (opts.idempotencyKey) headers['x-idempotency-key'] = opts.idempotencyKey;

  const res = await fetch(`${BASE}${path}`, {
    method: opts.method ?? 'GET',
    headers,
    credentials: 'include',
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  let data: unknown;
  try { data = await res.json(); } catch { data = null; }

  if (!res.ok) {
    const raw = data as Record<string, unknown> | null;
    const msg = Array.isArray(raw?.message)
      ? (raw!.message as string[]).join(', ')
      : typeof raw?.message === 'string'
        ? raw.message
        : `HTTP ${res.status}`;
    throw new ApiError(res.status, data, msg);
  }
  return data as T;
}

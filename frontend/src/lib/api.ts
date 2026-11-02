
import { supabase } from './supabase';

// Alamat backend FastAPI
const BASE_URL = 'http://192.168.0.17:8000';

export async function api<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const text = await res.text();

  let body: any = null;

  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }

  if (!res.ok) {
    const d = body?.detail;

    const message =
      typeof d === 'string'
        ? d
        : Array.isArray(d)
          ? d.map((x: any) => x.msg).join(', ')
          : `Terjadi kesalahan (${res.status})`;

    throw new Error(message);
  }

  return body as T;
}

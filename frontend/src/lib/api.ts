
import { supabase } from './supabase';

// Alamat backend FastAPI
const BASE_URL = 'http://192.168.0.142:8000';

export async function api<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const isFormData = options.body instanceof FormData;
  const customHeaders: any = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  // HANYA gunakan application/json jika data BUKAN FormData
  if (!isFormData) {
    customHeaders['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: customHeaders,
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

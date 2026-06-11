import { getToken, clearToken } from './auth';

const defaultHeaders = { 'Content-Type': 'application/json' };

export async function fetchJson(url, options = {}) {
  const opts = {
    headers: {
      ...defaultHeaders,
      ...(options.headers || {}),
    },
    ...options,
  };

  const token = getToken();
  if (token) {
    opts.headers = {
      ...opts.headers,
      Authorization: `Bearer ${token}`,
    };
  }

  const res = await fetch(url, opts);
  if (!res.ok) {
    // If 401 and we had a token, another session logged in — force logout
    if (res.status === 401 && token) {
      clearToken();
      window.location.href = '/login';
      return;
    }
    const text = await res.text();
    throw new Error(`Request failed (${res.status}): ${text || res.statusText}`);
  }
  // Attempt JSON parse; fall back to text
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return res.json();
  }
  return res.text();
}

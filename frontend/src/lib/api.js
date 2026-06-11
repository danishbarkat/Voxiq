import { getToken, forceLogout } from './auth';

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
    if (res.status === 401 && token) {
      const text = await res.text();
      forceLogout(text || 'Your session expired. Please sign in again.');
      return;
    }
    const text = await res.text();
    throw new Error(`Request failed (${res.status}): ${text || res.statusText}`);
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return res.json();
  }
  return res.text();
}

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
      if (text && text.includes('TRIAL_EXPIRED')) {
        forceLogout('Your free trial has expired. Please contact your Voxiq admin to upgrade your plan.');
      } else {
        forceLogout(text || 'Your session expired. Please sign in again.');
      }
      return;
    }
    const text = await res.text();
    let message = res.statusText || 'Something went wrong.';
    try {
      const json = JSON.parse(text);
      message = json.message || message;
    } catch { message = text || message; }
    throw new Error(message);
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return res.json();
  }
  return res.text();
}

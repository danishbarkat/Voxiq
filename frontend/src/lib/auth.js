const TOKEN_KEY = 'winfi_token';
const LOGOUT_REASON_KEY = 'voxiq_logout_reason';
const LOGIN_SYNC_KEY = 'voxiq_login_sync';
const LOGOUT_SYNC_KEY = 'voxiq_logout_sync';

const storage = typeof window !== 'undefined' ? window.sessionStorage : null;
const local = typeof window !== 'undefined' ? window.localStorage : null;

export const getToken = () =>
  (storage?.getItem(TOKEN_KEY) || local?.getItem(TOKEN_KEY) || null);

export const setToken = (token) => {
  if (!token) return;
  clearLogoutReason();
  storage?.setItem(TOKEN_KEY, token);
  local?.removeItem(TOKEN_KEY);
  local?.setItem(
    LOGIN_SYNC_KEY,
    JSON.stringify({ at: Date.now(), nonce: Math.random().toString(36).slice(2) }),
  );
};

export const setLogoutReason = (reason) => {
  if (!reason) return;
  local?.setItem(LOGOUT_REASON_KEY, reason);
};

export const getLogoutReason = () => local?.getItem(LOGOUT_REASON_KEY) || null;

export const clearLogoutReason = () => local?.removeItem(LOGOUT_REASON_KEY);

export const clearToken = () => {
  storage?.removeItem(TOKEN_KEY);
  local?.removeItem(TOKEN_KEY);
};

export const forceLogout = (
  reason = 'You have been logged out from this tab or device because this account signed in from another browser or device.',
  options = {},
) => {
  const { broadcast = true, redirect = true } = options;
  clearToken();
  setLogoutReason(reason);
  if (broadcast) {
    local?.setItem(
      LOGOUT_SYNC_KEY,
      JSON.stringify({ at: Date.now(), reason, nonce: Math.random().toString(36).slice(2) }),
    );
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('voxiq:forced-logout', { detail: { reason } }));
    if (redirect && window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }
};

export { LOGIN_SYNC_KEY, LOGOUT_SYNC_KEY };

const TOKEN_KEY = 'winfi_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY) || null;

export const setToken = (token) => {
  if (token) localStorage.setItem(TOKEN_KEY, token);
};

export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

const isProd = import.meta.env.PROD;
const API_URL = isProd ? '/api' : `${import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api`;
const WS_URL = isProd ? window.location.origin : (import.meta.env.VITE_WS_URL || 'http://localhost:3001');

// SIP credentials must come from the authenticated user profile (backend), never from env vars
const SIP_URI = '';
const SIP_PASSWORD = '';

export { API_URL, WS_URL, SIP_URI, SIP_PASSWORD };

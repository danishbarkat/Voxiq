const isProd = import.meta.env.PROD;
const API_URL = isProd ? '/api' : `${import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api`;
const WS_URL = isProd ? window.location.origin : (import.meta.env.VITE_WS_URL || 'http://localhost:3001');

const SIP_URI = import.meta.env.VITE_TELNYX_SIP_URI || '';
const SIP_PASSWORD = import.meta.env.VITE_TELNYX_SIP_PASSWORD || '';

const DEFAULT_OUTBOUND_NUMBER = import.meta.env.VITE_DEFAULT_OUTBOUND_NUMBER || '+14422039259';

export { API_URL, WS_URL, SIP_URI, SIP_PASSWORD, DEFAULT_OUTBOUND_NUMBER };

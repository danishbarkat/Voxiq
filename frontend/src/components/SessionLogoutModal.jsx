import { useEffect, useState } from 'react';
import { clearLogoutReason, getLogoutReason } from '../lib/auth';

export default function SessionLogoutModal() {
  const [reason, setReason] = useState(() => getLogoutReason());

  useEffect(() => {
    const syncReason = () => setReason(getLogoutReason());
    const onForcedLogout = (event) => {
      setReason(event.detail?.reason || getLogoutReason());
    };

    window.addEventListener('storage', syncReason);
    window.addEventListener('voxiq:forced-logout', onForcedLogout);
    return () => {
      window.removeEventListener('storage', syncReason);
      window.removeEventListener('voxiq:forced-logout', onForcedLogout);
    };
  }, []);

  if (!reason) return null;

  return (
    <div className="session-logout-backdrop" role="dialog" aria-modal="true" aria-labelledby="session-logout-title">
      <div className="session-logout-modal">
        <div className="session-logout-badge">Session Ended</div>
        <h2 id="session-logout-title">You have been logged out</h2>
        <p>{reason}</p>
        <button
          type="button"
          className="auth-btn-primary"
          onClick={() => {
            clearLogoutReason();
            setReason(null);
          }}
        >
          OK
        </button>
      </div>
    </div>
  );
}

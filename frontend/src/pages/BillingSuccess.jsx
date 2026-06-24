import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

export default function BillingSuccess() {
  const [searchParams] = useSearchParams();
  const plan     = searchParams.get('plan')    || 'your plan';
  const seats    = searchParams.get('seats')   || '1';
  const isNewUser = searchParams.get('newuser') === 'true';
  const [countdown, setCountdown] = useState(isNewUser ? null : 8);

  useEffect(() => {
    if (isNewUser || countdown === null) return;
    const t = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(t); window.location.href = '/admin'; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [isNewUser, countdown]);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Inter, system-ui, sans-serif', padding: '24px',
    }}>
      <div style={{
        background: '#fff', borderRadius: '24px', padding: '48px 40px',
        maxWidth: '480px', width: '100%', textAlign: 'center',
        boxShadow: '0 4px 32px rgba(0,0,0,0.08)',
      }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '16px' }}>🎉</div>

        <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0f172a', marginBottom: '8px' }}>
          {isNewUser ? 'Trial Started!' : 'Payment Successful!'}
        </h1>

        <p style={{ color: '#64748b', fontSize: '1rem', marginBottom: '8px' }}>
          Your <strong>{plan}</strong> plan ({seats} seat{Number(seats) > 1 ? 's' : ''}) is now active.
        </p>

        <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '32px' }}>
          {isNewUser
            ? 'Your 7-day free trial has started. You will not be charged until day 8. Log in below to access your dashboard.'
            : 'Your account has been upgraded automatically. All features are now unlocked.'}
        </p>

        <div style={{ background: '#f0fdf4', borderRadius: '12px', padding: '16px', marginBottom: '28px' }}>
          {isNewUser ? (
            <p style={{ color: '#16a34a', fontWeight: 700, fontSize: '0.875rem', margin: 0 }}>
              Account activation takes ~10 seconds after payment.
            </p>
          ) : (
            <p style={{ color: '#16a34a', fontWeight: 700, fontSize: '0.875rem', margin: 0 }}>
              Redirecting to your dashboard in {countdown}s…
            </p>
          )}
        </div>

        {isNewUser ? (
          <Link
            to="/login"
            style={{
              display: 'inline-block', background: '#6366f1', color: '#fff',
              borderRadius: '12px', padding: '13px 32px', fontWeight: 700,
              fontSize: '1rem', textDecoration: 'none',
            }}
          >
            Log In to Dashboard →
          </Link>
        ) : (
          <button
            onClick={() => { window.location.href = '/admin'; }}
            style={{
              background: '#6366f1', color: '#fff', border: 'none', borderRadius: '12px',
              padding: '13px 32px', fontWeight: 700, fontSize: '1rem', cursor: 'pointer',
            }}
          >
            Go to Dashboard →
          </button>
        )}
      </div>
    </div>
  );
}

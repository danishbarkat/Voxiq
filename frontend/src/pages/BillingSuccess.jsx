import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { API_URL } from '../config/env';
import { fetchJson } from '../lib/api';

export default function BillingSuccess() {
  const [searchParams] = useSearchParams();
  const plan      = searchParams.get('plan')    || 'your plan';
  const seats     = searchParams.get('seats')   || '1';
  const isNewUser = searchParams.get('newuser') === 'true';
  const email     = searchParams.get('email')   || '';

  const [countdown, setCountdown]     = useState(isNewUser ? null : 8);
  const [otpSent, setOtpSent]         = useState(false);
  const [otpCode, setOtpCode]         = useState('');
  const [verified, setVerified]       = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [sendLoading, setSendLoading] = useState(false);

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

  const sendOtp = async () => {
    if (!email) return;
    setSendLoading(true);
    setVerifyError('');
    try {
      await fetchJson(`${API_URL}/auth/resend-verification`, {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setOtpSent(true);
    } catch (err) {
      setVerifyError(err.message || 'Could not send verification email.');
    } finally {
      setSendLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setVerifyLoading(true);
    setVerifyError('');
    try {
      await fetchJson(`${API_URL}/auth/signup/verify`, {
        method: 'POST',
        body: JSON.stringify({ email, code: otpCode }),
      });
      setVerified(true);
    } catch (err) {
      setVerifyError(err.message || 'Invalid code. Please try again.');
    } finally {
      setVerifyLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#020D1A',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Plus Jakarta Sans', sans-serif", padding: '24px',
    }}>
      <div style={{
        background: '#111929', borderRadius: '24px', padding: '48px 40px',
        maxWidth: '480px', width: '100%', textAlign: 'center',
        border: '1px solid #1e2537',
        boxShadow: '0 4px 32px rgba(0,0,0,0.4)',
      }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '16px' }}>🎉</div>

        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#F1F5F9', marginBottom: '8px' }}>
          {isNewUser ? 'Trial Started!' : 'Payment Successful!'}
        </h1>

        <p style={{ color: '#CBD5E1', fontSize: '1rem', marginBottom: '8px' }}>
          Your <strong>{plan}</strong> plan ({seats} seat{Number(seats) > 1 ? 's' : ''}) is now active.
        </p>

        <p style={{ color: '#6B9AB8', fontSize: '0.875rem', marginBottom: '32px' }}>
          {isNewUser
            ? 'Your 7-day free trial has started. You will not be charged until day 8.'
            : 'Your account has been upgraded. All features are now unlocked.'}
        </p>

        {isNewUser ? (
          verified ? (
            <>
              <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '12px', padding: '16px', marginBottom: '28px' }}>
                <p style={{ color: '#10B981', fontWeight: 700, fontSize: '0.875rem', margin: 0 }}>
                  Email verified! Your account is ready.
                </p>
              </div>
              <Link
                to="/login"
                style={{
                  display: 'inline-block', background: '#7C6DFA', color: '#fff',
                  borderRadius: '12px', padding: '13px 32px', fontWeight: 700,
                  fontSize: '1rem', textDecoration: 'none',
                }}
              >
                Log In to Dashboard →
              </Link>
            </>
          ) : otpSent ? (
            <>
              <p style={{ color: '#6B9AB8', fontSize: '0.875rem', marginBottom: '16px' }}>
                We sent a 6-digit code to <strong>{email}</strong>. Enter it below to verify your email.
              </p>
              <form onSubmit={handleVerify} style={{ textAlign: 'left' }}>
                <input
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  style={{
                    width: '100%', boxSizing: 'border-box', padding: '12px 16px',
                    borderRadius: '10px', border: '1px solid #1e2537', fontSize: '1.1rem',
                    textAlign: 'center', letterSpacing: '0.2em', marginBottom: '12px',
                    fontWeight: 700, background: '#020D1A', color: '#F1F5F9',
                  }}
                />
                {verifyError && (
                  <p style={{ color: '#EF4444', fontSize: '0.8rem', marginBottom: '10px', textAlign: 'center' }}>{verifyError}</p>
                )}
                <button
                  type="submit"
                  disabled={verifyLoading || otpCode.length < 6}
                  style={{
                    width: '100%', background: verifyLoading ? '#475569' : '#7C6DFA',
                    color: '#fff', border: 'none', borderRadius: '12px',
                    padding: '13px', fontWeight: 700, fontSize: '1rem',
                    cursor: verifyLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {verifyLoading ? 'Verifying…' : 'Verify Email →'}
                </button>
                <button
                  type="button"
                  onClick={sendOtp}
                  style={{ marginTop: '10px', width: '100%', background: 'none', border: 'none', color: '#7C6DFA', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}
                >
                  Resend code
                </button>
              </form>
            </>
          ) : (
            <>
              <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '12px', padding: '16px', marginBottom: '28px' }}>
                <p style={{ color: '#10B981', fontWeight: 700, fontSize: '0.875rem', margin: 0 }}>
                  Account activation takes ~10 seconds after payment.
                </p>
              </div>
              {verifyError && (
                <p style={{ color: '#EF4444', fontSize: '0.8rem', marginBottom: '12px' }}>{verifyError}</p>
              )}
              <button
                onClick={sendOtp}
                disabled={sendLoading || !email}
                style={{
                  width: '100%', background: sendLoading ? '#475569' : '#7C6DFA',
                  color: '#fff', border: 'none', borderRadius: '12px',
                  padding: '13px', fontWeight: 700, fontSize: '1rem',
                  cursor: sendLoading ? 'not-allowed' : 'pointer', marginBottom: '12px',
                }}
              >
                {sendLoading ? 'Sending…' : 'Verify Your Email →'}
              </button>
              <Link
                to="/login"
                style={{ display: 'block', color: '#7C6DFA', fontSize: '0.85rem', fontWeight: 600 }}
              >
                Skip for now, go to Login
              </Link>
            </>
          )
        ) : (
          <>
            <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '12px', padding: '16px', marginBottom: '28px' }}>
              <p style={{ color: '#10B981', fontWeight: 700, fontSize: '0.875rem', margin: 0 }}>
                Redirecting to your dashboard in {countdown}s…
              </p>
            </div>
            <button
              onClick={() => { window.location.href = '/admin'; }}
              style={{
                background: '#7C6DFA', color: '#fff', border: 'none', borderRadius: '12px',
                padding: '13px 32px', fontWeight: 700, fontSize: '1rem', cursor: 'pointer',
              }}
            >
              Go to Dashboard →
            </button>
          </>
        )}
      </div>
    </div>
  );
}

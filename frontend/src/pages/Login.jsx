import { useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { API_URL } from '../config/env';
import { fetchJson } from '../lib/api';
import { setToken, getLogoutReason, clearLogoutReason } from '../lib/auth';
import { useSocket } from '../context/SocketContext';

export default function Login() {
    const navigate = useNavigate();
    const { reconnect } = useSocket();
    const [email, setEmail] = useState(() => {
        try { return localStorage.getItem('voxiq_saved_email') || ''; } catch { return ''; }
    });
    const [password, setPassword] = useState(() => {
        try { return localStorage.getItem('voxiq_saved_pass') || ''; } catch { return ''; }
    });
    const [accessCode, setAccessCode] = useState('');
    const [showAccessCode, setShowAccessCode] = useState(false);
    const [mfaCode, setMfaCode] = useState('');
    const [mfaState, setMfaState] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(() => {
        try { return localStorage.getItem('voxiq_remember') === 'true'; } catch { return false; }
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [logoutNotice] = useState(() => {
        const r = getLogoutReason();
        if (r) clearLogoutReason();
        return r;
    });
    const [showForgotForm, setShowForgotForm] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotSent, setForgotSent] = useState(false);
    const [forgotLoading, setForgotLoading] = useState(false);
    const qrUrl = useMemo(() => {
        if (!mfaState?.otpauth_url) return '';
        return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(mfaState.otpauth_url)}`;
    }, [mfaState]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        // ─── UI DEV MODE BYPASS ───────────────────────────────────────────────
        // Use these credentials to skip the backend entirely for UI work:
        //   Email:    dev@voxiq.com
        //   Password: superadmin | admin | manager | agent  (pick your role)
        const DEV_ROUTES = {
            superadmin: '/superadmin',
            admin: '/admin',
            manager: '/manager',
            agent: '/agent',
        };
        if (email.trim().toLowerCase() === 'dev@voxiq.com') {
            const role = password.trim().toLowerCase();
            const route = DEV_ROUTES[role] || '/agent';
            setToken('dev-mode-fake-token');
            setTimeout(() => {
                setIsLoading(false);
                navigate(route);
            }, 400);
            return;
        }
        // ─────────────────────────────────────────────────────────────────────

        try {
            if (rememberMe) {
                localStorage.setItem('voxiq_remember', 'true');
                localStorage.setItem('voxiq_saved_email', email);
                localStorage.setItem('voxiq_saved_pass', password);
            } else {
                localStorage.removeItem('voxiq_remember');
                localStorage.removeItem('voxiq_saved_email');
                localStorage.removeItem('voxiq_saved_pass');
            }
            const data = await fetchJson(`${API_URL}/auth/login`, {
                method: 'POST',
                body: JSON.stringify({ email, password, accessCode }),
            });
            if (data.mfa_required) {
                setMfaState(data);
                setMfaCode('');
                return;
            }
            const token = data.access_token || data.accessToken;
            if (token) {
                setToken(token);
                reconnect();
                const role = data.user?.role?.toLowerCase();
                if (role === 'superadmin') navigate('/superadmin');
                else if (role === 'admin') navigate('/admin');
                else if (role === 'manager') navigate('/manager');
                else navigate('/agent');
            } else {
                setError('Login failed. Please check your credentials.');
            }
        } catch (err) {
            const msg = (err.message || '').toLowerCase();
            if (msg.includes('pending')) {
              setError('⏳ Your account is pending approval. Please wait for the Voxiq team to activate it.');
            } else if (msg.includes('access code')) {
              setError('🔐 First admin login requires the company access code shared by the Voxiq super admin.');
            } else if (msg.includes('deactivated')) {
              setError('🚫 Your account has been deactivated. Contact support.');
            } else if (msg.includes('trial_expired') || msg.includes('trial expired') || msg.includes('trial has expired')) {
              setError('⏰ Your free trial has expired. Contact your Voxiq admin to upgrade your plan.');
            } else if (msg.includes('500') || msg.includes('internal server') || msg.includes('unauthorized') || msg.includes('invalid') || msg.includes('incorrect') || msg.includes('not found')) {
              setError('Invalid email or password. Please try again.');
            } else {
              setError('Invalid email or password. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyMfa = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        try {
            const data = await fetchJson(`${API_URL}/auth/mfa/verify`, {
                method: 'POST',
                body: JSON.stringify({
                    mfaToken: mfaState?.mfa_token,
                    code: mfaCode,
                }),
            });
            const token = data.access_token || data.accessToken;
            if (!token) {
                throw new Error('MFA verification failed');
            }
            setToken(token);
            reconnect();
            const role = data.user?.role?.toLowerCase();
            if (role === 'superadmin') navigate('/superadmin');
            else if (role === 'admin') navigate('/admin');
            else if (role === 'manager') navigate('/manager');
            else navigate('/agent');
        } catch (err) {
            setError(err.message || 'Invalid authenticator code.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-left">
                    <h2>Welcome<br />Back</h2>
                    <p>Sign in to your Voxiq workspace and start dialing smarter today.</p>
                    <div className="auth-feature-list">
                        <div className="auth-feature-item">
                            <span className="auth-feature-check">✓</span>
                            Predictive AI Dialing
                        </div>
                        <div className="auth-feature-item">
                            <span className="auth-feature-check">✓</span>
                            Real-time Analytics
                        </div>
                        <div className="auth-feature-item">
                            <span className="auth-feature-check">✓</span>
                            CRM Integration
                        </div>
                    </div>
                </div>

                <div className="auth-right">
                    <div className="auth-logo-box">
                        <img src="/logo.png" alt="Voxiq" style={{ height: '44px' }} />
                    </div>
                    <h1>{mfaState ? 'Verify MFA' : 'Sign In'}</h1>
                    <p className="auth-subtitle">
                        {mfaState
                            ? 'Enter the code from your authenticator app to continue'
                            : 'Sign in with your email and password to access your workspace.'}
                    </p>

                    {logoutNotice && (
                        <div style={{
                            background: logoutNotice.toLowerCase().includes('trial') ? 'linear-gradient(135deg,#fef2f2,#fee2e2)' : '#fef3c7',
                            border: `1.5px solid ${logoutNotice.toLowerCase().includes('trial') ? '#fca5a5' : '#fcd34d'}`,
                            borderRadius: 10,
                            padding: '12px 16px',
                            marginBottom: 14,
                            fontSize: 13,
                            color: logoutNotice.toLowerCase().includes('trial') ? '#991b1b' : '#92400e',
                            fontWeight: 600,
                            lineHeight: 1.5,
                        }}>
                            {logoutNotice}
                        </div>
                    )}
                    {error && <div className="auth-error">{error}</div>}

                    {!mfaState ? (
                        <form onSubmit={handleLogin} className="auth-form">
                            <div className="auth-field">
                                <label>Email Address</label>
                                <input
                                    type="email"
                                    placeholder="name@company.com"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="auth-field">
                                <label>Password</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        required
                                        style={{ paddingRight: '2.5rem', width: '100%', boxSizing: 'border-box' }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(v => !v)}
                                        style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 0, lineHeight: 1 }}
                                        tabIndex={-1}
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    >
                                        {showPassword ? (
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                                                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                                                <line x1="1" y1="1" x2="23" y2="23"/>
                                            </svg>
                                        ) : (
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                                <circle cx="12" cy="12" r="3"/>
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {!showAccessCode ? (
                                <p style={{ fontSize: '0.82rem', color: '#6B9AB8', margin: '-0.25rem 0 0.75rem' }}>
                                    First-time admin login?{' '}
                                    <button
                                        type="button"
                                        onClick={() => setShowAccessCode(true)}
                                        style={{ background: 'none', border: 'none', color: '#7C6DFA', cursor: 'pointer', padding: 0, fontSize: 'inherit', textDecoration: 'underline' }}
                                    >
                                        Enter your company access code
                                    </button>
                                </p>
                            ) : (
                                <div className="auth-field">
                                    <label>Company Access Code <span style={{ color: '#6B9AB8', fontWeight: 400 }}>(first admin login only)</span></label>
                                    <input
                                        type="text"
                                        placeholder="Enter the code shared by Voxiq"
                                        value={accessCode}
                                        onChange={e => setAccessCode(e.target.value.toUpperCase())}
                                        autoFocus
                                    />
                                </div>
                            )}

                            <div className="auth-form-meta">
                                <label className="auth-remember">
                                    <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} /> Remember me
                                </label>
                                <button
                                    type="button"
                                    className="auth-forgot"
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 'inherit', color: '#7C6DFA', textDecoration: 'underline' }}
                                    onClick={() => { setShowForgotForm(true); setForgotSent(false); setForgotEmail(''); }}
                                >
                                    Forgot password?
                                </button>
                            </div>

                            {showForgotForm && (
                                <div style={{ background: '#020D1A', border: '1px solid #1e2537', borderRadius: '12px', padding: '1rem', marginTop: '-0.25rem' }}>
                                    {forgotSent ? (
                                        <div>
                                            <p style={{ color: '#10B981', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                                                Your admin has been notified. They will reset your password.
                                            </p>
                                            <button
                                                type="button"
                                                style={{ background: 'none', border: 'none', color: '#7C6DFA', cursor: 'pointer', padding: 0, fontSize: '0.82rem', textDecoration: 'underline' }}
                                                onClick={() => { setShowForgotForm(false); setForgotSent(false); }}
                                            >
                                                Back to login
                                            </button>
                                        </div>
                                    ) : (
                                        <div>
                                            <p style={{ fontSize: '0.82rem', color: '#F1F5F9', marginBottom: '0.5rem', fontWeight: 600 }}>Enter your email to request a password reset:</p>
                                            <input
                                                type="email"
                                                className="auth-field"
                                                style={{ width: '100%', boxSizing: 'border-box', marginBottom: '0.5rem', padding: '0.5rem 0.75rem', border: '1px solid #1e2537', background: '#111929', color: '#F1F5F9', borderRadius: '8px', fontSize: '0.85rem' }}
                                                placeholder="your@email.com"
                                                value={forgotEmail}
                                                onChange={e => setForgotEmail(e.target.value)}
                                            />
                                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                <button
                                                    type="button"
                                                    className="auth-btn-primary"
                                                    style={{ flex: 1, fontSize: '0.82rem', padding: '0.5rem' }}
                                                    disabled={forgotLoading || !forgotEmail}
                                                    onClick={async () => {
                                                        setForgotLoading(true);
                                                        try {
                                                            await fetch(`${API_URL}/auth/forgot-password`, {
                                                                method: 'POST',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({ email: forgotEmail }),
                                                            });
                                                            setForgotSent(true);
                                                        } catch (_) {
                                                            setForgotSent(true); // still show success (don't reveal errors)
                                                        } finally {
                                                            setForgotLoading(false);
                                                        }
                                                    }}
                                                >
                                                    {forgotLoading ? 'Sending…' : 'Send Reset Request'}
                                                </button>
                                                <button
                                                    type="button"
                                                    style={{ background: 'none', border: 'none', color: '#6B9AB8', cursor: 'pointer', padding: 0, fontSize: '0.78rem', textDecoration: 'underline', whiteSpace: 'nowrap' }}
                                                    onClick={() => setShowForgotForm(false)}
                                                >
                                                    Back to login
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <button type="submit" className="auth-btn-primary" disabled={isLoading}>
                                {isLoading ? 'Signing in…' : 'Sign In →'}
                            </button>

                            <p className="auth-switch">
                                Don't have an account? <Link to="/signup">Create one free</Link>
                            </p>
                        </form>
                    ) : (
                        <form onSubmit={handleVerifyMfa} className="auth-form">
                            {mfaState.mfa_setup_required && (
                                <div style={{ background: '#020D1A', border: '1px solid #1e2537', borderRadius: '16px', padding: '1rem', marginBottom: '1rem', textAlign: 'center' }}>
                                    <p style={{ marginBottom: '0.75rem', fontWeight: 600 }}>Scan this QR in Google Authenticator or any TOTP app.</p>
                                    {qrUrl && <img src={qrUrl} alt="MFA QR Code" style={{ width: 220, height: 220, maxWidth: '100%', borderRadius: 12, background: '#fff', padding: 8 }} />}
                                    <p style={{ marginTop: '0.75rem', marginBottom: '0.35rem', fontSize: '0.85rem', color: '#6B9AB8' }}>Manual setup key</p>
                                    <code style={{ display: 'block', wordBreak: 'break-all', fontSize: '0.85rem', color: '#CBD5E1' }}>{mfaState.manual_key}</code>
                                </div>
                            )}

                            <div className="auth-field">
                                <label>Authenticator Code</label>
                                <input
                                    type="text"
                                    placeholder="123456"
                                    value={mfaCode}
                                    onChange={e => setMfaCode(e.target.value)}
                                    required
                                />
                            </div>

                            <button type="submit" className="auth-btn-primary" disabled={isLoading}>
                                {isLoading ? 'Verifying…' : 'Verify & Sign In →'}
                            </button>

                            <button
                                type="button"
                                className="btn"
                                style={{ width: '100%', marginTop: '0.75rem', background: 'rgba(124, 109, 250, 0.1)', color: '#7C6DFA', border: '1px solid rgba(124, 109, 250, 0.2)', borderRadius: '8px', cursor: 'pointer', padding: '12px', fontWeight: 600, fontSize: '0.95rem' }}
                                onClick={() => {
                                    setMfaState(null);
                                    setMfaCode('');
                                    setError(null);
                                }}
                            >
                                Back to Login
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}

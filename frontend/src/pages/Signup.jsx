import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { API_URL } from '../config/env';
import { fetchJson } from '../lib/api';
import { countries } from '../lib/countries';

function checkPassword(pw) {
    return {
        length:    pw.length >= 8,
        uppercase: /[A-Z]/.test(pw),
        lowercase: /[a-z]/.test(pw),
        number:    /\d/.test(pw),
        special:   /[@$!%*?&_#^()\-+=~`|\\:;"'<>,./[\]{}]/.test(pw),
    };
}

function PasswordStrength({ password }) {
    const checks = useMemo(() => checkPassword(password), [password]);
    if (!password) return null;
    const passed = Object.values(checks).filter(Boolean).length;
    const strength = passed <= 2 ? 'Weak' : passed <= 4 ? 'Fair' : 'Strong';
    const color = passed <= 2 ? '#ef4444' : passed <= 4 ? '#f59e0b' : '#10b981';
    const labels = {
        length:    'At least 8 characters',
        uppercase: 'One uppercase letter (A–Z)',
        lowercase: 'One lowercase letter (a–z)',
        number:    'One number (0–9)',
        special:   'One special character (!@#$...)',
    };
    return (
        <div style={{ marginTop: 6, marginBottom: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div style={{ flex: 1, height: 4, borderRadius: 4, background: '#e5e7eb', overflow: 'hidden' }}>
                    <div style={{ width: `${(passed / 5) * 100}%`, height: '100%', background: color, transition: 'all 0.3s' }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color }}>{strength}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 12px' }}>
                {Object.entries(labels).map(([key, label]) => (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: checks[key] ? '#10b981' : '#9ca3af' }}>
                        <span style={{ fontSize: 10 }}>{checks[key] ? '✓' : '✗'}</span>
                        {label}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function Signup() {
    const [signupStep, setSignupStep] = useState('form');
    const [verificationCode, setVerificationCode] = useState('');
    const [verificationPreview, setVerificationPreview] = useState('');
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        countryCode: '+92',
        phone: '',
        companyName: '',
        website: '',
        ntn: '',
        requestedAgentLimit: 1,
        requestedNumbers: 1,
        password: '',
        confirmPassword: '',
    });
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const handleChange = (e) => {
        let value = e.target.type === 'number' ? Number(e.target.value) : e.target.value;
        if (e.target.name === 'phone') {
            value = String(value).replace(/\D/g, '').slice(0, 15);
        }
        setFormData({ ...formData, [e.target.name]: value });
    };

    const handleSignup = async (e) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match. Please make sure both fields are the same.');
            return;
        }
        const pwChecks = checkPassword(formData.password);
        const pwFailLabels = { length: 'at least 8 characters', uppercase: 'one uppercase letter (A–Z)', lowercase: 'one lowercase letter (a–z)', number: 'one number (0–9)', special: 'one special character (!@#$...)' };
        const pwFailed = Object.entries(pwChecks).filter(([,v]) => !v).map(([k]) => pwFailLabels[k]);
        if (pwFailed.length > 0) {
            setError(`Strong password required. Missing: ${pwFailed.join(', ')}.`);
            return;
        }
        if (!formData.ntn || !/^\d{7}-\d$/.test(formData.ntn)) {
            setError('Please enter a valid NTN in FBR format (e.g. 1234567-8).');
            return;
        }
        if (!termsAccepted) {
            setError('You must accept the Terms and Conditions to continue.');
            return;
        }
        const emailDomain = (formData.email.split('@')[1] || '').toLowerCase();
        const blockedDomains = new Set([
            'gmail.com', 'googlemail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
            'live.com', 'msn.com', 'icloud.com', 'me.com', 'aol.com', 'proton.me', 'protonmail.com'
        ]);
        if (blockedDomains.has(emailDomain)) {
            setError('Use your company work email address for signup.');
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetchJson(`${API_URL}/auth/signup`, {
                method: 'POST',
                body: JSON.stringify({
                    name: formData.firstName,
                    lastName: formData.lastName,
                    email: formData.email,
                    password: formData.password,
                    phone: formData.phone ? `${formData.countryCode}${formData.phone}` : undefined,
                    companyName: formData.companyName,
                    website: formData.website || undefined,
                    ntn: formData.ntn,
                    requestedAgentLimit: formData.requestedAgentLimit,
                    requestedNumbers: formData.requestedNumbers,
                    termsAccepted: true,
                }),
            });
            if (import.meta.env.DEV) setVerificationPreview(response.verificationCodePreview || '');
            setSignupStep('verify');
        } catch (err) {
            setError(err.message || 'Signup failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifySignup = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        try {
            await fetchJson(`${API_URL}/auth/signup/verify`, {
                method: 'POST',
                body: JSON.stringify({
                    email: formData.email,
                    code: verificationCode,
                }),
            });
            setSuccess(true);
        } catch (err) {
            setError(err.message || 'Verification failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    if (success) {
        return (
            <div className="auth-page">
                <div className="auth-card" style={{ maxWidth: 480, textAlign: 'center', padding: '48px 32px' }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
                    <h2 style={{ marginBottom: 8 }}>Request Submitted!</h2>
                    <p style={{ color: '#6b7280', marginBottom: 24 }}>
                        Your email is verified and your company request is now with the Voxiq team. After approval, the super admin will share your one-time first-login access code for the company admin account.
                    </p>
                    <Link to="/login" className="auth-btn-primary" style={{ display: 'inline-block', textDecoration: 'none' }}>
                        Go to Login →
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-page">
            <div className="auth-card auth-card-wide">
                <div className="auth-left">
                    <h2>Join<br />Voxiq</h2>
                    <p>Register your company for access to the next generation sales dialer.</p>
                    <div className="auth-feature-list">
                        <div className="auth-feature-item">
                            <span className="auth-feature-check">✓</span>
                            Company Admin Access
                        </div>
                        <div className="auth-feature-item">
                            <span className="auth-feature-check">✓</span>
                            Managed Agent Seats
                        </div>
                        <div className="auth-feature-item">
                            <span className="auth-feature-check">✓</span>
                            Dedicated Phone Numbers
                        </div>
                    </div>
                </div>

                <div className="auth-right">
                    <div className="auth-logo-box">
                        <img src="/logo.png" alt="Voxiq" style={{ height: '44px' }} />
                    </div>
                    <h1>Company Registration</h1>
                    <p className="auth-subtitle">Admins only — no code is needed for signup. A one-time first-login code is shared after approval.</p>

                    {error && <div className="auth-error">{error}</div>}

                    {signupStep === 'form' ? (
                    <form onSubmit={handleSignup} className="auth-form">
                        <div className="auth-field-row">
                            <div className="auth-field">
                                <label>First Name</label>
                                <input name="firstName" type="text" placeholder="Jane" value={formData.firstName} onChange={handleChange} required />
                            </div>
                            <div className="auth-field">
                                <label>Last Name</label>
                                <input name="lastName" type="text" placeholder="Doe" value={formData.lastName} onChange={handleChange} required />
                            </div>
                        </div>

                        <div className="auth-field">
                            <label>Work Email</label>
                            <input name="email" type="email" placeholder="jane@company.com" value={formData.email} onChange={handleChange} required />
                        </div>

                        <div className="auth-field-row">
                            <div className="auth-field">
                                <label>Company Name</label>
                                <input name="companyName" type="text" placeholder="Acme Inc." value={formData.companyName} onChange={handleChange} required />
                            </div>
                            <div className="auth-field">
                                <label>Company Website <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional)</span></label>
                                <input name="website" type="url" placeholder="https://yourcompany.com" value={formData.website} onChange={handleChange} />
                            </div>
                        </div>

                        <div className="auth-field-row">
                            <div className="auth-field">
                                <label>
                                    Company NTN <span style={{ color: '#ef4444', fontWeight: 700 }}>*</span>
                                    <span style={{ color: '#9ca3af', fontWeight: 400, fontSize: 11, marginLeft: 6 }}>FBR format: 1234567-8</span>
                                </label>
                                <input name="ntn" type="text" placeholder="1234567-8" value={formData.ntn} onChange={handleChange} maxLength={9} required
                                    pattern="\d{7}-\d"
                                    title="NTN must be 7 digits, hyphen, 1 digit (e.g. 1234567-8)"
                                />
                                {formData.ntn && !/^\d{7}-\d$/.test(formData.ntn) && (
                                    <div style={{ color: '#ef4444', fontSize: 11, marginTop: 3 }}>Format: 1234567-8 (FBR issued NTN)</div>
                                )}
                            </div>
                            <div className="auth-field" />
                        </div>

                        <div className="auth-field">
                            <label>Phone Number <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional)</span></label>
                            <div className="auth-phone-row">
                                <input
                                    name="countryCode"
                                    type="text"
                                    list="country-codes-list"
                                    value={formData.countryCode}
                                    onChange={handleChange}
                                    onFocus={e => e.target.select()}
                                    className="auth-phone-code"
                                    placeholder="+92"
                                    style={{ cursor: 'auto' }}
                                />
                                <datalist id="country-codes-list">
                                    {countries.map(c => (
                                        <option key={`${c.name}-${c.code}`} value={c.code}>{c.name} ({c.code})</option>
                                    ))}
                                </datalist>
                                <input name="phone" type="tel" placeholder="Digits only, max 15" value={formData.phone} onChange={handleChange} maxLength={15} />
                            </div>
                        </div>

                        <div className="auth-field-row">
                            <div className="auth-field">
                                <label>Agents Needed</label>
                                <input name="requestedAgentLimit" type="number" min="1" max="100" value={formData.requestedAgentLimit} onChange={handleChange} required />
                            </div>
                            <div className="auth-field">
                                <label>Phone Numbers Needed</label>
                                <input name="requestedNumbers" type="number" min="1" max="50" value={formData.requestedNumbers} onChange={handleChange} required />
                            </div>
                        </div>

                        <div className="auth-field-row">
                            <div className="auth-field">
                                <label>Password</label>
                                <div style={{ position: 'relative' }}>
                                    <input name="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••"
                                        value={formData.password} onChange={handleChange} required
                                        style={{ paddingRight: '2.5rem', width: '100%', boxSizing: 'border-box' }} />
                                    <button type="button" tabIndex={-1} onClick={() => setShowPassword(v => !v)}
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                        style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 0, lineHeight: 1 }}>
                                        {showPassword
                                            ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                                            : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                        }
                                    </button>
                                </div>
                                <PasswordStrength password={formData.password} />
                            </div>
                            <div className="auth-field">
                                <label>Confirm Password</label>
                                <div style={{ position: 'relative' }}>
                                    <input name="confirmPassword" type={showConfirm ? 'text' : 'password'} placeholder="••••••••"
                                        value={formData.confirmPassword} onChange={handleChange} required
                                        style={{ paddingRight: '2.5rem', width: '100%', boxSizing: 'border-box' }} />
                                    <button type="button" tabIndex={-1} onClick={() => setShowConfirm(v => !v)}
                                        aria-label={showConfirm ? 'Hide password' : 'Show password'}
                                        style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 0, lineHeight: 1 }}>
                                        {showConfirm
                                            ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                                            : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                        }
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, margin: '4px 0 16px' }}>
                            <input
                                id="termsCheckbox"
                                type="checkbox"
                                checked={termsAccepted}
                                onChange={e => setTermsAccepted(e.target.checked)}
                                style={{ marginTop: 3, width: 16, height: 16, cursor: 'pointer', accentColor: '#2563eb', flexShrink: 0 }}
                            />
                            <label htmlFor="termsCheckbox" style={{ fontSize: 13, color: '#374151', cursor: 'pointer', lineHeight: 1.5 }}>
                                I have read and agree to the{' '}
                                <Link to="/terms" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', fontWeight: 600 }}>
                                    Terms and Conditions
                                </Link>
                                {' '}of Voxiq. I confirm that my company will use this platform lawfully and in compliance with all applicable laws including PTA regulations and PECA 2016.
                            </label>
                        </div>

                        <button type="submit" className="auth-btn-primary" disabled={isLoading || !termsAccepted}
                            style={{ opacity: !termsAccepted ? 0.6 : 1 }}>
                            {isLoading ? 'Submitting…' : 'Submit Registration →'}
                        </button>

                        <p className="auth-switch">
                            Already approved? <Link to="/login">Sign in</Link>
                        </p>
                    </form>
                    ) : (
                    <form onSubmit={handleVerifySignup} className="auth-form">
                        <div className="auth-field">
                            <label>Verification Code</label>
                            <input
                                name="verificationCode"
                                type="text"
                                placeholder="Enter the 6-digit code sent to your email"
                                value={verificationCode}
                                onChange={e => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                required
                            />
                        </div>
                        <p className="auth-subtitle" style={{ marginTop: 0 }}>
                            We sent a verification code to <strong>{formData.email}</strong>.
                        </p>
                        {import.meta.env.DEV && verificationPreview && (
                            <div className="auth-error" style={{ background: '#eff6ff', color: '#1d4ed8', borderColor: '#bfdbfe' }}>
                                Dev preview code: {verificationPreview}
                            </div>
                        )}
                        <button type="submit" className="auth-btn-primary" disabled={isLoading}>
                            {isLoading ? 'Verifying…' : 'Verify Email & Complete Signup →'}
                        </button>
                        <button
                            type="button"
                            className="btn"
                            style={{ width: '100%', marginTop: '0.75rem', background: '#f1f5f9', color: '#475569' }}
                            onClick={() => {
                                setSignupStep('form');
                                setVerificationCode('');
                                setVerificationPreview('');
                                setError(null);
                            }}
                        >
                            Back
                        </button>
                    </form>
                    )}
                </div>
            </div>
        </div>
    );
}

import { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { API_URL } from '../config/env';
import { fetchJson } from '../lib/api';
import { countries } from '../lib/countries';
import PricingCards from '../components/PricingCards';

const PLAN_DETAILS = {
    Trial:      { name: '7-Day Free Trial', tagline: 'Try before you buy',        price: 0,     color: '#6366f1', popular: false, contactSales: false, features: ['Outbound Calls', '1 Agent Seat', '7 Days Free', 'No credit card required'] },
    Basic:      { name: 'Basic',            tagline: 'Unlimited calling per seat', price: 24.99, color: '#3b82f6', popular: false, contactSales: false, features: ['Unlimited Outbound & Inbound Calls', 'Per-seat pricing', 'Call History & Analytics'] },
    Pro:        { name: 'Pro',              tagline: 'Calls + SMS + Recordings',   price: 39.99, color: '#8b5cf6', popular: true,  contactSales: false, features: ['Everything in Basic', 'SMS Messaging', 'Call Recordings', 'Advanced Analytics'] },
    Business:   { name: 'Business',         tagline: 'Full-featured platform',     price: 69.99, color: '#f59e0b', popular: false, contactSales: false, features: ['Everything in Pro', 'WhatsApp Messaging', 'AI Call Insights', 'Priority Support'] },
    Enterprise: { name: 'Enterprise',       tagline: 'Custom for large teams',     price: null,  color: '#10b981', popular: false, contactSales: true,  features: ['Everything in Business', 'Custom Seat Limit', 'Dedicated Account Manager', 'SLA & Custom Integrations'] },
};

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

function StepBar({ step }) {
    const steps = ['Company Info', 'Choose Plan', 'Review Order', 'Verify Email'];
    const idx = step === 'form' ? 0 : step === 'pricing' ? 1 : step === 'checkout' ? 2 : 3;
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 20 }}>
            {steps.map((label, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 0 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <div style={{
                            width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 800, fontSize: 12,
                            background: i < idx ? '#10b981' : i === idx ? '#2563eb' : '#e5e7eb',
                            color: i <= idx ? '#fff' : '#9ca3af',
                            flexShrink: 0,
                        }}>
                            {i < idx ? '✓' : i + 1}
                        </div>
                        <span style={{ fontSize: 10, color: i === idx ? '#2563eb' : '#9ca3af', fontWeight: i === idx ? 700 : 400, whiteSpace: 'nowrap' }}>{label}</span>
                    </div>
                    {i < steps.length - 1 && (
                        <div style={{ flex: 1, height: 2, background: i < idx ? '#10b981' : '#e5e7eb', margin: '0 6px', marginBottom: 16 }} />
                    )}
                </div>
            ))}
        </div>
    );
}

export default function Signup() {
    const [searchParams] = useSearchParams();
    const fromCheckout = !!(searchParams.get('plan'));
    const [signupStep, setSignupStep] = useState('form');
    const [verificationCode, setVerificationCode] = useState('');
    const [verificationPreview, setVerificationPreview] = useState('');
    const [selectedPackage, setSelectedPackage] = useState(searchParams.get('plan') || 'Trial');
    const [billingCycle, setBillingCycle] = useState(searchParams.get('billing') === 'annual' ? 'annual' : 'monthly');
    const [seatCount, setSeatCount] = useState(Math.max(1, parseInt(searchParams.get('seats') || '1', 10)));
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

    const handleGoToPricing = (e) => {
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
        setError(null);
        setSignupStep(fromCheckout ? 'checkout' : 'pricing');
    };

    const handleSignup = async () => {
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
                    requestedAgentLimit: seatCount,
                    requestedNumbers: formData.requestedNumbers,
                    termsAccepted: true,
                    requestedPackage: selectedPackage,
                    billingCycle,
                    seatCount,
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

    if (signupStep === 'pricing') {
        return (
            <div className="auth-page" style={{ padding: '80px 16px 40px', alignItems: 'flex-start' }}>
                <div className="signup-step-container" style={{ maxWidth: '1150px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <img src="/logo.png" alt="Voxiq" style={{ height: '36px' }} />
                        <div style={{ maxWidth: 360, flex: 1, marginLeft: 32 }}><StepBar step="pricing" /></div>
                    </div>
                    <h2 style={{ textAlign: 'center', marginBottom: '6px', fontSize: '1.5rem' }}>Choose Your Plan</h2>
                    <p style={{ textAlign: 'center', color: '#64748b', marginBottom: '24px', fontSize: '0.88rem' }}>
                        You can upgrade anytime from your Admin dashboard
                    </p>
                    <PricingCards
                        selectedPackage={selectedPackage}
                        selectedBilling={billingCycle}
                        onBillingChange={setBillingCycle}
                        onSelect={(pkgId, seats) => {
                            setSelectedPackage(pkgId);
                            setSeatCount(seats);
                            setSignupStep('checkout');
                        }}
                    />
                    {error && <div className="auth-error" style={{ marginTop: '16px', maxWidth: '600px', margin: '16px auto 0' }}>{error}</div>}
                    <div style={{ display: 'flex', gap: '12px', marginTop: '24px', maxWidth: '500px', margin: '24px auto 0' }}>
                        <button
                            type="button"
                            className="btn"
                            style={{ flex: 1, background: '#f1f5f9', color: '#475569' }}
                            onClick={() => { setSignupStep('form'); setError(null); }}
                        >
                            ← Back
                        </button>
                        <button
                            type="button"
                            className="auth-btn-primary"
                            style={{ flex: 2 }}
                            onClick={() => setSignupStep('checkout')}
                        >
                            Review Order →
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (signupStep === 'checkout') {
        const plan = PLAN_DETAILS[selectedPackage] || PLAN_DETAILS.Trial;
        const perSeatPrice = plan.price ? (billingCycle === 'annual' ? plan.price * 0.9 : plan.price) : null;
        const totalPrice = perSeatPrice
            ? (billingCycle === 'annual' ? perSeatPrice * seatCount * 12 : perSeatPrice * seatCount).toFixed(2)
            : null;

        return (
            <div className="auth-page" style={{ padding: '80px 16px 40px', alignItems: 'flex-start' }}>
                <div className="signup-step-container" style={{ maxWidth: '960px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <img src="/logo.png" alt="Voxiq" style={{ height: '36px' }} />
                        <div style={{ maxWidth: 480, flex: 1, marginLeft: 32 }}><StepBar step="checkout" /></div>
                    </div>
                    <h2 style={{ textAlign: 'center', marginBottom: '6px', fontSize: '1.5rem' }}>Review Your Order</h2>
                    <p style={{ textAlign: 'center', color: '#64748b', marginBottom: '24px', fontSize: '0.88rem' }}>
                        Confirm your plan before completing registration
                    </p>

                    <div className="checkout-grid">
                        {/* Left: Plan Details */}
                        <div style={{ background: 'var(--vx-gray-50)', borderRadius: '18px', padding: '28px', border: '1px solid var(--vx-gray-200)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: plan.color, display: 'inline-block', flexShrink: 0 }} />
                                <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.4rem', fontWeight: 900, color: 'var(--vx-primary)' }}>{plan.name}</span>
                                {plan.popular && <span style={{ background: plan.color, color: '#fff', padding: '2px 8px', borderRadius: '999px', fontSize: '0.65rem', fontWeight: 800 }}>MOST POPULAR</span>}
                            </div>
                            <p style={{ color: 'var(--vx-gray-500)', marginBottom: '18px', fontSize: '0.875rem' }}>{plan.tagline}</p>

                            {/* Price */}
                            {plan.contactSales ? (
                                <div style={{ marginBottom: '18px' }}>
                                    <div style={{ fontSize: '1.8rem', fontWeight: 900, color: plan.color, fontFamily: 'Outfit, sans-serif' }}>Custom</div>
                                </div>
                            ) : plan.price === 0 ? (
                                <div style={{ marginBottom: '18px' }}>
                                    <div style={{ fontSize: '2rem', fontWeight: 900, color: plan.color, fontFamily: 'Outfit, sans-serif' }}>Free</div>
                                    <p style={{ color: 'var(--vx-gray-400)', fontSize: '0.8rem', marginTop: '2px' }}>7 days, no credit card</p>
                                </div>
                            ) : (
                                <div style={{ marginBottom: '18px' }}>
                                    <span style={{ fontSize: '2rem', fontWeight: 900, color: plan.color, fontFamily: 'Outfit, sans-serif' }}>${perSeatPrice.toFixed(2)}</span>
                                    <span style={{ color: 'var(--vx-gray-400)', fontSize: '0.8rem' }}>/seat/mo</span>
                                </div>
                            )}

                            {/* Billing Toggle */}
                            {plan.price > 0 && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', background: '#fff', borderRadius: '10px', padding: '10px 14px' }}>
                                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: billingCycle === 'monthly' ? 'var(--vx-primary)' : 'var(--vx-gray-400)' }}>Monthly</span>
                                    <button type="button" onClick={() => setBillingCycle(b => b === 'monthly' ? 'annual' : 'monthly')}
                                        style={{ width: '40px', height: '22px', borderRadius: '999px', border: 'none', cursor: 'pointer', background: billingCycle === 'annual' ? '#6366f1' : '#e2e8f0', position: 'relative', flexShrink: 0, transition: 'background 0.2s' }}>
                                        <span style={{ position: 'absolute', top: '2px', left: billingCycle === 'annual' ? '20px' : '2px', width: '18px', height: '18px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s', display: 'block' }} />
                                    </button>
                                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: billingCycle === 'annual' ? 'var(--vx-primary)' : 'var(--vx-gray-400)' }}>
                                        Annual <span style={{ background: '#dcfce7', color: '#16a34a', padding: '1px 7px', borderRadius: '999px', fontSize: '0.65rem', fontWeight: 800 }}>–10%</span>
                                    </span>
                                </div>
                            )}

                            {/* Seat Selector */}
                            {plan.price > 0 && (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', borderRadius: '10px', padding: '10px 14px', marginBottom: '18px' }}>
                                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--vx-gray-600)' }}>Seats</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <button type="button" onClick={() => setSeatCount(s => Math.max(1, s - 1))} style={{ width: '26px', height: '26px', borderRadius: '6px', border: '1px solid var(--vx-gray-200)', background: '#fff', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                                        <span style={{ fontWeight: 800, minWidth: '24px', textAlign: 'center', color: 'var(--vx-primary)' }}>{seatCount}</span>
                                        <button type="button" onClick={() => setSeatCount(s => Math.min(100, s + 1))} style={{ width: '26px', height: '26px', borderRadius: '6px', border: '1px solid var(--vx-gray-200)', background: '#fff', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                                    </div>
                                </div>
                            )}

                            {/* Features */}
                            <div style={{ borderTop: '1px solid var(--vx-gray-200)', paddingTop: '16px' }}>
                                <p style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--vx-gray-400)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>Included</p>
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                    {plan.features.map(f => (
                                        <li key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '0.875rem', color: 'var(--vx-primary)' }}>
                                            <span style={{ color: plan.color, fontWeight: 800, flexShrink: 0 }}>✓</span>{f}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {/* Right: Order Summary */}
                        <div style={{ background: '#fff', borderRadius: '18px', padding: '24px', border: `2px solid ${plan.color}` }}>
                            <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.05rem', fontWeight: 900, color: 'var(--vx-primary)', marginBottom: '18px' }}>Order Summary</h3>

                            <div style={{ background: 'var(--vx-gray-50)', borderRadius: '12px', padding: '16px', marginBottom: '18px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
                                    <span style={{ color: 'var(--vx-gray-500)' }}>Plan</span>
                                    <span style={{ fontWeight: 700, color: 'var(--vx-primary)' }}>{plan.name}</span>
                                </div>
                                {plan.price > 0 && (
                                    <>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
                                            <span style={{ color: 'var(--vx-gray-500)' }}>Per seat</span>
                                            <span style={{ fontWeight: 700, color: 'var(--vx-primary)' }}>${perSeatPrice.toFixed(2)}/mo</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
                                            <span style={{ color: 'var(--vx-gray-500)' }}>Seats</span>
                                            <span style={{ fontWeight: 700, color: 'var(--vx-primary)' }}>× {seatCount}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
                                            <span style={{ color: 'var(--vx-gray-500)' }}>Billing</span>
                                            <span style={{ fontWeight: 700, color: 'var(--vx-primary)' }}>{billingCycle === 'annual' ? 'Annual (–10%)' : 'Monthly'}</span>
                                        </div>
                                    </>
                                )}
                                {plan.price === 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
                                        <span style={{ color: 'var(--vx-gray-500)' }}>Duration</span>
                                        <span style={{ fontWeight: 700, color: 'var(--vx-primary)' }}>7 days free</span>
                                    </div>
                                )}
                                <div style={{ borderTop: '1px solid var(--vx-gray-200)', paddingTop: '12px', marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                    <span style={{ fontWeight: 800, color: 'var(--vx-primary)', fontSize: '0.875rem' }}>Total due today</span>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 900, color: plan.color, fontFamily: 'Outfit, sans-serif' }}>
                                            {plan.price === 0 ? '$0' : plan.contactSales ? 'Custom' : `$${totalPrice}`}
                                        </div>
                                        {plan.price > 0 && <div style={{ fontSize: '0.7rem', color: 'var(--vx-gray-400)' }}>/{billingCycle === 'annual' ? 'year' : 'month'}</div>}
                                    </div>
                                </div>
                            </div>

                            {error && <div className="auth-error" style={{ marginBottom: '12px' }}>{error}</div>}

                            <button type="button" className="auth-btn-primary" disabled={isLoading} onClick={handleSignup}>
                                {isLoading ? 'Submitting…' : 'Submit Registration →'}
                            </button>

                            <p style={{ fontSize: '0.72rem', color: 'var(--vx-gray-400)', textAlign: 'center', marginTop: '10px', lineHeight: 1.5 }}>
                                {plan.price === 0 ? 'No credit card required.' : 'No charges until approved by our team.'}
                            </p>

                            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--vx-gray-100)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {['7-day free trial on all plans', 'Cancel anytime', '99.99% uptime SLA'].map(item => (
                                    <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                                        <span style={{ color: '#10b981', fontSize: '0.75rem', flexShrink: 0 }}>✓</span>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--vx-gray-500)' }}>{item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', marginTop: '20px', maxWidth: '400px', margin: '20px auto 0' }}>
                        <button type="button" className="btn" style={{ flex: 1, background: '#f1f5f9', color: '#475569' }}
                            onClick={() => { setSignupStep('pricing'); setError(null); }}>
                            ← Back to Plans
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-page">
            <div className="auth-card auth-card-wide">
                <div className="auth-left">
                    <h2>Join<br />Voxiq</h2>
                    <p>Register your company and pick a plan that fits your team.</p>
                    <div className="auth-feature-list">
                        <div className="auth-feature-item">
                            <span className="auth-feature-check">✓</span>
                            Free 7-Day Trial — no card needed
                        </div>
                        <div className="auth-feature-item">
                            <span className="auth-feature-check">✓</span>
                            Per-seat pricing from $24.99/mo
                        </div>
                        <div className="auth-feature-item">
                            <span className="auth-feature-check">✓</span>
                            Calls, SMS, WhatsApp &amp; AI Insights
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
                    <StepBar step={signupStep} />
                    <p className="auth-subtitle">Admins only — after approval you'll receive a one-time access code to complete first login.</p>

                    {error && <div className="auth-error">{error}</div>}

                    {signupStep === 'form' ? (
                    <form onSubmit={handleGoToPricing} className="auth-form">
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

                        <div className="auth-field">
                            <label>Phone Numbers Needed</label>
                            <input name="requestedNumbers" type="number" min="1" max="50" value={formData.requestedNumbers} onChange={handleChange} required />
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
                            {isLoading ? 'Checking…' : fromCheckout ? 'Review Order →' : 'Next: Choose Plan →'}
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

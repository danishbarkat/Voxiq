import { useState } from 'react';
import { Link } from 'react-router-dom';
import { API_URL } from '../config/env';
import { fetchJson } from '../lib/api';
import { countries } from '../lib/countries';

export default function Signup() {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        countryCode: '+1',
        phone: '',
        companyName: '',
        adminCode: '',
        requestedAgentLimit: 1,
        requestedNumbers: 1,
        password: '',
        confirmPassword: '',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const handleChange = (e) => {
        const value = e.target.type === 'number' ? Number(e.target.value) : e.target.value;
        setFormData({ ...formData, [e.target.name]: value });
    };

    const handleSignup = async (e) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            await fetchJson(`${API_URL}/auth/signup`, {
                method: 'POST',
                body: JSON.stringify({
                    name: formData.firstName,
                    lastName: formData.lastName,
                    email: formData.email,
                    password: formData.password,
                    phone: `${formData.countryCode}${formData.phone}`,
                    companyName: formData.companyName,
                    adminCode: formData.adminCode,
                    requestedAgentLimit: formData.requestedAgentLimit,
                    requestedNumbers: formData.requestedNumbers,
                }),
            });
            setSuccess(true);
        } catch (err) {
            setError(err.message || 'Signup failed. Please try again.');
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
                        Your company account is under review. The Voxiq team will activate your account shortly.
                        You will be able to login once approved.
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
                    <p className="auth-subtitle">Admins only — agents are added by your admin after approval</p>

                    {error && <div className="auth-error">{error}</div>}

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
                                <label>Phone Number</label>
                                <div className="auth-phone-row">
                                    <select name="countryCode" value={formData.countryCode} onChange={handleChange} className="auth-phone-code" required>
                                        {countries.map(c => <option key={`${c.name}-${c.code}`} value={c.code}>{c.code}</option>)}
                                    </select>
                                    <input name="phone" type="tel" placeholder="555-0000" value={formData.phone} onChange={handleChange} required />
                                </div>
                            </div>
                        </div>

                        <div className="auth-field">
                            <label>Admin Code <span style={{ color: '#9ca3af', fontWeight: 400 }}>(provided by Voxiq)</span></label>
                            <input name="adminCode" type="text" placeholder="Enter your admin access code" value={formData.adminCode} onChange={handleChange} required />
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
                                <input name="password" type="password" placeholder="••••••••" value={formData.password} onChange={handleChange} required />
                            </div>
                            <div className="auth-field">
                                <label>Confirm Password</label>
                                <input name="confirmPassword" type="password" placeholder="••••••••" value={formData.confirmPassword} onChange={handleChange} required />
                            </div>
                        </div>

                        <button type="submit" className="auth-btn-primary" disabled={isLoading}>
                            {isLoading ? 'Submitting…' : 'Submit Registration →'}
                        </button>

                        <p className="auth-switch">
                            Already approved? <Link to="/login">Sign in</Link>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
}

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { API_URL } from '../config/env';
import { fetchJson } from '../lib/api';
import { countries } from '../lib/countries';

export default function Signup() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        countryCode: '+1',
        phone: '',
        companyName: '',
        city: '',
        country: '',
        password: '',
        confirmPassword: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
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
            const payload = {
                name: `${formData.firstName} ${formData.lastName}`,
                email: formData.email,
                phone: `${formData.countryCode}${formData.phone}`,
                company: formData.companyName,
                city: formData.city,
                country: formData.country,
                password: formData.password
            };
            await fetchJson(`${API_URL}/auth/signup`, {
                method: 'POST',
                body: JSON.stringify(payload),
            });
            navigate('/login', { state: { message: 'Account created! Please log in.' } });
        } catch (err) {
            setError(err.message || 'Signup failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card auth-card-wide">
                <div className="auth-left">
                    <h2>Join<br />Voxiq</h2>
                    <p>The next generation of sales dialing. Get started in minutes, no credit card required.</p>
                    <div className="auth-feature-list">
                        <div className="auth-feature-item">
                            <span className="auth-feature-check">✓</span>
                            5x More Conversations
                        </div>
                        <div className="auth-feature-item">
                            <span className="auth-feature-check">✓</span>
                            No Credit Card Required
                        </div>
                        <div className="auth-feature-item">
                            <span className="auth-feature-check">✓</span>
                            Setup in Under an Hour
                        </div>
                    </div>
                </div>

                <div className="auth-right">
                    <div className="auth-logo-box">
                        <img src="/logo.png" alt="Voxiq" style={{ height: '44px' }} />
                    </div>
                    <h1>Create Account</h1>
                    <p className="auth-subtitle">Fill in your details to get started</p>

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
                                <label>Company</label>
                                <input name="companyName" type="text" placeholder="Company Inc." value={formData.companyName} onChange={handleChange} required />
                            </div>
                            <div className="auth-field">
                                <label>City</label>
                                <input name="city" type="text" placeholder="New York" value={formData.city} onChange={handleChange} required />
                            </div>
                        </div>

                        <div className="auth-field-row">
                            <div className="auth-field">
                                <label>Country</label>
                                <select name="country" value={formData.country} onChange={handleChange} required>
                                    <option value="">Select Country</option>
                                    {countries.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                                </select>
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
                            {isLoading ? 'Creating Account…' : 'Create Account →'}
                        </button>

                        <p className="auth-switch">
                            Already have an account? <Link to="/login">Sign in</Link>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
}

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { API_URL } from '../config/env';
import { fetchJson } from '../lib/api';
import { setToken } from '../lib/auth';

export default function Login() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        try {
            const data = await fetchJson(`${API_URL}/auth/login`, {
                method: 'POST',
                body: JSON.stringify({ email, password }),
            });
            const token = data.access_token || data.accessToken;
            if (token) {
                setToken(token);
                const role = data.user?.role?.toLowerCase();
                if (role === 'admin' || role === 'superadmin') navigate('/admin');
                else if (role === 'manager') navigate('/manager');
                else navigate('/agent');
            } else {
                setError('Login failed. Please check your credentials.');
            }
        } catch (err) {
            setError(err.message || 'Connection error. Please try again.');
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
                    <h1>Sign In</h1>
                    <p className="auth-subtitle">Enter your credentials to continue</p>

                    {error && <div className="auth-error">{error}</div>}

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
                            <input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        <div className="auth-form-meta">
                            <label className="auth-remember">
                                <input type="checkbox" /> Remember me
                            </label>
                            <a href="#" className="auth-forgot">Forgot password?</a>
                        </div>

                        <button type="submit" className="auth-btn-primary" disabled={isLoading}>
                            {isLoading ? 'Signing in…' : 'Sign In →'}
                        </button>

                        <p className="auth-switch">
                            Don't have an account? <Link to="/signup">Create one free</Link>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
}

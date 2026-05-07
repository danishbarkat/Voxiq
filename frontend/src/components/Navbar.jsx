import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';

export default function Navbar() {
    const location = useLocation();
    const [menuOpen, setMenuOpen] = useState(false);
    const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';

    return (
        <nav className="navbar" style={{
            position: isAuthPage ? 'fixed' : 'relative',
            width: '100%',
            zIndex: 1000,
            background: isAuthPage ? 'white' : 'transparent',
            borderBottom: isAuthPage ? '1px solid var(--vx-gray-200)' : 'none',
        }}>
            <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '80px' }}>
                <Link to="/" className="flex-center">
                    <img src="/logo.png" alt="Voxiq Logo" style={{ height: '32px' }} />
                </Link>

                {!isAuthPage && (
                    <div className="nav-links">
                        <a href="#products">Products</a>
                        <a href="#solutions">Solutions</a>
                        <a href="#pricing">Pricing</a>
                        <a href="#resources">Resources</a>
                        <a href="#company">Company</a>
                    </div>
                )}

                <div className="flex-center nav-auth-btns" style={{ gap: '10px' }}>
                    <Link
                        to="/login"
                        className="btn btn-outline btn-sm"
                        style={{ border: isAuthPage ? '1px solid var(--vx-gray-200)' : '1px solid rgba(0,0,0,0.12)' }}
                    >
                        Log in
                    </Link>
                    <Link to="/signup" className="btn btn-primary btn-sm">Sign up</Link>
                </div>

                {!isAuthPage && (
                    <button
                        className="hamburger"
                        onClick={() => setMenuOpen(!menuOpen)}
                        aria-label="Toggle menu"
                    >
                        <span style={{ transform: menuOpen ? 'rotate(45deg) translate(5px, 5px)' : 'none' }} />
                        <span style={{ opacity: menuOpen ? 0 : 1 }} />
                        <span style={{ transform: menuOpen ? 'rotate(-45deg) translate(5px, -5px)' : 'none' }} />
                    </button>
                )}
            </div>

            {!isAuthPage && menuOpen && (
                <div className="mobile-nav">
                    <a href="#products" onClick={() => setMenuOpen(false)}>Products</a>
                    <a href="#solutions" onClick={() => setMenuOpen(false)}>Solutions</a>
                    <a href="#pricing" onClick={() => setMenuOpen(false)}>Pricing</a>
                    <a href="#resources" onClick={() => setMenuOpen(false)}>Resources</a>
                    <a href="#company" onClick={() => setMenuOpen(false)}>Company</a>
                    <div className="mobile-nav-auth">
                        <Link to="/login" className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setMenuOpen(false)}>Log in</Link>
                        <Link to="/signup" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setMenuOpen(false)}>Sign up</Link>
                    </div>
                </div>
            )}
        </nav>
    );
}

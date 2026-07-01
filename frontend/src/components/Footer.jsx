import { Link } from 'react-router-dom';

// Custom inline SVG icons
const Twitter = ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
    </svg>
);

const Linkedin = ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
        <rect x="2" y="9" width="4" height="12" />
        <circle cx="4" cy="4" r="2" />
    </svg>
);

const Youtube = ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.41 19c1.72.46 8.59.46 8.59.46s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z" />
        <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
    </svg>
);

// Cream/off-white footer background
const FOOTER_BG = '#F6F4F0';

export default function Footer() {
    return (
        <footer style={{
            background: FOOTER_BG,
            color: '#475569',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            position: 'relative',
            // Extra top padding so the floating CTA card (which is translateY(-50%)) 
            // has room to sit half above the footer boundary
            paddingTop: '0',
        }}>

            {/* ── Floating CTA Banner ── sits half above, half below the footer border */}
            <div style={{ padding: '0 2rem' }}>
                <div style={{
                    maxWidth: '1280px',
                    margin: '0 auto',
                    transform: 'translateY(-50%)',
                    position: 'relative',
                    zIndex: 10,
                }}>
                    <div style={{
                        background: 'linear-gradient(135deg, #0D3B6E 0%, #0F4C8A 100%)',
                        borderRadius: '20px',
                        padding: '40px 48px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '24px',
                        boxShadow: '0 24px 60px rgba(10,37,64,0.18)',
                        border: '1px solid rgba(127,205,255,0.12)',
                    }}>
                        <div>
                            <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(223,247,255,0.6)', margin: '0 0 8px 0' }}>
                                GET STARTED TODAY
                            </p>
                            <h3 style={{
                                fontFamily: "'Space Grotesk', sans-serif",
                                fontSize: 'clamp(20px, 2.5vw, 28px)',
                                fontWeight: 700,
                                color: '#FFFFFF',
                                margin: 0,
                                letterSpacing: '-0.02em',
                            }}>
                                Start closing more deals with Voxiq
                            </h3>
                            <p style={{ color: 'rgba(127,205,255,0.7)', fontSize: '14px', margin: '6px 0 0 0' }}>
                                14-day free trial · No credit card required · Cancel anytime
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                            <Link
                                to="/signup"
                                style={{
                                    background: 'rgb(223, 247, 255)',
                                    color: '#0A2540',
                                    fontWeight: 700,
                                    fontSize: '14px',
                                    padding: '12px 28px',
                                    borderRadius: '10px',
                                    textDecoration: 'none',
                                    transition: 'all 0.2s',
                                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                                    whiteSpace: 'nowrap',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(223,247,255,0.25)'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                            >
                                Start Free Trial
                            </Link>
                            <Link
                                to="/demo"
                                style={{
                                    background: 'transparent',
                                    color: '#DFF7FF',
                                    fontWeight: 600,
                                    fontSize: '14px',
                                    padding: '12px 28px',
                                    borderRadius: '10px',
                                    textDecoration: 'none',
                                    border: '1px solid rgba(127,205,255,0.3)',
                                    transition: 'all 0.2s',
                                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                                    whiteSpace: 'nowrap',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(127,205,255,0.6)'; e.currentTarget.style.background = 'rgba(127,205,255,0.08)'; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(127,205,255,0.3)'; e.currentTarget.style.background = 'transparent'; }}
                            >
                                Book a Demo
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Main Links Grid ── negative margin-top pulls content up under the floating card */}
            <div style={{ maxWidth: '1280px', margin: '-60px auto 0', padding: '0 2rem 64px' }}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1.6fr 1fr 1fr 1fr 1fr',
                    gap: '48px',
                }} className="footer-grid-voxiq">

                    {/* Col 1: Brand */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '9px' }}>
                            <div style={{
                                width: '30px',
                                height: '30px',
                                borderRadius: '7px',
                                background: '#0D3B6E',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#FFFFFF',
                                fontWeight: 900,
                                fontSize: '1rem',
                                letterSpacing: '-0.03em',
                            }}>
                                V
                            </div>
                            <span style={{ fontWeight: 800, fontSize: '1.3rem', color: '#0A2540', letterSpacing: '-0.03em', fontFamily: "'Space Grotesk', sans-serif" }}>
                                Voxiq
                            </span>
                        </Link>
                        <p style={{ fontSize: '14px', lineHeight: '1.7', color: '#64748B', margin: 0, maxWidth: '230px' }}>
                            The power dialer built for serious sales teams. Call more, close more.
                        </p>

                        {/* Social Icons */}
                        <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                            {[
                                { label: 'Twitter', icon: <Twitter size={15} /> },
                                { label: 'LinkedIn', icon: <Linkedin size={15} /> },
                                { label: 'YouTube', icon: <Youtube size={15} /> },
                            ].map(({ label, icon }) => (
                                <a key={label} href="#" aria-label={label}
                                    style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(10,37,64,0.07)', border: '1px solid rgba(10,37,64,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', textDecoration: 'none', transition: 'all 0.2s' }}
                                    onMouseEnter={e => { e.currentTarget.style.background = '#0D3B6E'; e.currentTarget.style.color = '#FFFFFF'; e.currentTarget.style.borderColor = '#0D3B6E'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(10,37,64,0.07)'; e.currentTarget.style.color = '#64748B'; e.currentTarget.style.borderColor = 'rgba(10,37,64,0.1)'; }}>
                                    {icon}
                                </a>
                            ))}
                        </div>

                        {/* Compliance badges */}
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                            {['SOC 2', 'TCPA', 'GDPR'].map(badge => (
                                <span key={badge} style={{ fontSize: '10px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', background: 'rgba(10,37,64,0.06)', border: '1px solid rgba(10,37,64,0.1)', color: '#64748B', letterSpacing: '0.05em' }}>
                                    {badge}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Col 2: Product */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <h4 style={{ fontSize: '11px', fontWeight: 700, color: '#0A2540', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Product</h4>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <li><Link to="/features/inbound-calls" className="footer-link-v">Inbound Calls</Link></li>
                            <li><Link to="/features/outbound-calls" className="footer-link-v">Outbound Calls</Link></li>
                            <li><Link to="/features/auto-dialer" className="footer-link-v">Auto Dialer</Link></li>
                            <li><Link to="/features/manual-dialer" className="footer-link-v">Manual Dialer</Link></li>
                            <li><Link to="/features/call-recording" className="footer-link-v">Call Recording</Link></li>
                            <li><Link to="/features/sms" className="footer-link-v">SMS Follow-ups</Link></li>
                            <li><Link to="/features/whatsapp" className="footer-link-v">WhatsApp Sync</Link></li>
                            <li><Link to="/features/ai-agent" className="footer-link-v">AI Agent Caller</Link></li>
                            <li><Link to="/features/analytics" className="footer-link-v">Real-time Analytics</Link></li>
                        </ul>
                    </div>

                    {/* Col 3: Integrations & Plans */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <h4 style={{ fontSize: '11px', fontWeight: 700, color: '#0A2540', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Integrations</h4>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <li><Link to="/integrations" className="footer-link-v">GoHighLevel (GHL)</Link></li>
                            <li><Link to="/integrations" className="footer-link-v">Zapier</Link></li>
                            <li><Link to="/integrations" className="footer-link-v">View All Integrations</Link></li>
                        </ul>
                        <h4 style={{ fontSize: '11px', fontWeight: 700, color: '#0A2540', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '16px 0 0 0' }}>Plans</h4>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <li><Link to="/pricing" className="footer-link-v">Pricing Plans</Link></li>
                            <li><Link to="/how-it-works" className="footer-link-v">How It Works</Link></li>
                        </ul>
                    </div>

                    {/* Col 4: Solutions */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <h4 style={{ fontSize: '11px', fontWeight: 700, color: '#0A2540', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Solutions</h4>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <li><Link to="/solutions/sales-teams" className="footer-link-v">Sales Teams</Link></li>
                            <li><Link to="/solutions/sdr-teams" className="footer-link-v">SDR / BDR Teams</Link></li>
                            <li><Link to="/solutions/small-business" className="footer-link-v">Small Business</Link></li>
                            <li><Link to="/solutions/real-estate" className="footer-link-v">Real Estate</Link></li>
                            <li><Link to="/solutions/insurance" className="footer-link-v">Insurance Agencies</Link></li>
                            <li><Link to="/solutions/saas" className="footer-link-v">SaaS Companies</Link></li>
                            <li><Link to="/solutions/ghl-agencies" className="footer-link-v">GHL Agencies</Link></li>
                            <li><Link to="/solutions/enterprise" className="footer-link-v">Enterprise Dialer</Link></li>
                        </ul>
                    </div>

                    {/* Col 5: Company */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <h4 style={{ fontSize: '11px', fontWeight: 700, color: '#0A2540', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Company</h4>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <li><Link to="#" className="footer-link-v">About Us</Link></li>
                            <li><Link to="#" className="footer-link-v">Careers</Link></li>
                            <li><Link to="#" className="footer-link-v">Security Center</Link></li>
                            <li><Link to="/terms" className="footer-link-v">Privacy Policy</Link></li>
                            <li><Link to="/terms" className="footer-link-v">Terms of Service</Link></li>
                            <li><Link to="#" className="footer-link-v">GDPR Compliance</Link></li>
                            <li><Link to="#" className="footer-link-v">TCPA Compliance</Link></li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* ── Divider ── */}
            <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 2rem' }}>
                <div style={{ borderTop: '1px solid rgba(10,37,64,0.1)' }} />
            </div>

            {/* ── Bottom Copyright Strip ── */}
            <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <span style={{ fontSize: '13px', color: '#94A3B8' }}>
                    © {new Date().getFullYear()} Voxiq Inc. All rights reserved.
                </span>
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                    {[
                        { label: 'Privacy Policy', to: '/terms' },
                        { label: 'Terms of Service', to: '/terms' },
                        { label: 'Cookie Policy', to: '#' },
                    ].map(({ label, to }) => (
                        <Link key={label} to={to}
                            style={{ fontSize: '13px', color: '#94A3B8', textDecoration: 'none', transition: 'color 0.15s' }}
                            onMouseEnter={e => { e.currentTarget.style.color = '#0D3B6E'; }}
                            onMouseLeave={e => { e.currentTarget.style.color = '#94A3B8'; }}>
                            {label}
                        </Link>
                    ))}
                </div>
            </div>

            {/* ── Scoped styles ── */}
            <style>{`
                .footer-link-v {
                    text-decoration: none;
                    color: #64748B;
                    font-size: 14px;
                    transition: color 0.15s ease;
                    line-height: 1.4;
                }
                .footer-link-v:hover {
                    color: #0D3B6E;
                }

                @media (max-width: 1024px) {
                    .footer-grid-voxiq {
                        grid-template-columns: 1fr 1fr 1fr !important;
                        gap: 36px !important;
                    }
                    .footer-grid-voxiq > div:first-child {
                        grid-column: span 3;
                    }
                }
                @media (max-width: 640px) {
                    .footer-grid-voxiq {
                        grid-template-columns: 1fr 1fr !important;
                        gap: 28px !important;
                    }
                    .footer-grid-voxiq > div:first-child {
                        grid-column: span 2;
                    }
                }
                @media (max-width: 400px) {
                    .footer-grid-voxiq {
                        grid-template-columns: 1fr !important;
                    }
                    .footer-grid-voxiq > div:first-child {
                        grid-column: span 1;
                    }
                }
            `}</style>
        </footer>
    );
}

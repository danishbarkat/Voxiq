import { Link } from 'react-router-dom';

// Custom inline SVG icons for social media
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

export default function Footer() {
    return (
        <footer style={{ background: '#FFFFFF', color: '#475569', fontFamily: "'Plus Jakarta Sans', sans-serif", borderTop: '1px solid #E2E8F0' }}>
            
            {/* Main Links Area */}
            <div className="container" style={{
                maxWidth: '1280px',
                margin: '0 auto',
                padding: '80px 2rem 60px',
                width: '100%',
                boxSizing: 'border-box'
            }}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr',
                    gap: '48px',
                }} className="footer-grid-upgraded">
                    
                    {/* Column 1: Brand */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'flex-start' }}>
                        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '6px',
                                background: '#7C6DFA',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontWeight: 900,
                                fontSize: '1rem'
                            }}>
                                V
                            </div>
                            <span style={{ fontWeight: 700, fontSize: '1.35rem', color: '#0F172A', letterSpacing: '-0.02em' }}>
                                Voxiq
                            </span>
                        </Link>
                        <p style={{ fontSize: '14px', lineHeight: '1.6', color: '#64748B', margin: 0, maxWidth: '240px' }}>
                            The power dialer built for serious sales teams.
                        </p>
                    </div>

                    {/* Column 2: Product */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <h4 style={{ fontSize: '11px', fontWeight: 700, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Product</h4>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <li><Link to="/features/inbound-calls" className="footer-link">Inbound Calls</Link></li>
                            <li><Link to="/features/outbound-calls" className="footer-link">Outbound Calls</Link></li>
                            <li><Link to="/features/auto-dialer" className="footer-link">Auto Dialer</Link></li>
                            <li><Link to="/features/manual-dialer" className="footer-link">Manual Dialer</Link></li>
                            <li><Link to="/features/call-recording" className="footer-link">Call Recording</Link></li>
                            <li><Link to="/features/sms" className="footer-link">SMS Follow-ups</Link></li>
                            <li><Link to="/features/whatsapp" className="footer-link">WhatsApp Sync</Link></li>
                            <li><Link to="/features/ai-agent" className="footer-link">AI Agent Caller</Link></li>
                            <li><Link to="/features/analytics" className="footer-link">Real-time Analytics</Link></li>
                            <li><Link to="/pricing" className="footer-link">Pricing Plans</Link></li>
                            <li><Link to="/how-it-works" className="footer-link">How It Works</Link></li>
                        </ul>
                    </div>

                    {/* Column 3: Integrations */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <h4 style={{ fontSize: '11px', fontWeight: 700, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Integrations</h4>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <li><Link to="/integrations" className="footer-link">GoHighLevel (GHL)</Link></li>
                            <li><Link to="/integrations" className="footer-link">Zapier Link</Link></li>
                            <li><Link to="/integrations" className="footer-link">View All Integrations</Link></li>
                        </ul>
                    </div>

                    {/* Column 4: Solutions */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <h4 style={{ fontSize: '11px', fontWeight: 700, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Solutions</h4>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <li><Link to="/solutions/sales-teams" className="footer-link">Sales Teams</Link></li>
                            <li><Link to="/solutions/sdr-teams" className="footer-link">SDR / BDR Teams</Link></li>
                            <li><Link to="/solutions/small-business" className="footer-link">Small Business</Link></li>
                            <li><Link to="/solutions/real-estate" className="footer-link">Real Estate</Link></li>
                            <li><Link to="/solutions/insurance" className="footer-link">Insurance Agencies</Link></li>
                            <li><Link to="/solutions/saas" className="footer-link">SaaS Companies</Link></li>
                            <li><Link to="/solutions/ghl-agencies" className="footer-link">GHL Agencies</Link></li>
                            <li><Link to="/solutions/enterprise" className="footer-link">Enterprise Dialer</Link></li>
                        </ul>
                    </div>

                    {/* Column 5: Company */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <h4 style={{ fontSize: '11px', fontWeight: 700, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Company</h4>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <li><Link to="#" className="footer-link">About Us</Link></li>
                            <li><Link to="/blog" className="footer-link">Blog & News</Link></li>
                            <li><Link to="#" className="footer-link">Careers</Link></li>
                            <li><Link to="#" className="footer-link">Security Center</Link></li>
                            <li><Link to="/terms" className="footer-link">Privacy Policy</Link></li>
                            <li><Link to="/terms" className="footer-link">Terms of Service</Link></li>
                            <li><Link to="#" className="footer-link">GDPR Compliance</Link></li>
                            <li><Link to="#" className="footer-link">TCPA Compliance</Link></li>
                        </ul>
                    </div>

                </div>
            </div>

            {/* Bottom copyright strip */}
            <div style={{ background: '#F8FAFC', padding: '24px 2rem', color: '#64748B', fontSize: '13px', borderTop: '1px solid #E2E8F0' }}>
                <div className="container" style={{
                    maxWidth: '1280px',
                    margin: '0 auto',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '16px',
                    width: '100%',
                    boxSizing: 'border-box'
                }}>
                    <span>© {new Date().getFullYear()} Voxiq. All rights reserved.</span>
                    
                    {/* Social Row */}
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <a href="#" aria-label="Voxiq on Twitter" style={{ color: '#64748B', transition: 'color 0.15s ease' }} className="social-icon-link">
                            <Twitter size={18} />
                        </a>
                        <a href="#" aria-label="Voxiq on LinkedIn" style={{ color: '#64748B', transition: 'color 0.15s ease' }} className="social-icon-link">
                            <Linkedin size={18} />
                        </a>
                        <a href="#" aria-label="Voxiq on YouTube" style={{ color: '#64748B', transition: 'color 0.15s ease' }} className="social-icon-link">
                            <Youtube size={18} />
                        </a>
                    </div>
                </div>
            </div>

            {/* Custom stylesheet overrides for responsive grid layout */}
            <style>{`
                .footer-link {
                    text-decoration: none;
                    color: #475569;
                    font-size: 14px;
                    transition: color 0.15s ease;
                }
                .footer-link:hover {
                    color: #6C47FF;
                }
                .social-icon-link:hover {
                    color: #6C47FF !important;
                }

                @media (max-width: 968px) {
                    .footer-grid-upgraded {
                        grid-template-columns: repeat(2, 1fr) !important;
                        gap: 36px !important;
                    }
                    .footer-grid-upgraded > div:first-child {
                        grid-column: span 2;
                    }
                }
                @media (max-width: 480px) {
                    .footer-grid-upgraded {
                        grid-template-columns: 1fr !important;
                        gap: 28px !important;
                    }
                    .footer-grid-upgraded > div:first-child {
                        grid-column: span 1;
                    }
                }
            `}</style>
        </footer>
    );
}

import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { 
  Phone, 
  PhoneIncoming,
  PhoneOutgoing, 
  Zap, 
  MousePointer, 
  Mic, 
  MessageSquare, 
  MessageCircle, 
  Bot, 
  BarChart2, 
  Link as LinkIcon, 
  ChevronDown, 
  Menu, 
  X,
  Users,
  Target,
  Building2,
  Briefcase,
  Home,
  Shield,
  Code2,
  DollarSign
} from 'lucide-react';

export default function Navbar() {
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [announcementDismissed, setAnnouncementDismissed] = useState(() => {
    try {
      return localStorage.getItem('voxiq_bar_dismissed') === 'true';
    } catch {
      return false;
    }
  });

  // Mega dropdown open states
  const [productsOpen, setProductsOpen] = useState(false);
  const [solutionsOpen, setSolutionsOpen] = useState(false);

  // Timeouts for hover delay
  const productsEnterTimer = useRef(null);
  const productsLeaveTimer = useRef(null);
  const solutionsEnterTimer = useRef(null);
  const solutionsLeaveTimer = useRef(null);

  // Mobile drawer accordion collapse states
  const [mobileProductsOpen, setMobileProductsOpen] = useState(false);
  const [mobileSolutionsOpen, setMobileSolutionsOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (productsEnterTimer.current) clearTimeout(productsEnterTimer.current);
      if (productsLeaveTimer.current) clearTimeout(productsLeaveTimer.current);
      if (solutionsEnterTimer.current) clearTimeout(solutionsEnterTimer.current);
      if (solutionsLeaveTimer.current) clearTimeout(solutionsLeaveTimer.current);
    };
  }, []);

  const handleDismiss = () => {
    try {
      localStorage.setItem('voxiq_bar_dismissed', 'true');
    } catch {}
    setAnnouncementDismissed(true);
  };

  // Products hover handlers
  const handleProductsEnter = () => {
    if (productsLeaveTimer.current) clearTimeout(productsLeaveTimer.current);
    if (solutionsLeaveTimer.current) clearTimeout(solutionsLeaveTimer.current);
    setSolutionsOpen(false);

    if (productsOpen) return;

    productsEnterTimer.current = setTimeout(() => {
      setProductsOpen(true);
    }, 200);
  };

  const handleProductsLeave = () => {
    if (productsEnterTimer.current) clearTimeout(productsEnterTimer.current);
    productsLeaveTimer.current = setTimeout(() => {
      setProductsOpen(false);
    }, 150);
  };

  // Solutions hover handlers
  const handleSolutionsEnter = () => {
    if (solutionsLeaveTimer.current) clearTimeout(solutionsLeaveTimer.current);
    if (productsLeaveTimer.current) clearTimeout(productsLeaveTimer.current);
    setProductsOpen(false);

    if (solutionsOpen) return;

    solutionsEnterTimer.current = setTimeout(() => {
      setSolutionsOpen(true);
    }, 200);
  };

  const handleSolutionsLeave = () => {
    if (solutionsEnterTimer.current) clearTimeout(solutionsEnterTimer.current);
    solutionsLeaveTimer.current = setTimeout(() => {
      setSolutionsOpen(false);
    }, 150);
  };

  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';

  return (
    <div style={{
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      width: '100%'
    }}>
      {/* ANNOUNCEMENT BAR — Ocean Breeze */}
      <div style={{
        maxHeight: announcementDismissed ? '0px' : '42px',
        opacity: announcementDismissed ? 0 : 1,
        overflow: 'hidden',
        background: '#0A2540',
        borderBottom: '1px solid rgba(127,205,255,0.15)',
        color: '#7FCDFF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '12px',
        fontWeight: 500,
        width: '100%',
        position: 'relative',
        padding: '0 40px',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        transition: 'all 0.2s ease',
        boxSizing: 'border-box',
        height: announcementDismissed ? '0px' : '42px'
      }}>
        <div style={{ textAlign: 'center', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} className="announcement-text-container">
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00E5A0', display: 'inline-block', animation: 'pulse-dot 2s infinite', flexShrink: 0 }} />
          <span className="announcement-desktop-text">
            ✦ AI Agent Caller is live — Let AI qualify your leads in under 60 seconds.{' '}
            <Link to="/features/ai-agent" className="announcement-link">Get early access →</Link>
          </span>
          <span className="announcement-mobile-text">
            ✦ AI Agent is live.{' '}
            <Link to="/features/ai-agent" className="announcement-link">Learn more →</Link>
          </span>
        </div>
        <button
          onClick={handleDismiss}
          aria-label="Dismiss Announcement"
          className="announcement-dismiss-btn"
          style={{
            position: 'absolute',
            right: '16px',
            background: 'none',
            border: 'none',
            color: '#2D5986',
            cursor: 'pointer',
            fontSize: '18px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4px',
            transition: 'color 0.15s ease'
          }}
        >
          &times;
        </button>
      </div>

      {/* NAVBAR — Ocean Breeze */}
      <nav style={{
        width: '100%',
        background: scrolled || isAuthPage ? 'rgba(255,255,255,0.98)' : 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: scrolled ? '1px solid #E2E8F0' : '1px solid #F1F5F9',
        transition: 'all 0.2s ease',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        position: 'relative'
      }}>
        <div className="container" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 2rem',
          maxWidth: '1280px',
          margin: '0 auto',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          {/* Logo */}
          <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontWeight: 700,
              fontSize: '22px',
              color: '#0A2540',
              letterSpacing: '-0.5px',
              fontFamily: "'Space Grotesk', sans-serif"
            }}>
              Vox<span style={{ color: '#0D3B6E' }}>iq</span>
            </span>
          </Link>

          {/* Center Links (Desktop) */}
          {!isAuthPage && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', height: '64px' }} className="nav-links">
              
              {/* Products Link with Dropdown */}
              <div 
                onMouseEnter={() => handleProductsEnter()}
                onMouseLeave={handleProductsLeave}
                style={{ height: '100%', display: 'flex', alignItems: 'center', position: 'static' }}
              >
                <span style={{ 
                  cursor: 'pointer', 
                  color: productsOpen ? '#0A2540' : '#475569', 
                  fontWeight: 500, 
                  fontSize: '14px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '4px',
                  padding: '0 16px',
                  height: '100%',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  transition: 'color 0.15s'
                }} className="nav-link-item">
                  Products <ChevronDown size={14} style={{ transform: productsOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.15s' }} />
                </span>

                {/* Products Dropdown — Clean Text Grid (RingCentral style) */}
                <div style={{
                  position: 'absolute',
                  top: '64px',
                  left: '50%',
                  transform: 'translateX(-50%)' + (productsOpen ? ' translateY(0)' : ' translateY(8px)'),
                  width: '980px',
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '20px',
                  boxShadow: '0 24px 48px rgba(10,37,64,0.1), 0 0 0 1px rgba(10,37,64,0.05)',
                  padding: '40px 48px 32px',
                  boxSizing: 'border-box',
                  zIndex: 999,
                  opacity: productsOpen ? 1 : 0,
                  pointerEvents: productsOpen ? 'auto' : 'none',
                  transition: 'opacity 0.15s ease, transform 0.15s ease',
                  textAlign: 'left'
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 64px' }}>

                    {/* Column 1: Calling */}
                    <div>
                      <p style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.14em', margin: '0 0 24px 0' }}>Calling</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {[
                          { title: 'Inbound Calls', path: '/features/inbound-calls' },
                          { title: 'Outbound Calls', path: '/features/outbound-calls' },
                          { title: 'Auto Dialer', path: '/features/auto-dialer' },
                          { title: 'Manual Dialer', path: '/features/manual-dialer' },
                          { title: 'Call Recording', path: '/features/call-recording' }
                        ].map((item, idx) => (
                          <Link to={item.path} key={idx} className="prod-text-link" onClick={() => setProductsOpen(false)}>
                            {item.title}
                          </Link>
                        ))}
                      </div>
                    </div>

                    {/* Column 2: Messaging & AI */}
                    <div>
                      <p style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.14em', margin: '0 0 24px 0' }}>Messaging & AI</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {[
                          { title: 'SMS', path: '/features/sms' },
                          { title: 'WhatsApp', path: '/features/whatsapp' },
                          { title: 'AI Agent Caller', path: '/features/ai-agent', badge: 'NEW' },
                          { title: 'Analytics Dashboard', path: '/features/analytics' }
                        ].map((item, idx) => (
                          <Link to={item.path} key={idx} className="prod-text-link" onClick={() => setProductsOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                            {item.title}
                            {item.badge && (
                              <span style={{
                                background: 'rgba(124,109,250,0.18)',
                                border: '1px solid rgba(124,109,250,0.3)',
                                color: '#A594F9',
                                fontSize: '9px',
                                padding: '1px 6px',
                                borderRadius: '20px',
                                fontWeight: 700,
                                letterSpacing: '0.06em',
                                flexShrink: 0
                              }}>{item.badge}</span>
                            )}
                          </Link>
                        ))}
                      </div>
                    </div>

                    {/* Column 3: Integrations */}
                    <div>
                      <p style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.14em', margin: '0 0 24px 0' }}>Integrations</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {[
                          { title: 'GoHighLevel (Native)', path: '/integrations' },
                          { title: 'Zapier', path: '/integrations/zapier' }
                        ].map((item, idx) => (
                          <Link to={item.path} key={idx} className="prod-text-link" onClick={() => setProductsOpen(false)}>
                            {item.title}
                          </Link>
                        ))}
                      </div>
                    </div>

                  </div>

                  {/* Bottom divider + all features link */}
                  <div style={{ borderTop: '1px solid #F1F5F9', marginTop: '20px', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                    <Link to="/features" onClick={() => setProductsOpen(false)} style={{
                      fontSize: '12px',
                      color: '#7C6DFA',
                      textDecoration: 'none',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'color 0.15s'
                    }} className="prod-all-features-link">
                      View all features →
                    </Link>
                  </div>
                </div>
              </div>

              {/* Solutions Link with Dropdown */}
              <div 
                onMouseEnter={() => handleSolutionsEnter()}
                onMouseLeave={handleSolutionsLeave}
                style={{ height: '100%', display: 'flex', alignItems: 'center', position: 'relative' }}
              >
                <span style={{ 
                  cursor: 'pointer', 
                  color: solutionsOpen ? '#0A2540' : '#475569', 
                  fontWeight: 500, 
                  fontSize: '14px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '4px',
                  padding: '0 16px',
                  height: '100%',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  transition: 'color 0.15s'
                }} className="nav-link-item">
                  Solutions <ChevronDown size={14} style={{ transform: solutionsOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.15s' }} />
                </span>

                {/* Solutions Dropdown Menu */}
                <div style={{
                  position: 'absolute',
                  top: '64px',
                  left: '50%',
                  transform: 'translateX(-50%)' + (solutionsOpen ? ' translateY(0)' : ' translateY(8px)'),
                  width: '720px',
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '16px',
                  boxShadow: '0 24px 48px rgba(10,37,64,0.1), 0 0 0 1px rgba(10,37,64,0.05)',
                  padding: '24px',
                  boxSizing: 'border-box',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 280px',
                  gap: '32px',
                  zIndex: 999,
                  opacity: solutionsOpen ? 1 : 0,
                  pointerEvents: solutionsOpen ? 'auto' : 'none',
                  transition: 'opacity 0.15s ease, transform 0.15s ease',
                  textAlign: 'left'
                }}>
                  {/* Column 1: By Team Type */}
                  <div>
                    <h4 style={{ fontSize: '11px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px', marginTop: 0 }}>By Team Type</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {[
                        { title: 'Sales Teams', desc: 'High-volume outbound & inbound', path: '/solutions/sales-teams', icon: <Users size={18} /> },
                        { title: 'SDR / BDR Teams', desc: 'Prospect faster, book more demos', path: '/solutions/sdr-teams', icon: <Target size={18} /> },
                        { title: 'Small Business', desc: 'Affordable calling for lean teams', path: '/solutions/small-business', icon: <Building2 size={18} /> },
                        { title: 'Enterprise', desc: 'Scale to thousands of reps', path: '/solutions/enterprise', icon: <Briefcase size={18} /> }
                      ].map((item, idx) => (
                        <Link to={item.path} key={idx} className="dropdown-card-item" onClick={() => setSolutionsOpen(false)}>
                          <div className="dropdown-card-icon-box">
                            {item.icon}
                          </div>
                          <div>
                            <div className="dropdown-card-title">{item.title}</div>
                            <div className="dropdown-card-desc">{item.desc}</div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* Column 2: By Industry */}
                  <div>
                    <h4 style={{ fontSize: '11px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px', marginTop: 0 }}>By Industry</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {[
                        { title: 'Real Estate', desc: 'Follow up on listings instantly', path: '/solutions/real-estate', icon: <Home size={18} /> },
                        { title: 'Insurance', desc: 'Reach more policy holders daily', path: '/solutions/insurance', icon: <Shield size={18} /> },
                        { title: 'SaaS Companies', desc: 'SDRs that book 2x more demos', path: '/solutions/saas', icon: <Code2 size={18} /> },
                        { title: 'Collections', desc: 'Compliant, high-volume outreach', path: '/solutions/collections', icon: <DollarSign size={18} /> },
                        { title: 'GHL Agencies', desc: 'White-label Voxiq for your clients', path: '/solutions/ghl-agencies', icon: <Zap size={18} /> }
                      ].map((item, idx) => (
                        <Link to={item.path} key={idx} className="dropdown-card-item" onClick={() => setSolutionsOpen(false)}>
                          <div className="dropdown-card-icon-box">
                            {item.icon}
                          </div>
                          <div>
                            <div className="dropdown-card-title">{item.title}</div>
                            <div className="dropdown-card-desc">{item.desc}</div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* Column 3: Featured Card */}
                  <div>
                    <div style={{
                      background: 'linear-gradient(135deg, rgba(124, 109, 250, 0.08) 0%, rgba(91, 79, 232, 0.04) 100%)',
                      border: '1px solid rgba(124, 109, 250, 0.15)',
                      borderRadius: '14px',
                      padding: '20px',
                      height: '100%',
                      boxSizing: 'border-box',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <span style={{
                            background: 'rgba(124, 109, 250, 0.15)',
                            border: '1px solid rgba(124, 109, 250, 0.25)',
                            color: '#7C6DFA',
                            fontSize: '10px',
                            fontWeight: 600,
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            padding: '3px 10px',
                            borderRadius: '20px'
                          }}>
                            Most Popular
                          </span>
                        </div>
                        <h5 style={{ margin: '10px 0 8px', fontSize: '15px', fontWeight: 600, color: '#0A2540' }}>Voxiq for GHL Agencies</h5>
                        <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#64748B', lineHeight: '1.6' }}>
                          Resell Voxiq to your GHL clients with white-label branding. Built natively for GHL workflows.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#64748B' }}>
                            <span style={{ color: '#10B981', fontWeight: 'bold' }}>✓</span> Native GHL 2-way sync
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#64748B' }}>
                            <span style={{ color: '#10B981', fontWeight: 'bold' }}>✓</span> White-label ready
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#64748B' }}>
                            <span style={{ color: '#10B981', fontWeight: 'bold' }}>✓</span> Client sub-accounts
                          </div>
                        </div>
                      </div>
                      <Link to="/solutions/ghl-agencies" onClick={() => setSolutionsOpen(false)} style={{
                        background: 'rgba(124, 109, 250, 0.08)',
                        border: '1px solid rgba(124, 109, 250, 0.15)',
                        color: '#7C6DFA',
                        borderRadius: '8px',
                        padding: '9px 16px',
                        fontSize: '13px',
                        fontWeight: 500,
                        width: '100%',
                        textAlign: 'center',
                        textDecoration: 'none',
                        display: 'block',
                        boxSizing: 'border-box',
                        transition: '0.15s'
                      }}
                      className="featured-learn-more-btn"
                      >
                        Learn more →
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              {/* Normal Links */}
              <Link to="/pricing" style={{ textDecoration: 'none', color: '#475569', fontWeight: 500, fontSize: '14px', padding: '0 16px', fontFamily: "'Plus Jakarta Sans', sans-serif", transition: 'color 0.15s' }} className="plain-nav-link">Pricing</Link>
              <Link to="/how-it-works" style={{ textDecoration: 'none', color: '#475569', fontWeight: 500, fontSize: '14px', padding: '0 16px', fontFamily: "'Plus Jakarta Sans', sans-serif", transition: 'color 0.15s' }} className="plain-nav-link">How It Works</Link>
            </div>
          )}

          {/* Right Side Buttons (Desktop) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <Link
              to="/login"
              style={{
                textDecoration: 'none',
                color: '#475569',
                fontWeight: 600,
                fontSize: '14px',
                transition: 'color 0.15s',
                fontFamily: "'Plus Jakarta Sans', sans-serif"
              }}
              className="login-link"
            >
              Login
            </Link>
            
            <Link
              to="/signup"
              style={{
                textDecoration: 'none',
                background: 'linear-gradient(135deg, #7FCDFF, #5BB8F5)',
                color: '#020D1A',
                border: 'none',
                padding: '10px 22px',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '14px',
                boxShadow: '0 0 20px rgba(127,205,255,0.25), 0 4px 12px rgba(127,205,255,0.15)',
                transition: 'all 0.2s ease',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxSizing: 'border-box'
              }}
              className="btn-trial"
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 0 32px rgba(127,205,255,0.45), 0 4px 20px rgba(127,205,255,0.3)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 0 20px rgba(127,205,255,0.25), 0 4px 12px rgba(127,205,255,0.15)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              Start Free Trial
            </Link>

            {/* Hamburger Button (Mobile Only) */}
            {!isAuthPage && (
              <button
                onClick={() => setMenuOpen(true)}
                aria-label="Open Menu Drawer"
                style={{
                  display: 'none',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px',
                  color: '#F1F5F9'
                }}
                className="hamburger-btn"
              >
                <Menu size={24} />
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* MOBILE NAV DRAWER */}
      {!isAuthPage && (
        <>
          {/* Backdrop Overlay */}
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.6)',
            zIndex: 1100,
            opacity: menuOpen ? 1 : 0,
            pointerEvents: menuOpen ? 'auto' : 'none',
            transition: 'opacity 0.3s ease'
          }} onClick={() => setMenuOpen(false)} />

          {/* Drawer container */}
          <div style={{
            position: 'fixed',
            top: 0,
            right: menuOpen ? 0 : '-100%',
            width: '320px',
            maxWidth: '85vw',
            height: '100vh',
            background: '#0B0F1A',
            borderLeft: '1px solid #1e2537',
            zIndex: 1200,
            boxShadow: '-10px 0 30px rgba(0, 0, 0, 0.5)',
            transition: 'right 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            display: 'flex',
            flexDirection: 'column',
            padding: '24px',
            boxSizing: 'border-box'
          }}>
            {/* Drawer Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
              <span style={{ fontWeight: 700, fontSize: '1.25rem', color: '#F1F5F9' }}>Voxiq</span>
              <button onClick={() => setMenuOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
                <X size={24} />
              </button>
            </div>

            {/* Drawer Links List */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
              
              {/* Products Mobile Collapse */}
              <div>
                <button 
                  onClick={() => setMobileProductsOpen(!mobileProductsOpen)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'none',
                    border: 'none',
                    color: '#F1F5F9',
                    fontWeight: 700,
                    fontSize: '15px',
                    padding: '8px 0',
                    cursor: 'pointer',
                    fontFamily: "'Plus Jakarta Sans', sans-serif"
                  }}
                >
                  Products
                  <ChevronDown size={16} style={{ transform: mobileProductsOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
                </button>
                {mobileProductsOpen && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingLeft: '16px', marginTop: '8px', borderLeft: '1.5px solid #1e2537' }}>
                    <h5 style={{ margin: '4px 0 2px', fontSize: '10px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Calling</h5>
                    <Link to="/features/inbound-calls" onClick={() => setMenuOpen(false)} style={{ textDecoration: 'none', color: '#94A3B8', fontSize: '13px', fontWeight: 600 }}>Inbound Calls</Link>
                    <Link to="/features/outbound-calls" onClick={() => setMenuOpen(false)} style={{ textDecoration: 'none', color: '#94A3B8', fontSize: '13px', fontWeight: 600 }}>Outbound Calls</Link>
                    <Link to="/features/auto-dialer" onClick={() => setMenuOpen(false)} style={{ textDecoration: 'none', color: '#94A3B8', fontSize: '13px', fontWeight: 600 }}>Auto Dialer</Link>
                    <Link to="/features/manual-dialer" onClick={() => setMenuOpen(false)} style={{ textDecoration: 'none', color: '#94A3B8', fontSize: '13px', fontWeight: 600 }}>Manual Dialer</Link>
                    <Link to="/features/call-recording" onClick={() => setMenuOpen(false)} style={{ textDecoration: 'none', color: '#94A3B8', fontSize: '13px', fontWeight: 600 }}>Call Recording</Link>
                    
                    <h5 style={{ margin: '8px 0 2px', fontSize: '10px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Messaging & AI</h5>
                    <Link to="/features/sms" onClick={() => setMenuOpen(false)} style={{ textDecoration: 'none', color: '#94A3B8', fontSize: '13px', fontWeight: 600 }}>SMS</Link>
                    <Link to="/features/whatsapp" onClick={() => setMenuOpen(false)} style={{ textDecoration: 'none', color: '#94A3B8', fontSize: '13px', fontWeight: 600 }}>WhatsApp</Link>
                    <Link to="/features/ai-agent" onClick={() => setMenuOpen(false)} style={{ textDecoration: 'none', color: '#94A3B8', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>AI Agent Caller <span style={{ fontSize: '8px', color: '#A594F9', background: 'rgba(124, 109, 250, 0.15)', padding: '1px 4px', borderRadius: '3px' }}>NEW</span></Link>
                    <Link to="/features/analytics" onClick={() => setMenuOpen(false)} style={{ textDecoration: 'none', color: '#94A3B8', fontSize: '13px', fontWeight: 600 }}>Analytics</Link>
                    
                    <h5 style={{ margin: '8px 0 2px', fontSize: '10px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Integrations</h5>
                    <Link to="/integrations" onClick={() => setMenuOpen(false)} style={{ textDecoration: 'none', color: '#94A3B8', fontSize: '13px', fontWeight: 600 }}>GoHighLevel (Native)</Link>
                    <Link to="/integrations/zapier" onClick={() => setMenuOpen(false)} style={{ textDecoration: 'none', color: '#94A3B8', fontSize: '13px', fontWeight: 600 }}>Zapier</Link>
                  </div>
                )}
              </div>

              {/* Solutions Mobile Collapse */}
              <div>
                <button 
                  onClick={() => setMobileSolutionsOpen(!mobileSolutionsOpen)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'none',
                    border: 'none',
                    color: '#F1F5F9',
                    fontWeight: 700,
                    fontSize: '15px',
                    padding: '8px 0',
                    cursor: 'pointer',
                    fontFamily: "'Plus Jakarta Sans', sans-serif"
                  }}
                >
                  Solutions
                  <ChevronDown size={16} style={{ transform: mobileSolutionsOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
                </button>
                {mobileSolutionsOpen && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingLeft: '16px', marginTop: '8px', borderLeft: '1.5px solid #1e2537' }}>
                    <h5 style={{ margin: '4px 0 2px', fontSize: '10px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>By Team Type</h5>
                    <Link to="/solutions/sales-teams" onClick={() => setMenuOpen(false)} style={{ textDecoration: 'none', color: '#94A3B8', fontSize: '13px', fontWeight: 600 }}>Sales Teams</Link>
                    <Link to="/solutions/sdr-teams" onClick={() => setMenuOpen(false)} style={{ textDecoration: 'none', color: '#94A3B8', fontSize: '13px', fontWeight: 600 }}>SDR / BDR Teams</Link>
                    <Link to="/solutions/small-business" onClick={() => setMenuOpen(false)} style={{ textDecoration: 'none', color: '#94A3B8', fontSize: '13px', fontWeight: 600 }}>Small Business</Link>
                    <Link to="/solutions/enterprise" onClick={() => setMenuOpen(false)} style={{ textDecoration: 'none', color: '#94A3B8', fontSize: '13px', fontWeight: 600 }}>Enterprise</Link>
                    
                    <h5 style={{ margin: '8px 0 2px', fontSize: '10px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>By Industry</h5>
                    <Link to="/solutions/real-estate" onClick={() => setMenuOpen(false)} style={{ textDecoration: 'none', color: '#94A3B8', fontSize: '13px', fontWeight: 600 }}>Real Estate</Link>
                    <Link to="/solutions/insurance" onClick={() => setMenuOpen(false)} style={{ textDecoration: 'none', color: '#94A3B8', fontSize: '13px', fontWeight: 600 }}>Insurance</Link>
                    <Link to="/solutions/saas" onClick={() => setMenuOpen(false)} style={{ textDecoration: 'none', color: '#94A3B8', fontSize: '13px', fontWeight: 600 }}>SaaS Companies</Link>
                    <Link to="/solutions/collections" onClick={() => setMenuOpen(false)} style={{ textDecoration: 'none', color: '#94A3B8', fontSize: '13px', fontWeight: 600 }}>Collections</Link>
                    <Link to="/solutions/ghl-agencies" onClick={() => setMenuOpen(false)} style={{ textDecoration: 'none', color: '#94A3B8', fontSize: '13px', fontWeight: 600 }}>GHL Agencies</Link>
                  </div>
                )}
              </div>

              <Link to="/pricing" onClick={() => setMenuOpen(false)} style={{ textDecoration: 'none', color: '#F1F5F9', fontWeight: 700, fontSize: '15px', padding: '8px 0', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Pricing</Link>
              <Link to="/how-it-works" onClick={() => setMenuOpen(false)} style={{ textDecoration: 'none', color: '#F1F5F9', fontWeight: 700, fontSize: '15px', padding: '8px 0', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>How It Works</Link>
            </div>

            {/* Mobile Drawer Bottom Action CTAs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid #1e2537', paddingTop: '20px', marginTop: '20px' }}>
              <Link to="/login" onClick={() => setMenuOpen(false)} style={{ textDecoration: 'none', color: '#94A3B8', fontWeight: 600, fontSize: '14px', textAlign: 'center', padding: '12px 0', border: '1px solid #1e2537', borderRadius: '8px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Login</Link>
              <Link to="/signup" onClick={() => setMenuOpen(false)} style={{ textDecoration: 'none', background: '#7C6DFA', color: 'white', fontWeight: 700, fontSize: '14px', textAlign: 'center', padding: '12px 0', borderRadius: '8px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Start Free Trial</Link>
            </div>
          </div>
        </>
      )}

      {/* Stylesheet overrides for hover effects & responsive layout */}
      <style>{`
        .announcement-link {
          color: #DFF7FF;
          text-decoration: none;
          font-weight: 600;
          border-bottom: 1px solid rgba(223,247,255,0.4);
          transition: all 0.15s ease;
        }
        .announcement-link:hover {
          color: #FFFFFF;
          border-bottom-color: #FFFFFF;
        }
        .announcement-dismiss-btn:hover {
          color: #7FCDFF !important;
        }

        .dropdown-card-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 10px;
          border: 1px solid transparent;
          text-decoration: none;
          transition: all 0.15s ease;
          box-sizing: border-box;
        }
        .dropdown-card-item:hover {
          background: #F1F5F9;
          border-color: #E2E8F0;
        }
        .dropdown-card-icon-box {
          width: 36px;
          height: 36px;
          background: #F1F5F9;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #0D3B6E;
          font-size: 18px;
          flex-shrink: 0;
          transition: all 0.15s ease;
        }
        .dropdown-card-item:hover .dropdown-card-icon-box {
          background: #E2E8F0;
        }
        .dropdown-card-title {
          font-size: 14px;
          font-weight: 500;
          color: #0A2540;
          transition: color 0.15s ease;
          line-height: 1.2;
        }
        .dropdown-card-item:hover .dropdown-card-title {
          color: #7C6DFA;
        }
        .dropdown-card-desc {
          font-size: 12px;
          color: #64748B;
          margin-top: 2px;
          line-height: 1.3;
        }
        .featured-learn-more-btn:hover {
          background: rgba(124,109,250,0.18) !important;
        }

        .prod-text-link {
          display: flex;
          align-items: center;
          font-size: 17px;
          font-weight: 400;
          color: #475569;
          text-decoration: none;
          padding: 11px 10px;
          border-radius: 8px;
          transition: color 0.12s ease, background 0.12s ease;
          line-height: 1.35;
          font-family: 'Plus Jakarta Sans', sans-serif;
          letter-spacing: -0.02em;
        }
        .prod-text-link:hover {
          color: #0A2540;
          background: #F1F5F9;
        }
        .prod-all-features-link:hover {
          color: #0A2540 !important;
        }

        .plain-integration-link {
          transition: color 0.15s ease;
        }
        .plain-integration-link:hover {
          color: #0A2540 !important;
        }
        .login-link:hover {
          color: #0A2540 !important;
        }
        .plain-nav-link:hover {
          color: #0A2540 !important;
        }
        .nav-link-item:hover {
          color: #0A2540 !important;
        }

        .announcement-desktop-text { display: inline; }
        .announcement-mobile-text { display: none; }

        @media (max-width: 968px) {
          .nav-links, .login-link, .btn-trial {
            display: none !important;
          }
          .hamburger-btn {
            display: flex !important;
          }
        }
        @media (max-width: 768px) {
          .announcement-desktop-text { display: none; }
          .announcement-mobile-text { display: inline; }
        }
      `}</style>
    </div>
  );
}

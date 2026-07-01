import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Footer from '../components/Footer';

// Custom fade animation wrapper for sections
function FadeInSection({ children }) {
  const [isVisible, setIsVisible] = useState(false);
  const domRef = useRef();

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    const { current } = domRef;
    if (current) observer.observe(current);

    return () => {
      if (current) observer.unobserve(current);
    };
  }, []);

  return (
    <div
      ref={domRef}
      className={`fade-in-section ${isVisible ? 'is-visible' : ''}`}
    >
      {children}
    </div>
  );
}

// Stateful FAQ Accordion Item with premium dark styling
function FaqAccordionItem({ question, answer, isOpen, onToggle }) {
  const contentRef = useRef(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setHeight(contentRef.current.scrollHeight);
    } else {
      setHeight(0);
    }
  }, [isOpen]);

  return (
    <div style={{
      background: isOpen ? '#F8FAFC' : '#FFFFFF',
      border: isOpen ? '1px solid rgba(108, 71, 255, 0.3)' : '1px solid #E2E8F0',
      borderRadius: '12px',
      padding: '20px 24px',
      marginBottom: '16px',
      transition: 'all 0.3s ease',
      boxShadow: isOpen ? '0 10px 25px rgba(108, 71, 255, 0.05)' : 'none'
    }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'none',
          border: 'none',
          textAlign: 'left',
          cursor: 'pointer',
          color: '#F1F5F9',
          fontWeight: 600,
          fontSize: '1.15rem',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          padding: 0
        }}
      >
        <span style={{ paddingRight: '24px' }}>{question}</span>
        <span style={{
          fontSize: '1.5rem',
          fontWeight: '400',
          color: '#6C47FF',
          width: '24px',
          height: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          {isOpen ? '−' : '+'}
        </span>
      </button>
      <div
        style={{
          height: `${height}px`,
          overflow: 'hidden',
          transition: 'height 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        <div
          ref={contentRef}
          style={{
            paddingTop: '12px',
            color: '#6B9AB8',
            fontSize: '0.975rem',
            lineHeight: '1.6',
            fontFamily: "'Plus Jakarta Sans', sans-serif"
          }}
        >
          {answer}
        </div>
      </div>
    </div>
  );
}

export default function Pricing() {
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'annual'
  const [openFaqIndex, setOpenFaqIndex] = useState(0); // Q1 open by default
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Smooth price transition trigger
  const handleToggle = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setBillingCycle(prev => prev === 'monthly' ? 'annual' : 'monthly');
      setIsTransitioning(false);
    }, 150);
  };

  const isMobile = windowWidth < 768;

  // Exact pricing math
  const priceStarter = billingCycle === 'annual' ? 39 : 49;
  const priceGrowth = billingCycle === 'annual' ? 79 : 99;

  // Comparison Matrix Data
  const comparisonFeatures = [
    { name: 'Power dialer', starter: '✓', growth: '✓', enterprise: '✓' },
    { name: 'Unlimited calls/day', starter: '—', growth: '✓', enterprise: '✓' },
    { name: 'SMS messaging', starter: '—', growth: '✓', enterprise: '✓' },
    { name: 'Voicemail drop', starter: '—', growth: '✓', enterprise: '✓' },
    { name: 'Live call coaching', starter: '—', growth: '✓', enterprise: '✓' },
    { name: 'AI call insights', starter: '—', growth: '✓', enterprise: '✓' },
    { name: 'CRM integration', starter: '—', growth: '✓', enterprise: '✓' },
    { name: 'Advanced analytics', starter: '—', growth: '✓', enterprise: '✓' },
    { name: 'API access', starter: '—', growth: '—', enterprise: '✓' },
    { name: 'SSO / SAML', starter: '—', growth: '—', enterprise: '✓' },
    { name: 'Dedicated account manager', starter: '—', growth: '—', enterprise: '✓' },
    { name: 'Custom integrations', starter: '—', growth: '—', enterprise: '✓' },
    { name: 'SLA guarantee', starter: '—', growth: '—', enterprise: '✓' },
    { name: '24/7 phone support', starter: '—', growth: '—', enterprise: '✓' }
  ];

  return (
    <div style={{ background: '#020D1A', minHeight: '100vh', overflowX: 'hidden' }}>

      {/* SECTION 1 — PAGE HEADER */}
      <section style={{ padding: '100px 0 60px', background: 'radial-gradient(circle at 50% -20%, rgba(124, 109, 250, 0.15) 0%, #0B0F1A 70%), #0B0F1A', textAlign: 'center' }}>
        <div className="container" style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 2rem' }}>
          <span style={{
            color: '#7C6DFA',
            fontSize: '0.85rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            display: 'inline-block',
            marginBottom: '16px',
            fontFamily: "'Plus Jakarta Sans', sans-serif"
          }}>
            PRICING
          </span>
          
          <h1 style={{
            fontSize: 'clamp(2.5rem, 5vw, 4rem)',
            fontWeight: 700,
            color: '#F1F5F9',
            letterSpacing: '-0.03em',
            marginBottom: '20px',
            fontFamily: "'Plus Jakarta Sans', sans-serif"
          }}>
            Simple pricing. No surprises.
          </h1>
          
          <p style={{
            fontSize: '1.2rem',
            color: '#6B9AB8',
            maxWidth: '650px',
            margin: '0 auto 40px',
            lineHeight: '1.6',
            fontFamily: "'Plus Jakarta Sans', sans-serif"
          }}>
            14-day free trial on all plans. No credit card required. Cancel anytime.
          </p>

          {/* Toggle Switch */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
            <span style={{ fontSize: '0.95rem', fontWeight: billingCycle === 'monthly' ? 600 : 500, color: billingCycle === 'monthly' ? '#F1F5F9' : '#64748B', transition: 'color 0.2s', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Monthly</span>
            
            <button
              onClick={handleToggle}
              style={{
                width: '64px',
                height: '34px',
                borderRadius: '999px',
                background: '#7C6DFA',
                border: 'none',
                position: 'relative',
                cursor: 'pointer',
                padding: '4px',
                transition: 'background 0.3s'
              }}
            >
              <div style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                background: 'white',
                position: 'absolute',
                top: '4px',
                left: billingCycle === 'annual' ? '34px' : '4px',
                transition: 'left 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)'
              }} />
            </button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: billingCycle === 'annual' ? 600 : 500, color: billingCycle === 'annual' ? '#F1F5F9' : '#64748B', transition: 'color 0.2s', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Annual</span>
              <span style={{
                background: 'rgba(16, 185, 129, 0.1)',
                color: '#10B981',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '999px',
                fontFamily: "'Plus Jakarta Sans', sans-serif"
              }}>
                Save 20%
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2 — THREE PRICING CARDS */}
      <section style={{ padding: '40px 0 80px', background: '#020D1A' }}>
        <div className="container" style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 2rem' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '32px',
            alignItems: 'stretch'
          }} className="pricing-grid">
            
            {/* CARD 1 — Starter */}
            <div style={{
              background: '#020D1A',
              border: '1px solid rgba(127,205,255,0.08)',
              borderRadius: '16px',
              padding: '32px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              height: '100%',
              transition: 'transform 0.3s ease, box-shadow 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6C47FF', display: 'inline-block' }} />
                  <h3 style={{ fontSize: '1.35rem', fontWeight: 600, color: '#F1F5F9', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Starter</h3>
                </div>
                <p style={{ fontSize: '0.85rem', color: '#6B9AB8', marginBottom: '24px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>For small teams getting started</p>
                
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'baseline', 
                  gap: '4px', 
                  marginBottom: '6px',
                  opacity: isTransitioning ? 0 : 1,
                  transition: 'opacity 0.3s ease'
                }}>
                  <span style={{ fontSize: '3rem', fontWeight: 700, color: '#F1F5F9', letterSpacing: '-0.02em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    ${priceStarter}
                  </span>
                  <span style={{ fontSize: '0.9rem', color: '#6B9AB8', fontWeight: 500, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>/seat/month</span>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#7C6DFA', fontWeight: 600, marginBottom: '24px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  14-day free trial · cancel anytime
                </div>

                <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '20px', marginBottom: '32px' }}>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {[
                      { inc: true, text: 'Up to 5 seats' },
                      { inc: true, text: 'Power dialer (100 calls/day per seat)' },
                      { inc: true, text: 'Pipedrive sync' },
                      { inc: true, text: 'Call recording (30-day storage)' },
                      { inc: true, text: 'Email support' },
                      { inc: false, text: 'SMS messaging' },
                      { inc: false, text: 'Live call coaching' },
                      { inc: false, text: 'AI call insights' }
                    ].map((feat, idx) => (
                      <li key={idx} style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px', 
                        fontSize: '0.9rem', 
                        color: feat.inc ? '#475569' : '#94A3B8', 
                        fontWeight: feat.inc ? 500 : 400,
                        fontFamily: "'Plus Jakarta Sans', sans-serif" 
                      }}>
                        <span style={{ 
                          color: feat.inc ? '#10B981' : '#94A3B8', 
                          fontWeight: 700,
                          fontSize: '1rem',
                          flexShrink: 0
                        }}>
                          {feat.inc ? '✓' : '✗'}
                        </span>
                        {feat.text}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <button
                onClick={() => navigate('/signup?plan=starter')}
                style={{
                  width: '100%',
                  background: 'transparent',
                  color: '#6C47FF',
                  border: '1.5px solid #6C47FF',
                  padding: '14px 24px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontFamily: "'Plus Jakarta Sans', sans-serif"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(124, 109, 250, 0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                Start Free Trial
              </button>
            </div>

            {/* CARD 2 — Growth (MOST POPULAR) */}
            <div style={{
              background: '#0D3B6E',
              border: '2px solid rgba(127, 205, 255, 0.25)',
              borderRadius: '16px',
              padding: '32px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              height: '100%',
              position: 'relative',
              transition: 'transform 0.3s ease, box-shadow 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 20px 40px rgba(13, 59, 110, 0.5), 0 0 40px rgba(127,205,255,0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
            >
              {/* Floating Badge */}
              <div style={{
                position: 'absolute',
                top: '-16px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: '#0D3B6E',
                border: '1px solid rgba(127, 205, 255, 0.35)',
                color: '#7FCDFF',
                padding: '6px 18px',
                borderRadius: '999px',
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                whiteSpace: 'nowrap'
              }}>
                Most Popular
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#7FCDFF', display: 'inline-block' }} />
                  <h3 style={{ fontSize: '1.35rem', fontWeight: 600, color: '#FFFFFF', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Growth</h3>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'rgba(127,205,255,0.7)', marginBottom: '24px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>For growing sales teams</p>
                
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'baseline', 
                  gap: '4px', 
                  marginBottom: '6px',
                  opacity: isTransitioning ? 0 : 1,
                  transition: 'opacity 0.3s ease'
                }}>
                  <span style={{ fontSize: '3rem', fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.02em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    ${priceGrowth}
                  </span>
                  <span style={{ fontSize: '0.9rem', color: 'rgba(127,205,255,0.7)', fontWeight: 500, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>/seat/month</span>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#7FCDFF', fontWeight: 600, marginBottom: '24px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  14-day free trial · cancel anytime
                </div>

                <div style={{ borderTop: '1px solid rgba(127,205,255,0.15)', paddingTop: '20px', marginBottom: '32px' }}>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {[
                      'Everything in Starter',
                      'Unlimited seats',
                      'Unlimited calls per day',
                      'Pipedrive & Zapier sync',
                      'Live call coaching (whisper, barge, listen)',
                      'Voicemail drop',
                      'SMS messaging',
                      'Advanced analytics dashboard',
                      'AI call insights',
                      'Priority chat support'
                    ].map((feat, idx) => (
                      <li key={idx} style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px', 
                        fontSize: '0.9rem', 
                        color: 'rgba(223,247,255,0.85)', 
                        fontWeight: 500,
                        fontFamily: "'Plus Jakarta Sans', sans-serif" 
                      }}>
                        <span style={{ 
                          color: '#00E5A0', 
                          fontWeight: 700,
                          fontSize: '1rem',
                          flexShrink: 0
                        }}>
                          ✓
                        </span>
                        {feat}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <button
                onClick={() => navigate('/signup?plan=growth')}
                style={{
                  width: '100%',
                  background: 'rgb(223, 247, 255)',
                  color: '#0A2540',
                  border: 'none',
                  padding: '16px 24px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 20px rgba(223,247,255,0.2)',
                  fontFamily: "'Plus Jakarta Sans', sans-serif"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#FFFFFF';
                  e.currentTarget.style.boxShadow = '0 8px 28px rgba(223,247,255,0.35)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgb(223, 247, 255)';
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(223,247,255,0.2)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                Start Free Trial
              </button>
            </div>

            {/* CARD 3 — Enterprise */}
            <div style={{
              background: '#020D1A',
              border: '1px solid rgba(127,205,255,0.08)',
              borderRadius: '16px',
              padding: '32px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              height: '100%',
              transition: 'transform 0.3s ease, box-shadow 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6C47FF', display: 'inline-block' }} />
                  <h3 style={{ fontSize: '1.35rem', fontWeight: 600, color: '#F1F5F9', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Enterprise</h3>
                </div>
                <p style={{ fontSize: '0.85rem', color: '#6B9AB8', marginBottom: '24px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>For large teams with custom needs</p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '44px' }}>
                  <span style={{ fontSize: '2.5rem', fontWeight: 700, color: '#F1F5F9', letterSpacing: '-0.02em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    Custom pricing
                  </span>
                  <span style={{ fontSize: '0.9rem', color: '#6B9AB8', fontWeight: 500, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Talk to our team for a quote</span>
                </div>

                <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '20px', marginBottom: '32px' }}>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {[
                      'Everything in Growth',
                      'Unlimited seats',
                      'Dedicated account manager',
                      'Custom CRM integrations & API access',
                      'SSO & advanced security (SAML, SCIM)',
                      'SLA guarantee (99.9% uptime)',
                      'Custom onboarding & training',
                      '24/7 phone & email support'
                    ].map((feat, idx) => (
                      <li key={idx} style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px', 
                        fontSize: '0.9rem', 
                        color: '#CBD5E1', 
                        fontWeight: 500,
                        fontFamily: "'Plus Jakarta Sans', sans-serif" 
                      }}>
                        <span style={{ 
                          color: '#10B981', 
                          fontWeight: 700,
                          fontSize: '1rem',
                          flexShrink: 0
                        }}>
                          ✓
                        </span>
                        {feat}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <button
                onClick={() => navigate('/signup?plan=enterprise')}
                style={{
                  width: '100%',
                  background: 'transparent',
                  color: '#6B9AB8',
                  border: '1px solid #CBD5E1',
                  padding: '16px 24px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontFamily: "'Plus Jakarta Sans', sans-serif"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#94A3B8';
                  e.currentTarget.style.color = '#0F172A';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#CBD5E1';
                  e.currentTarget.style.color = '#475569';
                }}
              >
                Contact Sales
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* SECTION 3 — COMPARISON TABLE */}
      <section style={{ padding: '80px 0 100px', background: '#020D1A', borderTop: '1px solid rgba(127,205,255,0.08)' }}>
        <div className="container" style={{ maxWidth: '1080px', margin: '0 auto', padding: '0 2rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <h2 style={{ fontSize: '2.25rem', fontWeight: 700, color: '#F1F5F9', letterSpacing: '-0.02em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Compare all features</h2>
          </div>

          {!isMobile ? (
            /* Desktop Comparison Table */
            <div style={{
              background: '#020D1A',
              border: '1px solid rgba(127,205,255,0.08)',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', borderSpacing: 0 }}>
                <thead>
                  <tr style={{ background: '#0A1628', color: '#F1F5F9', borderBottom: '1px solid rgba(127,205,255,0.08)', position: 'sticky', top: '64px', zIndex: 100 }}>
                    <th style={{ textAlign: 'left', padding: '20px 24px', fontSize: '0.95rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6B9AB8' }}>Feature</th>
                    <th style={{ textAlign: 'center', padding: '20px 24px', fontSize: '0.95rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', width: '22%', color: '#6B9AB8' }}>Starter</th>
                    <th style={{ textAlign: 'center', padding: '20px 24px', fontSize: '0.95rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', width: '22%', background: 'rgba(127,205,255, 0.05)', color: '#7FCDFF' }}>Growth</th>
                    <th style={{ textAlign: 'center', padding: '20px 24px', fontSize: '0.95rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', width: '22%', color: '#6B9AB8' }}>Enterprise</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonFeatures.map((row, idx) => (
                    <tr
                      key={idx}
                      style={{
                        background: idx % 2 === 0 ? '#111929' : '#0A1628',
                        borderBottom: '1px solid rgba(127,205,255,0.08)',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#1D2A44'}
                      onMouseLeave={(e) => e.currentTarget.style.background = idx % 2 === 0 ? '#111929' : '#0A1628'}
                    >
                      <td style={{ padding: '18px 24px', fontWeight: 600, color: '#F1F5F9', fontSize: '0.95rem' }}>{row.name}</td>
                      <td style={{ padding: '18px 24px', textAlign: 'center', color: row.starter === '✓' ? '#10B981' : '#94A3B8', fontSize: '1.1rem', fontWeight: 700 }}>{row.starter}</td>
                      <td style={{ padding: '18px 24px', textAlign: 'center', color: row.growth === '✓' ? '#10B981' : '#94A3B8', fontSize: '1.1rem', fontWeight: 700, background: 'rgba(108, 71, 255, 0.02)' }}>{row.growth}</td>
                      <td style={{ padding: '18px 24px', textAlign: 'center', color: row.enterprise === '✓' ? '#10B981' : '#94A3B8', fontSize: '1.1rem', fontWeight: 700 }}>{row.enterprise}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Mobile Comparison Accordion */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {comparisonFeatures.map((row, idx) => (
                <div
                  key={idx}
                  style={{
                    background: '#020D1A',
                    border: '1px solid rgba(127,205,255,0.08)',
                    borderRadius: '12px',
                    padding: '20px',
                    boxShadow: '0 10px 20px rgba(108,71,255,0.05)'
                  }}
                >
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#F1F5F9', borderBottom: '1px solid #E2E8F0', paddingBottom: '10px', marginBottom: '12px' }}>{row.name}</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ color: '#6B9AB8', fontWeight: 500 }}>Starter:</span>
                      <span style={{ color: row.starter === '✓' ? '#10B981' : '#94A3B8', fontWeight: 700 }}>{row.starter}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', background: 'rgba(108, 71, 255, 0.08)', padding: '6px 8px', borderRadius: '6px' }}>
                      <span style={{ color: '#6C47FF', fontWeight: 600 }}>Growth (Popular):</span>
                      <span style={{ color: row.growth === '✓' ? '#10B981' : '#94A3B8', fontWeight: 700 }}>{row.growth}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ color: '#6B9AB8', fontWeight: 500 }}>Enterprise:</span>
                      <span style={{ color: row.enterprise === '✓' ? '#10B981' : '#94A3B8', fontWeight: 700 }}>{row.enterprise}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* SECTION 4 — FAQ ACCORDION */}
      <section style={{ padding: '100px 0', background: '#020D1A', borderTop: '1px solid #E5E7EB' }}>
        <div className="container" style={{ maxWidth: '800px', margin: '0 auto', padding: '0 2rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 700, color: '#F1F5F9', letterSpacing: '-0.02em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Frequently asked questions</h2>
            <p style={{ fontSize: '1.1rem', color: '#6B9AB8', marginTop: '12px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Can't find the answer? Talk to our team.</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {[
              {
                q: "Is there a free trial?",
                a: "Yes. Every plan comes with a 14-day free trial. No credit card required."
              },
              {
                q: "Can I change plans later?",
                a: "Absolutely. Upgrade or downgrade anytime from your account settings. Changes apply immediately."
              },
              {
                q: "How does per-seat pricing work?",
                a: "Each seat is one sales rep login. You only pay for active seats. Add or remove seats anytime."
              },
              {
                q: "Which CRMs does Voxiq integrate with?",
                a: "Starter includes GHL and Pipedrive. Growth and Enterprise include Zapier and more. Enterprise plans support custom integrations."
              },
              {
                q: "Is my data secure?",
                a: "All calls and data are encrypted in transit and at rest. We are GDPR compliant and pursuing SOC 2 Type II certification."
              },
              {
                q: "Do you offer volume discounts?",
                a: "Yes. Contact sales for teams of 20+ seats. We also offer nonprofit and startup discounts."
              }
            ].map((faq, i) => (
              <FaqAccordionItem
                key={i}
                question={faq.q}
                answer={faq.a}
                isOpen={openFaqIndex === i}
                onToggle={() => setOpenFaqIndex(openFaqIndex === i ? -1 : i)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 5 — BOTTOM CTA */}
      <FadeInSection>
        <section style={{ padding: '100px 0', background: '#020D1A', borderTop: '1px solid #1e2537' }}>
          <div className="container" style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 2rem' }}>
            <div style={{
              background: '#111929',
              border: '1px solid #1e2537',
              borderRadius: '24px',
              padding: '80px 40px',
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 30px 60px rgba(0, 0, 0, 0.4), 0 0 40px rgba(124, 109, 250, 0.05)'
            }}>
              {/* Background abstract radial details */}
              <div style={{
                position: 'absolute',
                top: '-40%',
                left: '-20%',
                width: '400px',
                height: '400px',
                background: 'rgba(124, 109, 250, 0.1)',
                borderRadius: '50%',
                filter: 'blur(100px)',
                pointerEvents: 'none'
              }} />
              <div style={{
                position: 'absolute',
                bottom: '-40%',
                right: '-20%',
                width: '400px',
                height: '400px',
                background: 'rgba(124, 109, 250, 0.1)',
                borderRadius: '50%',
                filter: 'blur(100px)',
                pointerEvents: 'none'
              }} />

              <h2 style={{
                fontSize: 'clamp(2rem, 4vw, 3rem)',
                fontWeight: 700,
                color: '#F1F5F9',
                marginBottom: '20px',
                letterSpacing: '-0.02em',
                position: 'relative',
                zIndex: 1,
                fontFamily: "'Plus Jakarta Sans', sans-serif"
              }}>
                Still not sure? Try free for 14 days.
              </h2>
              
              <p style={{
                fontSize: '1.2rem',
                color: '#6B9AB8',
                maxWidth: '650px',
                margin: '0 auto 40px',
                lineHeight: '1.6',
                position: 'relative',
                zIndex: 1,
                fontFamily: "'Plus Jakarta Sans', sans-serif"
              }}>
                Full access to Growth plan features. No credit card. No commitment.
              </p>

              <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', position: 'relative', zIndex: 1 }} className="cta-buttons">
                <Link
                  to="/signup?plan=growth"
                  style={{
                    textDecoration: 'none',
                    background: '#7C6DFA',
                    color: 'white',
                    padding: '18px 38px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '1.05rem',
                    boxShadow: '0 8px 24px rgba(124, 109, 250, 0.35)',
                    transition: 'all 0.2s',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    textAlign: 'center',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#5B4FE8';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 12px 28px rgba(124, 109, 250, 0.45)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#7C6DFA';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(124, 109, 250, 0.35)';
                  }}
                >
                  Start Free Trial
                </Link>
                <button
                  onClick={() => navigate('/signup?plan=enterprise')}
                  style={{
                    background: 'transparent',
                    color: '#94A3B8',
                    border: '1.5px solid #1e2537',
                    padding: '18px 38px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '1.05rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontFamily: "'Plus Jakarta Sans', sans-serif"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#253047';
                    e.currentTarget.style.color = '#F1F5F9';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#1e2537';
                    e.currentTarget.style.color = '#94A3B8';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  Talk to Sales
                </button>
              </div>
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* FOOTER */}
      <Footer />

      {/* Global CSS elements and responsive support overrides */}
      <style>{`
        .fade-in-section {
          opacity: 0;
          transform: translateY(30px);
          transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
          will-change: opacity, transform;
        }

        .fade-in-section.is-visible {
          opacity: 1;
          transform: translateY(0);
        }

        @media (max-width: 968px) {
          .pricing-grid {
            grid-template-columns: 1fr !important;
            gap: 48px !important;
            padding: 0 10px;
          }
          .pricing-grid > div:nth-child(2) {
            transform: scale(1) !important;
            order: -1; /* Keep most popular Growth first on mobile lists */
            margin-bottom: 12px;
          }
          .pricing-grid > div:hover {
            transform: translateY(-4px) !important;
          }
          .cta-buttons {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .cta-buttons > * {
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}

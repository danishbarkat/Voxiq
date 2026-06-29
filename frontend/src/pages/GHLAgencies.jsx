import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';
import { 
  Check, 
  ArrowRight, 
  Zap, 
  Phone, 
  X,
  Users,
  Building,
  DollarSign
} from 'lucide-react';

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

export default function GHLAgencies() {
  const navigate = useNavigate();

  return (
    <div style={{ background: '#020D1A', minHeight: '100vh', overflowX: 'hidden', color: '#F1F5F9', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      
      {/* 1. HERO SECTION */}
      <section style={{ 
        padding: '120px 0 80px', 
        background: 'radial-gradient(circle at 50% -20%, rgba(124, 109, 250, 0.15) 0%, #0B0F1A 70%)',
        position: 'relative'
      }}>
        <div className="container" style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 2rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '60px', alignItems: 'center' }} className="hero-grid-solutions">
            <div>
              <span style={{
                color: '#A594F9',
                fontSize: '0.85rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                background: 'rgba(124, 109, 250, 0.1)',
                border: '1px solid rgba(124, 109, 250, 0.2)',
                padding: '6px 16px',
                borderRadius: '999px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '24px'
              }}>
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#7C6DFA',
                  display: 'inline-block',
                  animation: 'pulse-dot 1.5s infinite'
                }}></span>
                GHL Agencies
              </span>
              
              <h1 style={{
                fontSize: 'clamp(2.5rem, 4.5vw, 3.75rem)',
                fontWeight: 700,
                color: '#F1F5F9',
                letterSpacing: '-0.03em',
                marginBottom: '24px',
                lineHeight: '1.15'
              }}>
                Add a premium dialer to your GHL agency stack. White-label ready.
              </h1>
              
              <p style={{
                fontSize: '1.15rem',
                color: '#CBD5E1',
                lineHeight: '1.7',
                marginBottom: '20px',
                maxWidth: '560px'
              }}>
                Built natively for GoHighLevel. Resell Voxiq to your GHL clients under your own brand — with 2-way sync, workflow triggers, and pipeline automation that your clients will love.
              </p>

              {/* Special Note Card */}
              <div style={{
                background: 'rgba(124, 109, 250, 0.08)',
                border: '1px solid rgba(124, 109, 250, 0.2)',
                borderRadius: '8px',
                padding: '12px 16px',
                marginBottom: '32px',
                fontSize: '13px',
                color: '#CBD5E1',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                maxWidth: '560px'
              }}>
                <span style={{ color: '#7C6DFA', fontWeight: 'bold' }}>✦</span> Voxiq is the only dialer with true native GHL integration — not a Zapier workaround.
              </div>

              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <Link
                  to="/signup"
                  style={{
                    textDecoration: 'none',
                    background: '#7C6DFA',
                    color: 'white',
                    padding: '16px 36px',
                    borderRadius: '10px',
                    fontWeight: 600,
                    fontSize: '1rem',
                    boxShadow: '0 8px 24px rgba(124, 109, 250, 0.25)',
                    transition: 'all 0.2s',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#5B4FE8';
                    e.currentTarget.style.boxShadow = '0 12px 28px rgba(124, 109, 250, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#7C6DFA';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(124, 109, 250, 0.25)';
                  }}
                >
                  Start Free Trial
                </Link>
                <a
                  href="#how-it-works"
                  style={{
                    textDecoration: 'none',
                    background: 'transparent',
                    color: '#94A3B8',
                    border: '1px solid #1e2537',
                    padding: '16px 36px',
                    borderRadius: '10px',
                    fontWeight: 600,
                    fontSize: '1rem',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#2e3a4f';
                    e.currentTarget.style.color = '#F1F5F9';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#1e2537';
                    e.currentTarget.style.color = '#94A3B8';
                  }}
                >
                  See How It Works
                </a>
              </div>
            </div>

            {/* Hero Mockup */}
            <div style={{
              background: '#111929',
              border: '1px solid #1e2537',
              borderRadius: '16px',
              boxShadow: '0 30px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(124, 109, 250, 0.08)',
              padding: '24px'
            }} className="hero-mockup-container">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #1e2537', paddingBottom: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#6B9AB8' }}>GoHighLevel Integration Link</span>
                <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>Synced</span>
              </div>
              <div style={{ background: '#020D1A', border: '1px solid #1e2537', borderRadius: '8px', padding: '16px' }}>
                <div style={{ fontSize: '11px', color: '#6B9AB8', textTransform: 'uppercase', marginBottom: '6px' }}>Active Workspace</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#F1F5F9' }}>Agency White-Label: Active</div>
                <div style={{ fontSize: '13px', color: '#7C6DFA', marginTop: '4px' }}>Custom Domain: dialer.myagency.com</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. STATS BAR */}
      <section style={{ borderTop: '1px solid #1e2537', borderBottom: '1px solid #1e2537', background: '#020D1A', padding: '32px 0' }}>
        <div className="container" style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 2rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '40px', textAlign: 'center' }} className="stats-row">
            {[
              { val: 'Native', desc: 'GHL 2-way sync — not Zapier' },
              { val: 'White-label', desc: 'Your brand, your pricing' },
              { val: '2-way', desc: 'Contacts, pipelines & workflows' }
            ].map((st, i) => (
              <div key={i}>
                <h3 style={{ fontSize: '2.5rem', fontWeight: 700, color: '#F1F5F9', margin: '0 0 6px 0', letterSpacing: '-0.03em' }}>{st.val}</h3>
                <p style={{ fontSize: '14px', color: '#6B9AB8', margin: 0 }}>{st.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. PAIN POINTS SECTION */}
      <FadeInSection>
        <section style={{ padding: '80px 0', background: '#020D1A' }}>
          <div className="container" style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 2rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '60px' }}>
              <h2 style={{ fontSize: '2.25rem', fontWeight: 700, color: '#F1F5F9', letterSpacing: '-0.02em' }}>The problems GHL agencies face</h2>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '30px' }} className="benefits-grid">
              {[
                {
                  title: 'Your clients need a dialer but Zapier-based solutions are flaky',
                  desc: 'Most \'GHL integrations\' are just Zapier workflows that break. Your clients lose data, miss follow-ups, and blame your agency.'
                },
                {
                  title: 'You\'re leaving revenue on the table with every GHL client',
                  desc: 'Every GHL client you have needs outbound calling. Without a white-label dialer, that revenue goes to a competitor.'
                },
                {
                  title: 'Managing dialer tools separately from GHL is a nightmare',
                  desc: 'Switching between 3 tools to manage contacts, calls, and follow-up loses context and wastes client time.'
                }
              ].map((p, idx) => (
                <div key={idx} style={{
                  background: '#111929',
                  border: '1px solid #1e2537',
                  borderLeft: '2px solid #EF4444',
                  borderRadius: '16px',
                  padding: '32px'
                }}>
                  <div style={{ color: '#EF4444', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <X size={20} />
                    <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Problem</span>
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#F1F5F9', marginBottom: '12px' }}>{p.title}</h3>
                  <p style={{ fontSize: '0.95rem', color: '#6B9AB8', lineHeight: '1.7', margin: 0 }}>{p.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* 4. HOW VOXIQ SOLVES IT */}
      <FadeInSection>
        <section style={{ padding: '80px 0', background: '#020D1A', borderTop: '1px solid #1e2537', borderBottom: '1px solid #1e2537' }}>
          <div className="container" style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 2rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '60px' }}>
              <h2 style={{ fontSize: '2.25rem', fontWeight: 700, color: '#F1F5F9', letterSpacing: '-0.02em' }}>How Voxiq solves it</h2>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '30px' }} className="benefits-grid">
              {[
                {
                  title: 'True Native GHL Integration',
                  desc: 'Voxiq connects directly to GHL\'s API — not through Zapier. 2-way contact sync, workflow triggers, and pipeline updates work reliably, every time.'
                },
                {
                  title: 'White-Label Ready',
                  desc: 'Rebrand Voxiq with your agency name and logo. Your clients see your brand — you capture the recurring revenue.'
                },
                {
                  title: 'Client Sub-Accounts',
                  desc: 'Manage all your GHL clients from one Voxiq agency dashboard. Separate workspaces, separate billing, full visibility.'
                }
              ].map((s, idx) => (
                <div key={idx} style={{
                  background: '#111929',
                  border: '1px solid #1e2537',
                  borderLeft: '2px solid #7C6DFA',
                  borderRadius: '16px',
                  padding: '32px'
                }}>
                  <div style={{ color: '#7C6DFA', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Zap size={16} />
                    <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Solution</span>
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#F1F5F9', marginBottom: '12px' }}>{s.title}</h3>
                  <p style={{ fontSize: '0.95rem', color: '#6B9AB8', lineHeight: '1.7', margin: 0 }}>{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* 5. FEATURE DEEP DIVE */}
      <FadeInSection>
        <section id="how-it-works" style={{ padding: '100px 0', background: '#020D1A' }}>
          <div className="container" style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 2rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '80px' }}>
              
              {/* Section A */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px', alignItems: 'center' }} className="feature-row">
                <div>
                  <h2 style={{ fontSize: '2.25rem', fontWeight: 700, color: '#F1F5F9', marginBottom: '20px', lineHeight: '1.2', letterSpacing: '-0.02em' }}>
                    Everything your GHL clients need — in one place
                  </h2>
                  <p style={{ fontSize: '1.1rem', color: '#6B9AB8', lineHeight: '1.7', marginBottom: '24px' }}>
                    Inbound calls, outbound power dialing, SMS, WhatsApp, AI Agent Caller, and analytics — all natively synced with GHL. Every call outcome updates the GHL contact. Every workflow trigger fires correctly. No data loss. No missed follow-ups.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {[
                      '2-way contact sync with GHL',
                      'Call outcomes trigger GHL workflows',
                      'Pipeline stage updates after calls',
                      'SMS & WhatsApp logs in GHL timeline',
                      'AI Agent integrates with GHL automations',
                      'Appointment booking to GHL calendar'
                    ].map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Check size={16} color="#7C6DFA" style={{ flexShrink: 0 }} />
                        <span style={{ fontSize: '15px', color: '#CBD5E1' }}>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{
                  background: '#111929',
                  border: '1px solid #1e2537',
                  borderRadius: '20px',
                  padding: '24px',
                  boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)'
                }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#CBD5E1', marginBottom: '12px' }}>GHL Native Workflow Action</div>
                  <div style={{ background: '#020D1A', border: '1px solid #1e2537', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
                    <div style={{ fontSize: '11px', color: '#6B9AB8' }}>Action Trigger</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#F1F5F9', marginTop: '2px' }}>Voxiq: Trigger AI Outbound Call</div>
                  </div>
                  <div style={{ background: '#020D1A', border: '1px solid #1e2537', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ fontSize: '11px', color: '#6B9AB8' }}>Update Pipeline Stage</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#F1F5F9', marginTop: '2px' }}>Move to: Dialed - No Answer</div>
                  </div>
                </div>
              </div>

              {/* Section B */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px', alignItems: 'center' }} className="feature-row">
                <div style={{
                  background: '#111929',
                  border: '1px solid #1e2537',
                  borderRadius: '20px',
                  padding: '24px',
                  boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)',
                  order: 0
                }} className="deep-dive-order-override">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#F1F5F9' }}>Agency Margin Calculator</span>
                    <span style={{ color: '#10B981', fontSize: '12px', fontWeight: 600 }}>Active</span>
                  </div>
                  <div style={{ background: '#020D1A', border: '1px solid #1e2537', borderRadius: '8px', padding: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
                      <span style={{ color: '#6B9AB8' }}>Wholesale Price / seat</span>
                      <span style={{ color: '#F1F5F9' }}>$49/mo</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
                      <span style={{ color: '#6B9AB8' }}>Your Resale Price / seat</span>
                      <span style={{ color: '#7C6DFA', fontWeight: 600 }}>$149/mo</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', borderTop: '1px solid #1e2537', paddingTop: '8px', fontWeight: 700 }}>
                      <span style={{ color: '#6B9AB8' }}>Predictable Agency MRR</span>
                      <span style={{ color: '#10B981' }}>+$5,000/mo</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h2 style={{ fontSize: '2.25rem', fontWeight: 700, color: '#F1F5F9', marginBottom: '20px', lineHeight: '1.2', letterSpacing: '-0.02em' }}>
                    Build a recurring revenue stream for your agency
                  </h2>
                  <p style={{ fontSize: '1.1rem', color: '#6B9AB8', lineHeight: '1.7', marginBottom: '24px' }}>
                    Add Voxiq to your agency\'s SaaS stack. White-label it under your brand. Charge your clients $X/month per seat and pay Voxiq wholesale pricing. Most agencies charge $97-197/seat and keep the margin. With 10 clients each running 5 seats, that\'s a predictable $5,000-10,000 MRR from one tool.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                    {[
                      'Wholesale agency pricing',
                      'Your brand, your pricing',
                      'One dashboard for all clients',
                      'Priority agency support',
                      'Co-marketing opportunities'
                    ].map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Check size={16} color="#7C6DFA" style={{ flexShrink: 0 }} />
                        <span style={{ fontSize: '15px', color: '#CBD5E1' }}>{item}</span>
                      </div>
                    ))}
                  </div>
                  <Link to="/signup" style={{
                    display: 'inline-block',
                    background: 'rgba(124,109,250,0.1)',
                    border: '1px solid rgba(124,109,250,0.25)',
                    color: '#A594F9',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontWeight: 600,
                    fontSize: '14px',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(124,109,250,0.2)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(124,109,250,0.1)'}
                  >
                    Apply for Agency Program →
                  </Link>
                </div>
              </div>

            </div>
          </div>
        </section>
      </FadeInSection>

      {/* SPECIAL AGENCY PRICING TEASER SECTION */}
      <FadeInSection>
        <section style={{ padding: '80px 0', background: '#020D1A', borderTop: '1px solid #1e2537' }}>
          <div className="container" style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 2rem' }}>
            <div style={{
              background: '#111929',
              border: '1px solid #1e2537',
              borderRadius: '20px',
              padding: '40px',
              boxShadow: '0 15px 35px rgba(0, 0, 0, 0.4)'
            }}>
              <h3 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#F1F5F9', marginBottom: '24px', textAlign: 'center' }}>
                Agency pricing that scales with you
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[
                  { tier: 'Starter Agency', cap: 'Up to 5 client accounts' },
                  { tier: 'Growth Agency', cap: 'Up to 25 client accounts' },
                  { tier: 'Enterprise Agency', cap: 'Unlimited client accounts' }
                ].map((row, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#020D1A',
                    border: '1px solid #1e2537',
                    padding: '16px 24px',
                    borderRadius: '8px'
                  }} className="agency-tier-row">
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: '#F1F5F9' }}>{row.tier}</div>
                      <div style={{ fontSize: '13px', color: '#6B9AB8', marginTop: '2px' }}>{row.cap}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <span style={{ fontSize: '14px', color: '#CBD5E1' }}>Contact us for pricing</span>
                      <button 
                        onClick={() => navigate('/signup')}
                        style={{
                          background: '#7C6DFA',
                          border: 'none',
                          color: 'white',
                          padding: '10px 20px',
                          borderRadius: '6px',
                          fontWeight: 600,
                          fontSize: '13px',
                          cursor: 'pointer'
                        }}
                      >
                        Contact us
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* 6. TESTIMONIAL */}
      <FadeInSection>
        <section style={{ padding: '80px 0', background: '#020D1A' }}>
          <div className="container" style={{ maxWidth: '900px', margin: '0 auto', padding: '0 2rem' }}>
            <div style={{
              background: 'rgba(124, 109, 250, 0.06)',
              border: '1px solid rgba(124, 109, 250, 0.15)',
              borderRadius: '16px',
              padding: '40px',
              textAlign: 'center',
              position: 'relative'
            }}>
              <span style={{
                position: 'absolute',
                top: '10px',
                left: '20px',
                fontSize: '120px',
                color: '#7C6DFA',
                opacity: 0.15,
                lineHeight: 1,
                userSelect: 'none',
                pointerEvents: 'none'
              }}>“</span>
              <p style={{
                fontSize: '1.25rem',
                color: '#CBD5E1',
                lineHeight: '1.7',
                fontStyle: 'italic',
                marginBottom: '24px',
                position: 'relative',
                zIndex: 1
              }}>
                "We added Voxiq to our GHL agency package 3 months ago. We now have 18 clients using it at $147/seat. It's become our highest-margin product and the feature our clients ask about most."
              </p>
              <div style={{ fontWeight: 600, color: '#F1F5F9', fontSize: '15px' }}>Agency Owner</div>
              <div style={{ color: '#6B9AB8', fontSize: '13px', marginTop: '4px' }}>GHL Certified Partner</div>
              
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                color: '#10B981',
                fontSize: '13px',
                fontWeight: 600,
                padding: '6px 14px',
                borderRadius: '20px',
                marginTop: '24px'
              }}>
                ✓ Highest-margin SaaS product
              </div>
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* 8. BOTTOM CTA */}
      <FadeInSection>
        <section style={{ padding: '100px 0', background: 'radial-gradient(circle at 50% 120%, rgba(124, 109, 250, 0.15) 0%, #0B0F1A 60%)', borderTop: '1px solid #1e2537' }}>
          <div className="container" style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 2rem', textAlign: 'center' }}>
            <div style={{
              background: '#111929',
              border: '1px solid #1e2537',
              borderRadius: '24px',
              padding: '60px 40px',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4), 0 0 30px rgba(124, 109, 250, 0.05)',
              maxWidth: '900px',
              margin: '0 auto',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <h2 style={{ fontSize: 'clamp(2rem, 3.5vw, 2.75rem)', fontWeight: 700, color: '#F1F5F9', marginBottom: '16px', letterSpacing: '-0.02em' }}>
                Ready to launch your own branded dialer? — free for 14 days
              </h2>
              <p style={{ fontSize: '1.1rem', color: '#6B9AB8', marginBottom: '32px', maxWidth: '600px', margin: '0 auto 32px' }}>
                Set up your white-label agency portal in under 10 minutes.
              </p>
              <Link
                to="/signup"
                style={{
                  background: '#7C6DFA',
                  color: 'white',
                  padding: '16px 40px',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '1rem',
                  textDecoration: 'none',
                  boxShadow: '0 8px 24px rgba(124, 109, 250, 0.35)',
                  display: 'inline-block',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#5B4FE8';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#7C6DFA';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                Apply for Agency Program
              </Link>
            </div>
          </div>
        </section>
      </FadeInSection>

      <Footer />
    </div>
  );
}

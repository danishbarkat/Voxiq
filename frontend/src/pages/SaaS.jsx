import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';
import { 
  Check, 
  ArrowRight, 
  Zap, 
  Phone, 
  X,
  Code2,
  Database,
  Users
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

export default function SaaS() {
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
                SaaS Companies
              </span>
              
              <h1 style={{
                fontSize: 'clamp(2.5rem, 4.5vw, 3.75rem)',
                fontWeight: 700,
                color: '#F1F5F9',
                letterSpacing: '-0.03em',
                marginBottom: '24px',
                lineHeight: '1.15'
              }}>
                Your SDRs book 2x more demos.<br />
                Your AEs close more deals.
              </h1>
              
              <p style={{
                fontSize: '1.15rem',
                color: '#CBD5E1',
                lineHeight: '1.7',
                marginBottom: '40px',
                maxWidth: '560px'
              }}>
                Voxiq gives your outbound sales team the speed and tools to crush their pipeline numbers — with AI, auto-dialing, and CRM sync that keeps your pipeline always up to date.
              </p>

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
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#6B9AB8' }}>SDR Pipeline Status</span>
                <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>Active</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#020D1A', border: '1px solid #1e2537', borderRadius: '8px', padding: '12px 16px' }}>
                  <span style={{ fontSize: '13px', color: '#CBD5E1' }}>Meeting Booked Ratio</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#7C6DFA' }}>2x SDR avg</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#020D1A', border: '1px solid #1e2537', borderRadius: '8px', padding: '12px 16px' }}>
                  <span style={{ fontSize: '13px', color: '#CBD5E1' }}>CRM Logs Sync</span>
                  <span style={{ fontSize: '12px', color: '#10B981', fontWeight: 600 }}>Connected</span>
                </div>
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
              { val: '2x', desc: 'More demos booked per SDR' },
              { val: '< 60s', desc: 'Lead response time with AI Agent' },
              { val: '3h', desc: 'Saved per rep per day on admin' }
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
              <h2 style={{ fontSize: '2.25rem', fontWeight: 700, color: '#F1F5F9', letterSpacing: '-0.02em' }}>Outbound sales are hard with the wrong tools</h2>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '30px' }} className="benefits-grid">
              {[
                {
                  title: 'SDRs waste half their day on non-selling tasks',
                  desc: 'Logging calls, updating pipelines, leaving voicemails manually — your SDRs are doing $15/hr admin work instead of $150/hr selling.'
                },
                {
                  title: 'Inbound leads go cold before SDRs call them',
                  desc: 'Your marketing team is spending thousands generating leads. If your SDR doesn\'t call within 5 minutes, conversion drops 80%.'
                },
                {
                  title: 'No visibility into what\'s actually happening',
                  desc: 'Managers can\'t see who\'s dialing, who\'s slacking, or what\'s working — until it\'s too late to coach.'
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
                  title: 'AI Agent Handles First-Touch Inbound',
                  desc: 'New trial signup or demo request? AI Agent calls them within 60 seconds, qualifies their use case, and books the demo — before your SDR even opens their laptop.'
                },
                {
                  title: 'Power Dialer for Outbound Sequences',
                  desc: 'SDRs can work through 200+ calls per day with auto-advance, voicemail drop, and automatic CRM logging on every single call.'
                },
                {
                  title: 'Live Coaching for Manager Visibility',
                  desc: 'Listen to any live call. Whisper to your rep without the prospect hearing. See every active call on your floor in real time.'
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
                    The first 5 minutes after a lead signs up are everything
                  </h2>
                  <p style={{ fontSize: '1.1rem', color: '#6B9AB8', lineHeight: '1.7', marginBottom: '24px' }}>
                    Every minute that passes after an inbound lead converts, your chance of reaching them drops. Voxiq's AI Agent eliminates that gap — calling every new lead within 60 seconds, qualifying their use case, and booking the demo while they're still at their desk thinking about your product.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {[
                      'Triggers instantly on form submit',
                      'Qualifies ICP fit with your questions',
                      'Books demo to rep\'s calendar',
                      'Hands off to human rep when warm',
                      'Full conversation summary to Slack/CRM'
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#7C6DFA' }}>Lead Capture Active</span>
                    <span style={{ color: '#10B981', fontSize: '12px' }}>● Live</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#020D1A', border: '1px solid #1e2537', borderRadius: '8px', padding: '16px' }}>
                    <div style={{ fontSize: '12px', color: '#6B9AB8' }}>Inbound Form Submitted:</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#F1F5F9' }}>SaaS Enterprise Demo Request</div>
                    <div style={{ fontSize: '12px', color: '#CBD5E1', marginTop: '6px' }}>Email: company@domain.com</div>
                    <div style={{ fontSize: '11px', color: '#7C6DFA', background: 'rgba(124, 109, 250, 0.1)', padding: '4px 8px', borderRadius: '4px', alignSelf: 'flex-start', marginTop: '6px' }}>
                      Auto Call Initiated: 24s elapsed
                    </div>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#7C6DFA', fontSize: '13px', fontWeight: 600 }}>
                    <Database size={16} /> CRM Logging Active
                  </div>
                  <div style={{ background: '#020D1A', border: '1px solid #1e2537', borderRadius: '8px', padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#F1F5F9' }}>CRM Contact Feed</span>
                      <span style={{ fontSize: '11px', color: '#10B981' }}>Synced</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: '#6B9AB8' }}>
                      <div>• Call duration: 4m 12s</div>
                      <div>• Outcome: Meeting Booked</div>
                      <div>• Recording: audio_timeline_link.wav</div>
                    </div>
                  </div>
                </div>
                <div>
                  <h2 style={{ fontSize: '2.25rem', fontWeight: 700, color: '#F1F5F9', marginBottom: '20px', lineHeight: '1.2', letterSpacing: '-0.02em' }}>
                    Zero admin. Every call logged automatically.
                  </h2>
                  <p style={{ fontSize: '1.1rem', color: '#6B9AB8', lineHeight: '1.7', marginBottom: '24px' }}>
                    Your SDRs should be selling — not doing data entry. Every Voxiq call logs automatically to Pipedrive: duration, outcome, notes, recording, and next steps. Sequences update. Pipeline moves. All without your rep touching a keyboard.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {[
                      'Auto-log to Pipedrive',
                      'Voicemail drop in 2 seconds',
                      'SMS follow-up sent automatically',
                      'Sequence status updates on outcomes',
                      'Rep saves 3 hours of admin per day'
                    ].map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Check size={16} color="#7C6DFA" style={{ flexShrink: 0 }} />
                        <span style={{ fontSize: '15px', color: '#CBD5E1' }}>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
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
                "Our SDR team went from 55 dials/day to 190 dials/day in the first week. Pipeline grew 67% in 30 days. Voxiq paid for itself before the trial ended."
              </p>
              <div style={{ fontWeight: 600, color: '#F1F5F9', fontSize: '15px' }}>Ryan K.</div>
              <div style={{ color: '#6B9AB8', fontSize: '13px', marginTop: '4px' }}>VP Sales, B2B SaaS</div>
              
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
                ✓ 67% pipeline growth in 30 days
              </div>
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* 7. INTEGRATIONS */}
      <section style={{ padding: '80px 0', background: '#020D1A', borderTop: '1px solid #1e2537' }}>
        <div className="container" style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 2rem', textAlign: 'center' }}>
          <h4 style={{ fontSize: '11px', fontWeight: 700, color: '#6B9AB8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '32px' }}>
            Integrates natively with your SaaS stack
          </h4>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '40px', flexWrap: 'wrap', marginBottom: '32px', opacity: 0.75 }}>
            {['Pipedrive', 'Outreach', 'Salesloft'].map((stack, i) => (
              <span key={i} style={{ fontSize: '18px', fontWeight: 700, color: '#94A3B8' }}>{stack}</span>
            ))}
          </div>
          <p style={{ fontSize: '14px', color: '#6B9AB8', maxWidth: '560px', margin: '0 auto' }}>
            Log dial outcomes, trigger Slack notifications, and sync contacts seamlessly.
          </p>
        </div>
      </section>

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
                Book more demos this week — free for 14 days
              </h2>
              <p style={{ fontSize: '1.1rem', color: '#6B9AB8', marginBottom: '32px', maxWidth: '600px', margin: '0 auto 32px' }}>
                No credit card. Full access. Cancel anytime.
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
                Start Free Trial
              </Link>
            </div>
          </div>
        </section>
      </FadeInSection>

      <Footer />
    </div>
  );
}

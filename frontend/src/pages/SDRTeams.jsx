import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';
import { 
  Check, 
  ArrowRight, 
  Zap, 
  Phone, 
  X,
  Target,
  Users,
  TrendingUp
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

export default function SDRTeams() {
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
                SDR / BDR Teams
              </span>
              
              <h1 style={{
                fontSize: 'clamp(2.5rem, 4.5vw, 3.75rem)',
                fontWeight: 700,
                color: '#F1F5F9',
                letterSpacing: '-0.03em',
                marginBottom: '24px',
                lineHeight: '1.15'
              }}>
                Built for the reps who live and die by the dial.
              </h1>
              
              <p style={{
                fontSize: '1.15rem',
                color: '#CBD5E1',
                lineHeight: '1.7',
                marginBottom: '40px',
                maxWidth: '560px'
              }}>
                Voxiq gives SDRs and BDRs the speed, tools, and insights to crush quota — and gives managers the visibility to coach in real time.
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
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#6B9AB8' }}>SDR Dial Progress</span>
                <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>Active</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#020D1A', border: '1px solid #1e2537', borderRadius: '6px', fontSize: '13px' }}>
                  <span>Dials Completed Today</span>
                  <span style={{ color: '#7C6DFA', fontWeight: 600 }}>191</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#020D1A', border: '1px solid #1e2537', borderRadius: '6px', fontSize: '13px' }}>
                  <span>Admin hours saved</span>
                  <span style={{ color: '#10B981', fontWeight: 600 }}>3 hrs</span>
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
              { val: '190', desc: 'Average dials per rep per day' },
              { val: '3h', desc: 'Admin time saved per rep per day' },
              { val: '2x', desc: 'Increase in meetings booked' }
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
              <h2 style={{ fontSize: '2.25rem', fontWeight: 700, color: '#F1F5F9', letterSpacing: '-0.02em' }}>What\'s holding your SDR team back?</h2>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '30px' }} className="benefits-grid">
              {[
                {
                  title: 'SDRs doing 50 dials a day when they should be doing 200',
                  desc: 'Manual dialing, voicemail recording, CRM updating — your SDRs are doing low-value work that kills quota attainment.'
                },
                {
                  title: 'Managers have zero visibility until it\'s too late',
                  desc: 'By the time a manager reviews call activity, the week is gone. No real-time coaching means bad habits compound for months.'
                },
                {
                  title: 'New reps take 3 months to ramp when they could take 3 weeks',
                  desc: 'Without live call coaching, new SDRs learn slowly and painfully — costing you pipeline during their entire ramp period.'
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
                  title: 'Power Dialer',
                  desc: '190+ dials per day. Auto-advance, voicemail drop, local presence — everything an SDR needs to max their dial day.'
                },
                {
                  title: 'Live Coaching',
                  desc: 'Managers whisper, listen, or barge on any live call. New reps ramp in weeks, not months.'
                },
                {
                  title: 'Zero Admin',
                  desc: 'Every call logged to your CRM automatically. Sequences update. SMS sent. Reps spend 100% of time selling.'
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
                    From 50 dials a day to 190 — without burning out
                  </h2>
                  <p style={{ fontSize: '1.1rem', color: '#6B9AB8', lineHeight: '1.7', marginBottom: '24px' }}>
                    Manual dialing is exhausting and slow. Voxiq auto-dials through lists seamlessly. Voicemail drops allow reps to leave pre-recorded messages instantly. Integrated local presence increases pick-up rates. Sync outcomes back to your outreach sequences without manual data logging.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {[
                      'Direct list dialing automation',
                      'One-click VM drop',
                      'Local presence number selection',
                      'Instant CRM lead sync',
                      'Automated workflow follow-ups'
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
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#F1F5F9' }}>Outbound Dialer HUD</span>
                    <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>Active</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#020D1A', border: '1px solid #1e2537', borderRadius: '6px', fontSize: '13px' }}>
                      <span>Reps calling concurrent</span>
                      <span style={{ color: '#7C6DFA', fontWeight: 600 }}>4</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#020D1A', border: '1px solid #1e2537', borderRadius: '6px', fontSize: '13px' }}>
                      <span>Dials/hour/rep avg</span>
                      <span style={{ color: '#10B981', fontWeight: 600 }}>42</span>
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
                    <Users size={16} /> Live Coaching Console
                  </div>
                  <div style={{ background: '#020D1A', border: '1px solid #1e2537', borderRadius: '8px', padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#F1F5F9' }}>Rep: Alex Johnson</span>
                      <span style={{ fontSize: '11px', color: '#7C6DFA', background: 'rgba(124, 109, 250, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>Whisper mode active</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#6B9AB8', lineHeight: '1.4' }}>
                      Manager speaking: "Great opening. Pivot to standard budget sequence now."
                    </div>
                  </div>
                </div>
                <div>
                  <h2 style={{ fontSize: '2.25rem', fontWeight: 700, color: '#F1F5F9', marginBottom: '20px', lineHeight: '1.2', letterSpacing: '-0.02em' }}>
                    Coach every rep, on every call, in real time
                  </h2>
                  <p style={{ fontSize: '1.1rem', color: '#6B9AB8', lineHeight: '1.7', marginBottom: '24px' }}>
                    Never look at a static call sheet again. Managers can watch active calls on the floor, listen live, whisper support, or barge directly onto the line. Speed up ramp times for new hires and optimize team conversion rates on the fly.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {[
                      'Listen to live calls silently',
                      'Whisper coach without prospect hearing',
                      'Barge onto call to save deal',
                      'Live manager leaderboard hud',
                      'Full transcription audit reports'
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
                "Our SDRs were averaging 52 dials/day. Week 1 with Voxiq: 164 dials/day. Week 2: 191. Pipeline doubled in the first month. I wish we'd done this sooner."
              </p>
              <div style={{ fontWeight: 600, color: '#F1F5F9', fontSize: '15px' }}>Sales Manager</div>
              <div style={{ color: '#6B9AB8', fontSize: '13px', marginTop: '4px' }}>B2B SaaS</div>
              
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
                ✓ Pipeline doubled in first month
              </div>
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* 7. INTEGRATIONS */}
      <section style={{ padding: '80px 0', background: '#020D1A', borderTop: '1px solid #1e2537' }}>
        <div className="container" style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 2rem', textAlign: 'center' }}>
          <h4 style={{ fontSize: '11px', fontWeight: 700, color: '#6B9AB8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '32px' }}>
            Natively connects with your tech stack
          </h4>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '40px', flexWrap: 'wrap', marginBottom: '32px', opacity: 0.75 }}>
            {['Pipedrive', 'Salesloft', 'Outreach'].map((stack, i) => (
              <span key={i} style={{ fontSize: '18px', fontWeight: 700, color: '#94A3B8' }}>{stack}</span>
            ))}
          </div>
          <p style={{ fontSize: '14px', color: '#6B9AB8', maxWidth: '560px', margin: '0 auto' }}>
            Native API support for sales acceleration sequences and tools.
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
                Supercharge your SDR pipeline today — free for 14 days
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

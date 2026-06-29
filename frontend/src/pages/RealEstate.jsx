import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';
import { 
  Check, 
  ArrowRight, 
  Zap, 
  Phone, 
  MessageSquare, 
  Home as HomeIcon,
  X,
  Calendar,
  AlertCircle
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

export default function RealEstate() {
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
                Real Estate
              </span>
              
              <h1 style={{
                fontSize: 'clamp(2.5rem, 4.5vw, 3.75rem)',
                fontWeight: 700,
                color: '#F1F5F9',
                letterSpacing: '-0.03em',
                marginBottom: '24px',
                lineHeight: '1.15'
              }}>
                Call more leads.<br />
                Follow up faster.<br />
                Close more listings.
              </h1>
              
              <p style={{
                fontSize: '1.15rem',
                color: '#CBD5E1',
                lineHeight: '1.7',
                marginBottom: '40px',
                maxWidth: '560px'
              }}>
                Real estate moves fast. Voxiq makes sure you're the first agent to call every new lead — automatically.
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
              padding: '24px',
              position: 'relative'
            }} className="hero-mockup-container">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #1e2537', paddingBottom: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#6B9AB8' }}>Active Dialer HUD</span>
                <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>Ready</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ background: '#020D1A', border: '1px solid #1e2537', borderRadius: '8px', padding: '16px' }}>
                  <div style={{ fontSize: '11px', color: '#6B9AB8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Contact Info</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#F1F5F9' }}>Jennifer Walsh</div>
                  <div style={{ fontSize: '13px', color: '#7C6DFA', marginTop: '4px' }}>4BR Colonial — $485K</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(124, 109, 250, 0.05)', border: '1px solid rgba(124, 109, 250, 0.1)', borderRadius: '8px', padding: '12px 16px' }}>
                  <span style={{ fontSize: '13px', color: '#CBD5E1' }}>Status: <strong style={{ color: '#7C6DFA' }}>New lead</strong></span>
                  <span style={{ fontSize: '12px', color: '#6B9AB8' }}>4 mins ago</span>
                </div>
                <button style={{
                  background: '#7C6DFA',
                  color: 'white',
                  border: 'none',
                  padding: '14px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(124, 109, 250, 0.2)'
                }}>
                  <Phone size={16} /> Call Now
                </button>
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
              { val: '3x', desc: 'More contacts reached per day' },
              { val: '< 60s', desc: 'Average response time to new leads' },
              { val: '41%', desc: 'Higher listing appointment rate' }
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
              <h2 style={{ fontSize: '2.25rem', fontWeight: 700, color: '#F1F5F9', letterSpacing: '-0.02em' }}>The old way is costing you listings</h2>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '30px' }} className="benefits-grid">
              {[
                {
                  title: 'Leads go cold in minutes',
                  desc: 'Studies show 78% of deals go to the first agent who responds. Every minute you wait, a competitor gains ground.'
                },
                {
                  title: 'Manual dialing kills your day',
                  desc: 'Searching for numbers, dialing manually, leaving voicemails — a top agent wastes 3 hours a day on tasks Voxiq does automatically.'
                },
                {
                  title: 'Follow-ups fall through the cracks',
                  desc: "Without automated follow-up, 60% of leads never get a second call — even when they're interested."
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
                  title: 'Instant Lead Response',
                  desc: "New lead comes in from your website, Zillow, or GHL? Voxiq's AI Agent calls them within 60 seconds — before your competitors even see the notification."
                },
                {
                  title: 'Auto Dialer for Your Call List',
                  desc: 'Upload your farm list, past clients, or open house attendees. Voxiq dials through automatically — you just talk when someone picks up.'
                },
                {
                  title: 'SMS & WhatsApp Follow-Up',
                  desc: 'After every call — answered or not — Voxiq automatically sends a follow-up text. Stay top of mind without lifting a finger.'
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
                    Be the first agent to call every new lead
                  </h2>
                  <p style={{ fontSize: '1.1rem', color: '#6B9AB8', lineHeight: '1.7', marginBottom: '24px' }}>
                    Speed-to-lead is the single biggest factor in real estate conversion. The first agent to call a new lead wins the listing 62% of the time. Voxiq's AI Agent calls new leads the moment they submit — day or night, weekend or holiday.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {[
                      'Calls new leads within 60 seconds',
                      'Introduces your agency by name',
                      'Qualifies: buying or selling timeline',
                      'Books appointment directly to calendar',
                      'Works 24/7 — nights and weekends'
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', background: 'rgba(124, 109, 250, 0.05)', border: '1px solid rgba(124, 109, 250, 0.1)', padding: '12px', borderRadius: '8px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#7C6DFA', animation: 'pulse-dot 1.5s infinite' }}></div>
                    <span style={{ fontSize: '12px', color: '#A594F9', fontWeight: 600 }}>AI Rep Call in Progress...</span>
                  </div>
                  <div style={{ fontSize: '13px', color: '#6B9AB8', marginBottom: '6px' }}>Lead Origin: <strong style={{ color: '#F1F5F9' }}>Zillow Premier Agent</strong></div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#F1F5F9', marginBottom: '12px' }}>Calling Jennifer Walsh</div>
                  <div style={{ background: '#020D1A', border: '1px solid #1e2537', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ fontSize: '11px', color: '#6B9AB8', marginBottom: '4px' }}>Transcription Snippet</div>
                    <div style={{ fontSize: '13px', fontStyle: 'italic', color: '#CBD5E1' }}>"Hi Jennifer, this is Aria from Walsh Realty. I saw you requested info on 4BR Colonial..."</div>
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
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#F1F5F9' }}>Outbound Dialer HUD</span>
                    <span style={{ fontSize: '12px', color: '#6B9AB8' }}>12 / 47 Completed</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: '#1e2537', borderRadius: '3px', marginBottom: '20px', overflow: 'hidden' }}>
                    <div style={{ width: '25%', height: '100%', background: '#7C6DFA' }}></div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[
                      { name: 'John Miller', status: 'No Answer — VM Drop' },
                      { name: 'Sarah Connor', status: 'Connected — Call notes synced' },
                      { name: 'David Smith', status: 'Dialing...' }
                    ].map((rep, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: idx === 2 ? 'rgba(124, 109, 250, 0.05)' : '#0d1117', border: idx === 2 ? '1px solid rgba(124, 109, 250, 0.2)' : '1px solid #1e2537', padding: '10px 14px', borderRadius: '6px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 500, color: '#F1F5F9' }}>{rep.name}</span>
                        <span style={{ fontSize: '12px', color: idx === 1 ? '#10B981' : '#64748B' }}>{rep.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h2 style={{ fontSize: '2.25rem', fontWeight: 700, color: '#F1F5F9', marginBottom: '20px', lineHeight: '1.2', letterSpacing: '-0.02em' }}>
                    Dial your entire farm list in one session
                  </h2>
                  <p style={{ fontSize: '1.1rem', color: '#6B9AB8', lineHeight: '1.7', marginBottom: '24px' }}>
                    Stop spending your mornings manually dialing. Load your geographic farm, your past client list, or your open house attendees into Voxiq. Hit start and work through 200+ calls before lunch — with full notes and CRM sync on every call.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {[
                      'Import from CSV or sync from GHL/CRM',
                      'Auto-advance after each call',
                      'Voicemail drop for no-answers',
                      'Call notes sync to GHL contact',
                      'SMS follow-up sent automatically'
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
                "I used to make 40 calls a day max. With Voxiq I'm hitting 150-180 calls before noon. I listed 3 properties last month that I would have missed because I was too slow to call back."
              </p>
              <div style={{ fontWeight: 600, color: '#F1F5F9', fontSize: '15px' }}>Marcus T.</div>
              <div style={{ color: '#6B9AB8', fontSize: '13px', marginTop: '4px' }}>Realtor, Dallas TX</div>
              
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
                ✓ Listed 3 extra properties in first month
              </div>
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* 7. INTEGRATIONS */}
      <section style={{ padding: '80px 0', background: '#020D1A', borderTop: '1px solid #1e2537' }}>
        <div className="container" style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 2rem', textAlign: 'center' }}>
          <h4 style={{ fontSize: '11px', fontWeight: 700, color: '#6B9AB8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '32px' }}>
            Works with your real estate stack
          </h4>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '40px', flexWrap: 'wrap', marginBottom: '32px', opacity: 0.75 }}>
            {['GoHighLevel', 'Zapier', 'Google Calendar', 'Calendly'].map((stack, i) => (
              <span key={i} style={{ fontSize: '18px', fontWeight: 700, color: '#94A3B8' }}>{stack}</span>
            ))}
          </div>
          <p style={{ fontSize: '14px', color: '#6B9AB8', maxWidth: '560px', margin: '0 auto' }}>
            Voxiq syncs call outcomes, notes, and appointments directly into your GHL or CRM pipeline.
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
                Start calling more leads today — free for 14 days
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

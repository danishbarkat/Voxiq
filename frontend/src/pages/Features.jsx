import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Footer from '../components/Footer';
import { 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  Zap, 
  Volume2, 
  Database, 
  BarChart2, 
  Phone, 
  Mic, 
  Shuffle, 
  ArrowUpRight 
} from 'lucide-react';

// Scroll Animation Wrapper using Intersection Observer
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

export default function Features() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('power-dialer');

  // Handle active tab detection on scroll
  useEffect(() => {
    const sections = ['power-dialer', 'live-coaching', 'crm-sync', 'analytics'];
    const observers = [];

    sections.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        const observer = new IntersectionObserver(entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting && entry.intersectionRatio >= 0.35) {
              setActiveTab(id);
            }
          });
        }, { threshold: [0.35], rootMargin: '-120px 0px -50% 0px' });
        observer.observe(el);
        observers.push({ observer, el });
      }
    });

    return () => {
      observers.forEach(({ observer, el }) => observer.unobserve(el));
    };
  }, []);

  // Smooth scroll offset calculation to bypass navbar/tabs height
  const handleTabClick = (e, id) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      const offset = 135; // combined sticky navbar & tabs height
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = el.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
      setActiveTab(id);
    }
  };

  return (
    <div style={{ background: '#020D1A', minHeight: '100vh', overflowX: 'hidden' }}>

      {/* 1. FEATURES HERO */}
      <section style={{ 
        padding: '100px 0 70px', 
        background: 'radial-gradient(circle at 50% -20%, rgba(124, 109, 250, 0.08) 0%, #0B0F1A 70%), #0B0F1A', 
        textAlign: 'center' 
      }}>
        <div className="container" style={{ maxWidth: '960px', margin: '0 auto', padding: '0 2rem' }}>
          <span style={{
            color: '#7C6DFA',
            fontSize: '0.85rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            background: 'rgba(124, 109, 250, 0.08)',
            padding: '6px 16px',
            borderRadius: '999px',
            display: 'inline-block',
            marginBottom: '20px',
            fontFamily: "'Plus Jakarta Sans', sans-serif"
          }}>
            Everything your team needs
          </span>
          <h1 style={{
            fontSize: 'clamp(2.5rem, 5vw, 4rem)',
            fontWeight: 800,
            color: '#F1F5F9',
            letterSpacing: '-0.03em',
            marginBottom: '20px',
            lineHeight: '1.1',
            fontFamily: "'Plus Jakarta Sans', sans-serif"
          }}>
            Built for sales teams who dial for a living
          </h1>
          <p style={{
            fontSize: '1.25rem',
            color: '#CBD5E1',
            maxWidth: '700px',
            margin: '0 auto',
            lineHeight: '1.6',
            fontFamily: "'Plus Jakarta Sans', sans-serif"
          }}>
            Voxiq isn't a CRM with a phone bolted on. It's a dialer built from the ground up for high-volume outbound sales.
          </p>
        </div>
      </section>

      {/* 2. FEATURE TABS NAVIGATION */}
      <div style={{
        position: 'sticky',
        top: '72px',
        background: 'rgba(11, 15, 26, 0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #1e2537',
        zIndex: 90,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
      }}>
        <div className="container" style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 2rem' }}>
          <div 
            style={{
              display: 'flex',
              justifyContent: 'center',
              overflowX: 'auto',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }} 
            className="tabs-scrollable"
          >
            {/* Scrollbar hiding style */}
            <style>{`
              .tabs-scrollable::-webkit-scrollbar { display: none; }
            `}</style>
            
            <div style={{ display: 'flex', gap: '32px', height: '60px', alignItems: 'center', padding: '0 10px', whiteSpace: 'nowrap' }}>
              {[
                { name: 'Power Dialer', id: 'power-dialer' },
                { name: 'Live Coaching', id: 'live-coaching' },
                { name: 'CRM Sync', id: 'crm-sync' },
                { name: 'Analytics', id: 'analytics' }
              ].map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <a
                    key={tab.id}
                    href={`#${tab.id}`}
                    onClick={(e) => handleTabClick(e, tab.id)}
                    style={{
                      textDecoration: 'none',
                      color: isActive ? '#7C6DFA' : '#64748B',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      position: 'relative',
                      transition: 'color 0.2s',
                      fontFamily: "'Plus Jakarta Sans', sans-serif"
                    }}
                  >
                    {tab.name}
                    {isActive && (
                      <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: '3px',
                        background: '#7C6DFA',
                        borderRadius: '3px 3px 0 0'
                      }} />
                    )}
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 3. FEATURE SECTION 1 — Power Dialer */}
      <section id="power-dialer" style={{ padding: '100px 0', background: '#020D1A' }}>
        <div className="container" style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 2rem' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '80px',
            alignItems: 'center'
          }} className="feature-grid-row">
            
            <div>
              <span style={{ color: '#6C47FF', fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '12px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Core feature
              </span>
              <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#F1F5F9', letterSpacing: '-0.025em', lineHeight: '1.15', marginBottom: '20px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Dial 3x more prospects. Without burning out your reps.
              </h2>
              <p style={{ fontSize: '1.1rem', color: '#6B9AB8', lineHeight: '1.6', marginBottom: '32px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Voxiq's power dialer automatically moves to the next contact the moment a call ends — or skips it if there's no answer. Your reps stay focused on conversations, not clicking.
              </p>
              
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 40px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[
                  'Auto-advance to next contact after each call',
                  'Skip, pause, or reschedule with one click',
                  'Local presence dialing — match area codes automatically',
                  'Answering machine detection — drop voicemails instantly',
                  'Call up to 300 contacts per rep per day'
                ].map((bullet, idx) => (
                  <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.95rem', color: '#6B9AB8', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    <CheckCircle2 size={18} color="#6C47FF" style={{ flexShrink: 0 }} /> {bullet}
                  </li>
                ))}
              </ul>

              <Link to="/pricing" style={{ textDecoration: 'none', color: '#6C47FF', fontWeight: 800, fontSize: '1rem', display: 'inline-flex', alignItems: 'center', gap: '8px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                See pricing for Power Dialer <ArrowRight size={18} />
              </Link>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              {/* Dialer UI Mockup */}
              <div style={{
                background: '#111929',
                border: '1px solid #1e2537',
                borderRadius: '20px',
                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.4)',
                padding: '24px',
                width: '100%',
                maxWidth: '460px',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                color: 'white'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #1e2537', paddingBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#7C6DFA', display: 'inline-block' }} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#6B9AB8', textTransform: 'uppercase' }}>Dialer Active</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10B981', background: 'rgba(16,185,129,0.1)', padding: '3px 8px', borderRadius: '4px' }}>CONNECTED</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#7C6DFA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'white' }}>RC</div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Robert Carter</h4>
                    <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#6B9AB8' }}>CEO at Acme Corp</p>
                  </div>
                </div>

                <div style={{ background: '#020D1A', border: '1px solid #1e2537', borderRadius: '10px', padding: '14px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: '#6B9AB8', textTransform: 'uppercase', fontWeight: 700 }}>Active Call</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, marginTop: '2px', color: '#F1F5F9' }}>+1 (555) 302-8812</div>
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'monospace', color: '#F1F5F9' }}>0:42</div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button style={{ flex: 1, padding: '12px', background: '#020D1A', border: '1px solid #1e2537', borderRadius: '8px', color: '#CBD5E1', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>Skip Contact</button>
                  <button style={{ flex: 1.5, padding: '12px', background: '#7C6DFA', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer' }}>Next Call →</button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 4. FEATURE SECTION 2 — Live Call Coaching */}
      <section id="live-coaching" style={{ padding: '100px 0', background: 'linear-gradient(180deg, #faf5ff 0%, #f3e8ff 100%)', borderTop: '1px solid #e9d5ff', borderBottom: '1px solid #e9d5ff' }}>
        <div className="container" style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 2rem' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '80px',
            alignItems: 'center'
          }} className="feature-grid-row">
            
            <div style={{ display: 'flex', justifyContent: 'center' }} className="feature-img-order">
              {/* Live Coaching Monitor Mockup */}
              <div style={{
                background: '#111929',
                border: '1px solid #1e2537',
                borderRadius: '20px',
                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.4)',
                padding: '24px',
                width: '100%',
                maxWidth: '460px',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                color: 'white'
              }}>
                <h4 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 800, letterSpacing: '-0.01em', borderBottom: '1px solid #1e2537', paddingBottom: '12px' }}>Live Call Monitor</h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {[
                    { rep: 'Sarah Jenkins', time: '2m 14s', active: 'Listen' },
                    { rep: 'Alex Mercer', time: '0m 45s', active: 'Whisper' },
                    { rep: 'Chloe Bennett', time: '4m 12s', active: 'Barge' }
                  ].map((row, idx) => (
                    <div key={idx} style={{
                      background: '#020D1A',
                      border: '1px solid #1e2537',
                      borderRadius: '10px',
                      padding: '12px 14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#F1F5F9' }}>{row.rep}</div>
                        <div style={{ fontSize: '0.72rem', color: '#6B9AB8', marginTop: '2px' }}>Calling... ({row.time})</div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {['Listen', 'Whisper', 'Barge'].map(mode => {
                          const isCurrent = row.active === mode;
                          return (
                            <button
                              key={mode}
                              style={{
                                padding: '6px 10px',
                                background: isCurrent ? '#7C6DFA' : '#0d1117',
                                border: isCurrent ? 'none' : '1px solid #1e2537',
                                borderRadius: '4px',
                                color: isCurrent ? 'white' : '#CBD5E1',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'background 0.2s'
                              }}
                            >
                              {mode}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <span style={{ color: '#6C47FF', fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '12px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Manager favorite
              </span>
              <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#F1F5F9', letterSpacing: '-0.025em', lineHeight: '1.15', marginBottom: '20px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Your best reps just became every rep's coach.
              </h2>
              <p style={{ fontSize: '1.1rem', color: '#6B7280', lineHeight: '1.6', marginBottom: '32px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Listen to any live call without the rep or prospect knowing. Whisper tips directly to your rep's ear. Or jump in and take over when the deal needs saving.
              </p>
              
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 40px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[
                  'Listen mode — silent monitoring, no one knows you\'re there',
                  'Whisper mode — talk to your rep only, prospect can\'t hear',
                  'Barge mode — join the call as a full participant',
                  'Live call feed — see every active call on your team right now',
                  'Automatic call recording with searchable transcripts'
                ].map((bullet, idx) => (
                  <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.95rem', color: '#6B7280', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    <CheckCircle2 size={18} color="#6C47FF" style={{ flexShrink: 0 }} /> {bullet}
                  </li>
                ))}
              </ul>

              <Link to="/pricing" style={{ textDecoration: 'none', color: '#6C47FF', fontWeight: 800, fontSize: '1rem', display: 'inline-flex', alignItems: 'center', gap: '8px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                See pricing for Live Coaching <ArrowRight size={18} />
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* 5. FEATURE SECTION 3 — CRM Sync */}
      <section id="crm-sync" style={{ padding: '100px 0', background: '#020D1A' }}>
        <div className="container" style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 2rem' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '80px',
            alignItems: 'center'
          }} className="feature-grid-row">
            
            <div>
              <span style={{ color: '#6C47FF', fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '12px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Zero manual data entry
              </span>
              <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#F1F5F9', letterSpacing: '-0.025em', lineHeight: '1.15', marginBottom: '20px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Every call logged. Every outcome synced. Automatically.
              </h2>
              <p style={{ fontSize: '1.1rem', color: '#6B9AB8', lineHeight: '1.6', marginBottom: '32px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Stop asking reps to update the CRM after every call. Voxiq logs call outcomes, duration, recordings, and notes directly into your CRM the second the call ends.
              </p>
              
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 40px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[
                  'Native integrations: Pipedrive, Zapier',
                  'Auto-log: call duration, outcome, recording, notes',
                  'Two-way sync — pull contact data from CRM into Voxiq',
                  'Custom field mapping for your CRM setup',
                  'Zapier integration for any other tool'
                ].map((bullet, idx) => (
                  <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.95rem', color: '#6B9AB8', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    <CheckCircle2 size={18} color="#6C47FF" style={{ flexShrink: 0 }} /> {bullet}
                  </li>
                ))}
              </ul>

              <a href="#integrations" style={{ textDecoration: 'none', color: '#6C47FF', fontWeight: 800, fontSize: '1rem', display: 'inline-flex', alignItems: 'center', gap: '8px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                See all integrations <ArrowRight size={18} />
              </a>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              {/* CRM Connections diagram mockup */}
              <div style={{
                background: '#111929',
                border: '1px solid #1e2537',
                borderRadius: '24px',
                padding: '40px',
                width: '100%',
                maxWidth: '460px',
                height: '320px',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden'
              }}>
                {/* Central Voxiq Node */}
                <div style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '16px',
                  background: '#7C6DFA',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 900,
                  fontSize: '1.8rem',
                  zIndex: 2,
                  boxShadow: '0 8px 24px rgba(124, 109, 250, 0.3)'
                }}>
                  V
                </div>

                {/* SVG connection lines */}
                <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1 }}>
                  <line x1="80%" y1="20%" x2="50%" y2="50%" stroke="rgba(124, 109, 250, 0.3)" strokeWidth="3" strokeDasharray="5,5" />
                  <line x1="20%" y1="80%" x2="50%" y2="50%" stroke="rgba(124, 109, 250, 0.3)" strokeWidth="3" strokeDasharray="5,5" />
                </svg>

                {/* Surrounding CRM nodes */}
                <div style={{ position: 'absolute', top: '15%', right: '10%', background: '#020D1A', border: '1px solid #00A1E0', color: '#00A1E0', padding: '6px 14px', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 800, boxShadow: '0 4px 10px rgba(0,0,0,0.2)', zIndex: 2 }}>Slack</div>
                <div style={{ position: 'absolute', bottom: '15%', left: '10%', background: '#020D1A', border: '1px solid #00b050', color: '#00b050', padding: '6px 14px', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 800, boxShadow: '0 4px 10px rgba(0,0,0,0.2)', zIndex: 2 }}>Pipedrive</div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 6. FEATURE SECTION 4 — Analytics */}
      <section id="analytics" style={{ padding: '100px 0', background: '#020D1A', borderTop: '1px solid rgba(127,205,255,0.08)', borderBottom: '1px solid rgba(127,205,255,0.08)' }}>
        <div className="container" style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 2rem' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '80px',
            alignItems: 'center'
          }} className="feature-grid-row">
            
            <div style={{ display: 'flex', justifyContent: 'center' }} className="feature-img-order">
              {/* Analytics dashboard mockup */}
              <div style={{
                background: '#111929',
                border: '1px solid rgba(127,205,255,0.08)',
                borderRadius: '20px',
                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.4)',
                padding: '24px',
                width: '100%',
                maxWidth: '460px',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                color: 'white'
              }}>
                <h4 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 800, borderBottom: '1px solid rgba(127,205,255,0.08)', paddingBottom: '12px' }}>Outbound Performance</h4>
                
                {/* Stats grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
                  {[
                    { label: 'Connect Rate', val: '34%' },
                    { label: 'Calls Today', val: '847' },
                    { label: 'Talk Time', val: '6h 23m' }
                  ].map((card, idx) => (
                    <div key={idx} style={{ background: '#020D1A', border: '1px solid rgba(127,205,255,0.08)', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.62rem', color: '#6B9AB8', textTransform: 'uppercase', fontWeight: 700 }}>{card.label}</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#7C6DFA', marginTop: '4px' }}>{card.val}</div>
                    </div>
                  ))}
                </div>

                {/* Mini Bar Chart */}
                <div style={{ fontSize: '0.72rem', color: '#6B9AB8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '10px' }}>Call Connect Rate By Hour</div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', height: '80px', background: '#020D1A', padding: '10px', borderRadius: '8px', border: '1px solid rgba(127,205,255,0.08)' }}>
                  {[35, 55, 75, 45, 60, 80, 50, 40].map((h, idx) => (
                    <div key={idx} style={{ flex: 1, height: `${h}%`, background: 'linear-gradient(to top, #7C6DFA, #A594F9)', borderRadius: '3px 3px 0 0' }} />
                  ))}
                </div>
              </div>
            </div>

            <div>
              <span style={{ color: '#6C47FF', fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '12px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Data-driven coaching
              </span>
              <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#F1F5F9', letterSpacing: '-0.025em', lineHeight: '1.15', marginBottom: '20px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Know exactly why your team is winning — or losing.
              </h2>
              <p style={{ fontSize: '1.1rem', color: '#6B9AB8', lineHeight: '1.6', marginBottom: '32px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Voxiq tracks every metric that matters for outbound sales. From connect rates by time of day to individual rep performance, you'll always know where to focus.
              </p>
              
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 40px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[
                  'Team and individual rep performance dashboards',
                  'Connect rate by hour, day, and area code',
                  'Call outcome breakdown (answered, voicemail, no answer)',
                  'Talk time vs. dial time ratio per rep',
                  'Weekly performance reports delivered to your inbox'
                ].map((bullet, idx) => (
                  <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.95rem', color: '#6B9AB8', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    <CheckCircle2 size={18} color="#6C47FF" style={{ flexShrink: 0 }} /> {bullet}
                  </li>
                ))}
              </ul>

              <Link to="/pricing" style={{ textDecoration: 'none', color: '#6C47FF', fontWeight: 800, fontSize: '1rem', display: 'inline-flex', alignItems: 'center', gap: '8px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                See pricing for Analytics <ArrowRight size={18} />
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* 7. INTEGRATIONS STRIP */}
      <section id="integrations" style={{ padding: '80px 0', background: '#020D1A', borderTop: '1px solid rgba(127,205,255,0.08)', borderBottom: '1px solid rgba(127,205,255,0.08)' }}>
        <div className="container" style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 2rem', textAlign: 'center' }}>
          <h3 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#F1F5F9', letterSpacing: '-0.02em', marginBottom: '32px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Works with the tools your team already uses</h3>
          
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
            marginBottom: '32px'
          }} className="integrations-grid">
            {['Pipedrive', 'Zapier', 'Slack', 'Google Calendar', 'Outreach', 'ActiveCampaign', 'Mailchimp'].map((logo, idx) => (
              <span key={idx} style={{
                background: '#020D1A',
                border: '1px solid rgba(127,205,255,0.08)',
                padding: '10px 22px',
                borderRadius: '999px',
                fontWeight: 700,
                fontSize: '0.9rem',
                color: '#6B9AB8',
                boxShadow: '0 4px 10px rgba(108,71,255,0.05)',
                fontFamily: "'Plus Jakarta Sans', sans-serif"
              }}>
                {logo}
              </span>
            ))}
          </div>

          <p style={{ fontSize: '0.95rem', color: '#6B9AB8', margin: '0 0 20px', fontWeight: 500, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Don't see your tool? Enterprise plans include custom integrations.
          </p>

          <a href="#signup" style={{ textDecoration: 'none', color: '#6C47FF', fontWeight: 800, fontSize: '0.95rem', display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            View all integrations <ArrowRight size={16} />
          </a>
        </div>
      </section>

      {/* 8. COMPARISON SECTION */}
      <FadeInSection>
        <section style={{ padding: '100px 0', background: '#020D1A', color: '#CBD5E1' }}>
          <div className="container" style={{ maxWidth: '1080px', margin: '0 auto', padding: '0 2rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '60px' }}>
              <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#F1F5F9', letterSpacing: '-0.02em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Voxiq vs. the old way</h2>
              <p style={{ fontSize: '1.1rem', color: '#6B9AB8', marginTop: '10px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Why high-performance outbound teams make the switch.</p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '40px'
            }} className="comparison-grid">
              
              {/* Column 1: Without Voxiq */}
              <div style={{
                background: '#111929',
                border: '1px solid #1e2537',
                borderRadius: '24px',
                padding: '40px 32px'
              }}>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#F1F5F9', marginBottom: '32px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Without Voxiq</h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {[
                    'Manual dialing between every call',
                    'Forgetting to log calls in the CRM',
                    'Managers flying blind on rep performance',
                    'New reps take 3 months to ramp up',
                    'Voicemails eat 40% of your rep\'s day'
                  ].map((item, idx) => (
                    <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.95rem', color: '#6B9AB8', fontWeight: 500, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      <XCircle size={20} color="#EF4444" style={{ flexShrink: 0, opacity: 0.6 }} /> {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Column 2: With Voxiq */}
              <div style={{
                background: '#13203a',
                border: '2px solid #7C6DFA',
                borderRadius: '24px',
                padding: '40px 32px',
                boxShadow: '0 15px 35px rgba(124, 109, 250, 0.15)'
              }}>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#F1F5F9', marginBottom: '32px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>With Voxiq</h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {[
                    'Auto-advance to next contact instantly',
                    'Every call logged automatically, zero effort',
                    'Live dashboards showing every rep in real time',
                    'New reps hit quota in week 2 with live coaching',
                    'One-click voicemail drop in under 2 seconds'
                  ].map((item, idx) => (
                    <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.95rem', color: '#CBD5E1', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      <CheckCircle2 size={20} color="#7C6DFA" style={{ flexShrink: 0 }} /> {item}
                    </li>
                  ))}
                </ul>
              </div>

            </div>
          </div>
        </section>
      </FadeInSection>

      {/* 9. BOTTOM CTA */}
      <FadeInSection>
        <section style={{ padding: '120px 0', background: '#020D1A', textAlign: 'center' }}>
          <div className="container" style={{ maxWidth: '800px', margin: '0 auto', padding: '0 2rem' }}>
            <h2 style={{ fontSize: '3rem', fontWeight: 800, color: '#F1F5F9', letterSpacing: '-0.025em', marginBottom: '20px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>See every feature in action</h2>
            <p style={{ fontSize: '1.2rem', color: '#CBD5E1', lineHeight: '1.6', marginBottom: '40px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Book a 15-minute demo and we'll walk you through exactly how Voxiq works for your team's workflow.
            </p>

            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }} className="cta-actions">
              <button
                style={{
                  background: '#7C6DFA',
                  color: 'white',
                  border: 'none',
                  padding: '18px 38px',
                  borderRadius: '12px',
                  fontWeight: 800,
                  fontSize: '1.05rem',
                  cursor: 'pointer',
                  boxShadow: '0 8px 24px rgba(124, 109, 250, 0.3)',
                  transition: 'all 0.2s',
                  fontFamily: "'Plus Jakarta Sans', sans-serif"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#5B4FE8';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 12px 28px rgba(124, 109, 250, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#7C6DFA';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(124, 109, 250, 0.3)';
                }}
              >
                Book a Demo
              </button>
              <button
                onClick={() => navigate('/signup')}
                style={{
                  background: 'transparent',
                  color: '#7C6DFA',
                  border: '2px solid #7C6DFA',
                  padding: '18px 38px',
                  borderRadius: '12px',
                  fontWeight: 800,
                  fontSize: '1.05rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontFamily: "'Plus Jakarta Sans', sans-serif"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(124, 109, 250, 0.08)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                Start Free Trial
              </button>
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
          .feature-grid-row {
            grid-template-columns: 1fr !important;
            gap: 48px !important;
            text-align: center !important;
          }
          .feature-grid-row div {
            align-items: center !important;
          }
          .feature-img-order {
            order: -1;
            margin-bottom: 12px;
          }
          .feature-grid-row ul {
            align-items: flex-start;
          }
          .comparison-grid {
            grid-template-columns: 1fr !important;
            gap: 24px !important;
          }
          .cta-actions {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .cta-actions > * {
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}

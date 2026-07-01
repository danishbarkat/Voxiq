import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Footer from '../components/Footer';
import { 
  CheckCircle2, 
  ArrowRight, 
  Database, 
  RefreshCw, 
  Zap, 
  Volume2, 
  Settings, 
  Headphones, 
  BarChart2, 
  Play, 
  Clock,
  ShieldAlert,
  ArrowUpRight
} from 'lucide-react';

export default function HowItWorks() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState('dialing');
  const [countdown, setCountdown] = useState(3);

  // Auto-advance countdown simulation
  useEffect(() => {
    if (activeStep === 'countdown') {
      const timer = setInterval(() => {
        setCountdown(prev => (prev > 1 ? prev - 1 : 3));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [activeStep]);

  return (
    <div style={{ background: '#020D1A', minHeight: '100vh', overflowX: 'hidden' }}>
      
      {/* SECTION 1 — HEADER */}
                  <section style={{ 
        padding: '120px 0 80px', 
        position: 'relative',
        overflow: 'hidden',
        background: '#020D1A', 
        display: 'flex',
        alignItems: 'center',
        textAlign: 'left' 
      }}>
        {/* Background Image */}
        <img 
          src="/How it works..png" 
          alt="Background" 
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 1,
            top: 0,
            left: 0,
            pointerEvents: 'none'
          }}
        />

        {/* Gradient Overlay */}
        <div style={{ 
          position: 'absolute', 
          inset: 0, 
          background: 'linear-gradient(rgba(2, 13, 26, 0.4), rgba(2, 13, 26, 0.4)), radial-gradient(ellipse 70% 60% at 60% 50%, rgba(127,205,255,0.06), transparent 70%)', 
          zIndex: 2, 
          pointerEvents: 'none' 
        }} />

        <div className="container" style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 2rem', position: 'relative', zIndex: 10, width: '100%' }}>
          <div style={{ maxWidth: '58%', textAlign: 'left' }}>
            
            <span style={{
              color: '#7FCDFF',
              fontSize: '0.85rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              background: 'rgba(127, 205, 255, 0.08)',
              padding: '6px 16px',
              borderRadius: '999px',
              display: 'inline-block',
              marginBottom: '20px',
              fontFamily: "'Plus Jakarta Sans', sans-serif"
            }}>
              How It Works
            </span>
            <h1 style={{
              fontSize: 'clamp(2.5rem, 5vw, 4rem)',
              fontWeight: 900,
              color: '#F1F5F9',
              letterSpacing: '-0.03em',
              marginBottom: '24px',
              lineHeight: '1.1',
              fontFamily: "'Plus Jakarta Sans', sans-serif"
            }}>
              The outbound playbook, automated.
            </h1>
            <p style={{
              fontSize: '1.25rem',
              color: '#6B9AB8',
              margin: '0 0 40px 0',
              lineHeight: '1.6',
              fontFamily: "'Plus Jakarta Sans', sans-serif"
            }}>
              Voxiq takes the manual labor out of outbound dialing. We connect your CRM, automate dialing queues, and log outcomes instantly so your reps can focus on selling.
            </p>

            <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-start', marginBottom: '60px' }}>
              <Link
                to="/signup"
                style={{
                  textDecoration: 'none',
                  background: 'rgb(223, 247, 255)', color: '#0A2540',
                  padding: '16px 36px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '1rem',
                  boxShadow: '0 8px 24px rgba(127, 205, 255, 0.25)',
                  transition: 'all 0.2s',
                  fontFamily: "'Plus Jakarta Sans', sans-serif"
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                Start Free Trial
              </Link>
              <button
                onClick={() => navigate('/pricing')}
                style={{
                  background: 'transparent',
                  color: '#FFFFFF',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  padding: '16px 36px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '1rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontFamily: "'Plus Jakarta Sans', sans-serif"
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.background = 'transparent'; }}
              >
                See Pricing
              </button>
            </div>
            
          </div>
        </div>
      </section>

      {/* SECTION 2 — 3-STEP CARDS WITH CONNECTING LINES */}
      <section style={{ padding: '80px 0', background: '#020D1A', position: 'relative' }}>
        <div className="container" style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 2rem' }}>
          
          <div style={{ position: 'relative' }}>
            {/* Horizontal Line on Desktop */}
            <div style={{
              position: 'absolute',
              top: '50px',
              left: '12%',
              right: '12%',
              height: '1px',
              background: '#E2E8F0',
              zIndex: 0
            }} className="step-connect-line" />

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '40px',
              position: 'relative',
              zIndex: 1
            }} className="how-steps-grid">
              
              {/* Step 1 */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <div style={{
                  width: '90px',
                  height: '90px',
                  borderRadius: '50%',
                  background: 'rgba(127, 205, 255, 0.1)',
                  border: '1px solid rgba(127, 205, 255, 0.2)',
                  boxShadow: '0 10px 25px rgba(127, 205, 255, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.8rem',
                  fontWeight: 700,
                  color: '#7FCDFF',
                  marginBottom: '20px',
                  fontFamily: "'Plus Jakarta Sans', sans-serif"
                }}>
                  01
                </div>
                <div style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  color: '#10B981',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: '999px',
                  marginBottom: '16px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontFamily: "'Plus Jakarta Sans', sans-serif"
                }}>
                  <Clock size={12} /> Takes 2 minutes
                </div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 600, color: '#F1F5F9', marginBottom: '12px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Link CRM</h3>
                <p style={{ fontSize: '0.95rem', color: '#6B9AB8', lineHeight: '1.6', maxWidth: '320px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Connect Pipedrive natively. Voxiq automatically syncs your lists, fields, and owners.
                </p>
              </div>

              {/* Step 2 */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <div style={{
                  width: '90px',
                  height: '90px',
                  borderRadius: '50%',
                  background: 'rgba(127, 205, 255, 0.1)',
                  border: '1px solid rgba(127, 205, 255, 0.2)',
                  boxShadow: '0 10px 25px rgba(127, 205, 255, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.8rem',
                  fontWeight: 700,
                  color: '#7FCDFF',
                  marginBottom: '20px',
                  fontFamily: "'Plus Jakarta Sans', sans-serif"
                }}>
                  02
                </div>
                <div style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  color: '#10B981',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: '999px',
                  marginBottom: '16px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontFamily: "'Plus Jakarta Sans', sans-serif"
                }}>
                  <Clock size={12} /> Setup in seconds
                </div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 600, color: '#F1F5F9', marginBottom: '12px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Select Call List</h3>
                <p style={{ fontSize: '0.95rem', color: '#6B9AB8', lineHeight: '1.6', maxWidth: '320px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Choose a CRM view or upload a list. Set local-presence rules and dialer preferences with a few toggles.
                </p>
              </div>

              {/* Step 3 */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <div style={{
                  width: '90px',
                  height: '90px',
                  borderRadius: '50%',
                  background: 'rgba(127, 205, 255, 0.1)',
                  border: '1px solid rgba(127, 205, 255, 0.2)',
                  boxShadow: '0 10px 25px rgba(127, 205, 255, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.8rem',
                  fontWeight: 700,
                  color: '#7FCDFF',
                  marginBottom: '20px',
                  fontFamily: "'Plus Jakarta Sans', sans-serif"
                }}>
                  03
                </div>
                <div style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  color: '#10B981',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: '999px',
                  marginBottom: '16px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontFamily: "'Plus Jakarta Sans', sans-serif"
                }}>
                  <Clock size={12} /> Connects instantly
                </div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 600, color: '#F1F5F9', marginBottom: '12px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Click Start</h3>
                <p style={{ fontSize: '0.95rem', color: '#6B9AB8', lineHeight: '1.6', maxWidth: '320px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Reps click start to dial. The moment a contact picks up, they hear the rep. Outcomes are synced back automatically.
                </p>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* SECTION 3 — DETAILED WALKTHROUGH (TABBED) */}
      <section style={{ padding: '100px 0', background: '#020D1A', borderTop: '1px solid rgba(127,205,255,0.08)', borderBottom: '1px solid rgba(127,205,255,0.08)' }}>
        <div className="container" style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 2rem' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 700, color: '#F1F5F9', letterSpacing: '-0.025em', marginBottom: '16px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Deep dive into the calling workspace
            </h2>
            <p style={{ fontSize: '1.15rem', color: '#6B9AB8', maxWidth: '600px', margin: '0 auto', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Interactive timeline showing a full sales cycle from initial dial to auto-log.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '0.9fr 1.1fr',
            gap: '80px',
            alignItems: 'center'
          }} className="walkthrough-grid">
            
            {/* Timeline Indexes (Left) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[
                { id: 'dialing', step: '01', title: '1. Dialing & Ringing', desc: 'System automatically initiates dialing. Lead list feeds next names.' },
                { id: 'connected', step: '02', title: '2. Live Connection', desc: 'WebRTC lines open instantly. Audio waves activate, timer starts counting.' },
                { id: 'disposition', step: '03', title: '3. Call Disposition', desc: 'Select outcome options. Flag notes and outcomes directly inside the workspace.' },
                { id: 'crm_log', step: '04', title: '4. Instant CRM Sync', desc: 'Outcomes, duration, and logs flow natively to your CRM.' },
                { id: 'countdown', step: '05', title: '5. Auto-Advance Timer', desc: 'A 3-second countdown loops reps directly into the next call. Seamless flow.' }
              ].map(item => {
                const isActive = activeStep === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveStep(item.id)}
                    style={{
                      textAlign: 'left',
                      padding: '24px',
                      background: isActive ? '#111929' : 'transparent',
                      border: isActive ? '1px solid rgba(127,205,255,0.08)' : '1px solid transparent',
                      borderRadius: '16px',
                      boxShadow: isActive ? '0 10px 30px rgba(0,0,0,0.3)' : 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      outline: 'none',
                      display: 'flex',
                      gap: '20px',
                      alignItems: 'flex-start',
                      fontFamily: "'Plus Jakarta Sans', sans-serif"
                    }}
                  >
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: isActive ? '#7FCDFF' : 'rgba(127,205,255,0.08)',
                      color: isActive ? 'white' : '#6B9AB8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      flexShrink: 0
                    }}>
                      {item.step}
                    </div>
                    <div>
                      <h4 style={{ margin: '0 0 6px', fontSize: '1.1rem', fontWeight: 600, color: isActive ? '#F1F5F9' : '#6B9AB8' }}>
                        {item.title}
                      </h4>
                      <p style={{ margin: 0, fontSize: '0.9rem', color: '#6B9AB8', lineHeight: '1.5' }}>
                        {item.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Mockup Screens (Right) */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{
                background: '#111929',
                border: '1px solid #1e2537',
                borderRadius: '24px',
                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.4)',
                padding: '32px',
                width: '100%',
                maxWidth: '480px',
                color: '#F1F5F9',
                minHeight: '340px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                fontFamily: "'Plus Jakarta Sans', sans-serif"
              }}>
                
                {/* 1. DIALING MOCKUP */}
                {activeStep === 'dialing' && (
                  <div className="tab-fade-in">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #1e2537', paddingBottom: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="pulse-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#F59E0B', display: 'inline-block' }} />
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6B9AB8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dialing Queue</span>
                      </div>
                      <span style={{ fontSize: '0.7rem', color: '#7FCDFF', fontWeight: 600 }}>Line 1 of 3</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {[
                        { name: 'Robert Carter', company: 'Acme Corp', status: 'Ringing...' },
                        { name: 'Chloe Bennett', company: 'Vertex Sales', status: 'Pending' },
                        { name: 'Sarah Jenkins', company: 'NovaCRM', status: 'Pending' }
                      ].map((lead, idx) => (
                        <div key={idx} style={{
                          background: idx === 0 ? 'rgba(127, 205, 255, 0.08)' : '#0d1117',
                          border: idx === 0 ? '1.5px solid rgba(127, 205, 255, 0.3)' : '1px solid #1e2537',
                          borderRadius: '10px',
                          padding: '12px 14px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#F1F5F9' }}>{lead.name}</div>
                            <div style={{ fontSize: '0.72rem', color: '#6B9AB8', marginTop: '2px' }}>{lead.company}</div>
                          </div>
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            color: idx === 0 ? '#7FCDFF' : '#64748B',
                            background: idx === 0 ? 'rgba(127, 205, 255, 0.1)' : 'transparent',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            border: idx === 0 ? '1px solid rgba(127, 205, 255, 0.2)' : 'none'
                          }}>
                            {lead.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. CONNECTED MOCKUP */}
                {activeStep === 'connected' && (
                  <div className="tab-fade-in">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #1e2537', paddingBottom: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="pulse-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6B9AB8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Line Connected</span>
                      </div>
                      <span style={{ fontSize: '0.72rem', color: '#10B981', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', padding: '3px 8px', borderRadius: '4px', fontWeight: 700 }}>LIVE</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(127, 205, 255, 0.1)', border: '1px solid rgba(127, 205, 255, 0.2)', color: '#7FCDFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.25rem' }}>RC</div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#F1F5F9' }}>Robert Carter</h4>
                        <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#6B9AB8' }}>CEO at Acme Corp</p>
                      </div>
                    </div>

                    {/* Animated audio waves */}
                    <div style={{ background: '#020D1A', border: '1px solid #1e2537', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#F1F5F9', fontFamily: 'monospace' }}>0:42</span>
                      <div style={{ display: 'flex', gap: '4px', height: '20px', alignItems: 'center' }}>
                        {[1, 2, 3, 2, 4, 3, 5, 2, 4, 3, 5, 2, 1, 3, 4, 2, 1].map((h, i) => (
                          <div
                            key={i}
                            style={{
                              width: '3px',
                              background: '#7FCDFF',
                              borderRadius: '2px',
                              height: `${h * 20}%`
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. DISPOSITION MOCKUP */}
                {activeStep === 'disposition' && (
                  <div className="tab-fade-in">
                    <h4 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 600, color: '#F1F5F9', borderBottom: '1px solid #1e2537', paddingBottom: '12px' }}>Call outcome</h4>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                      {[
                        { outcome: 'Interested', active: true },
                        { outcome: 'No Answer', active: false },
                        { outcome: 'Gatekeeper', active: false },
                        { outcome: 'Call Back Later', active: false },
                        { outcome: 'Do Not Call', active: false },
                        { outcome: 'Busy / Voicemail', active: false }
                      ].map((item, idx) => (
                        <div key={idx} style={{
                          padding: '12px',
                          borderRadius: '8px',
                          border: item.active ? '1.5px solid rgba(127, 205, 255, 0.4)' : '1px solid #1e2537',
                          background: item.active ? '#13203a' : '#0d1117',
                          color: item.active ? '#F1F5F9' : '#64748B',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          textAlign: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}>
                          {item.outcome}
                        </div>
                      ))}
                    </div>

                    <div style={{ fontSize: '0.72rem', color: '#6B9AB8', textTransform: 'uppercase', fontWeight: 700, marginBottom: '6px' }}>Call Notes</div>
                    <textarea 
                      readOnly 
                      value="Requested pricing deck. Booked callback for Monday at 10am."
                      style={{
                        width: '100%',
                        background: '#020D1A',
                        border: '1px solid #1e2537',
                        borderRadius: '6px',
                        color: '#CBD5E1',
                        padding: '10px',
                        fontSize: '0.8rem',
                        resize: 'none',
                        height: '50px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                )}

                {/* 4. CRM LOG MOCKUP */}
                {activeStep === 'crm_log' && (
                  <div className="tab-fade-in">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid #1e2537', paddingBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '4px', background: '#7FCDFF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.7rem', fontWeight: 900 }}>C</div>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#F1F5F9' }}>CRM Integration</span>
                      </div>
                      <span style={{ fontSize: '0.72rem', color: '#10B981', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', padding: '3px 8px', borderRadius: '4px', fontWeight: 700 }}>✓ SYNCED</span>
                    </div>

                    <div style={{ borderLeft: '2px solid #7FCDFF', paddingLeft: '14px', marginLeft: '6px' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#F1F5F9', marginBottom: '4px' }}>Call with Robert Carter Logged</div>
                      <div style={{ fontSize: '0.72rem', color: '#6B9AB8', marginBottom: '12px' }}>Duration: 0:42 ➜ Status: Interested</div>
                      
                      <div style={{ background: '#020D1A', border: '1px solid #1e2537', borderRadius: '8px', padding: '12px', fontSize: '0.75rem', color: '#CBD5E1', lineHeight: '1.5' }}>
                        <strong>Outcome:</strong> Interested — Callback Scheduled<br />
                        <strong>Notes:</strong> Requested pricing deck. Booked callback for Monday at 10am.<br />
                        <strong>Recording:</strong> <span style={{ color: '#7FCDFF', textDecoration: 'underline', cursor: 'pointer' }}>recording_8472.mp3</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. COUNTDOWN MOCKUP */}
                {activeStep === 'countdown' && (
                  <div className="tab-fade-in" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.85rem', color: '#6B9AB8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>
                      Disposition Saved successfully
                    </div>

                    <h3 style={{ fontSize: '1.4rem', fontWeight: 600, color: '#F1F5F9', marginBottom: '24px' }}>
                      Next call starting in <span style={{ color: '#7FCDFF', fontSize: '1.75rem', fontWeight: 700 }}>{countdown}</span>...
                    </h3>

                    {/* Progress Bar Animation */}
                    <div style={{
                      width: '100%',
                      height: '6px',
                      background: '#1e2537',
                      borderRadius: '3px',
                      overflow: 'hidden',
                      marginBottom: '32px'
                    }}>
                      <div style={{
                        width: `${(countdown / 3) * 100}%`,
                        height: '100%',
                        background: '#7FCDFF',
                        transition: 'width 1s linear'
                      }} />
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button style={{ flex: 1, padding: '12px', background: 'rgba(127, 205, 255, 0.1)', border: '1px solid rgba(127, 205, 255, 0.2)', borderRadius: '8px', color: '#7FCDFF', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}>Pause Dialer</button>
                      <button style={{ flex: 1.2, padding: '12px', background: '#7FCDFF', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}>Dial Now →</button>
                    </div>
                  </div>
                )}

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* SECTION 4 — SETUP TIMELINE (0:00 TO 10:00) */}
      <section style={{ padding: '100px 0', background: '#020D1A' }}>
        <div className="container" style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 2rem' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '80px' }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 700, color: '#F1F5F9', letterSpacing: '-0.025em', marginBottom: '16px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              From setup to dialing in 10 minutes
            </h2>
            <p style={{ fontSize: '1.15rem', color: '#6B9AB8', maxWidth: '600px', margin: '0 auto', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Setting up Voxiq is fully self-serve. Follow our chronological setup milestones.
            </p>
          </div>

          {/* Horizontal timeline bar */}
          <div style={{
            background: '#020D1A',
            border: '1px solid #1e2537',
            borderRadius: '24px',
            padding: '50px 30px',
            position: 'relative'
          }}>
            {/* Desktop timeline line */}
            <div style={{
              position: 'absolute',
              top: '80px',
              left: '8%',
              right: '8%',
              height: '1px',
              background: '#1e2537',
              zIndex: 0
            }} className="timeline-horizontal-line" />

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: '24px',
              position: 'relative',
              zIndex: 1
            }} className="timeline-items-grid">
              
              {[
                { time: '0:00', title: 'Create Account', desc: 'Verify email & select your domain.' },
                { time: '2:00', title: 'Integrate CRM', desc: 'Connect your CRM in 2 clicks.' },
                { time: '4:00', title: 'Field Mapping', desc: 'Align dial statuses and custom pipeline fields.' },
                { time: '6:00', title: 'Add Reps', desc: 'Invite team members. They setup in 1 click.' },
                { time: '10:00', title: 'Launch Dialer', desc: 'Start first live queue session. Dial 3x faster!' }
              ].map((item, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                  <span style={{
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: '#7FCDFF',
                    background: 'rgba(127, 205, 255, 0.1)',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    marginBottom: '14px',
                    border: '1px solid rgba(127, 205, 255, 0.2)',
                    fontFamily: "'Plus Jakarta Sans', sans-serif"
                  }}>
                    {item.time}
                  </span>
                  
                  <div style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: idx === 4 ? '#7FCDFF' : '#0B0F1A',
                    border: '3px solid #7FCDFF',
                    marginBottom: '16px',
                    boxShadow: '0 0 0 4px #0d1117'
                  }} />

                  <h4 style={{ margin: '0 0 8px', fontSize: '1rem', fontWeight: 600, color: '#F1F5F9', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {item.title}
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#6B9AB8', lineHeight: '1.4', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {item.desc}
                  </p>
                </div>
              ))}

            </div>
          </div>

        </div>
      </section>

      {/* SECTION 5 — OBJECTION BUSTERS */}
      <section style={{ padding: '100px 0', background: '#020D1A', borderTop: '1px solid #E5E7EB', borderBottom: '1px solid #E5E7EB' }}>
        <div className="container" style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 2rem' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 700, color: '#F1F5F9', letterSpacing: '-0.025em', marginBottom: '16px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Addressing the tough questions
            </h2>
            <p style={{ fontSize: '1.15rem', color: '#6B9AB8', maxWidth: '600px', margin: '0 auto', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              We know changing sales tools is a hassle. Here is how we make it safe and simple.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '30px'
          }} className="objection-grid">
            
            {/* Card 1 */}
            <div style={{
              background: '#020D1A',
              border: '1px solid rgba(127,205,255,0.08)',
              borderRadius: '20px',
              padding: '32px',
              boxShadow: '0 10px 30px rgba(127, 205, 255, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              transition: 'border-color 0.3s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(127, 205, 255, 0.3)'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = '#E2E8F0'}
            >
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                background: 'rgba(127, 205, 255, 0.1)',
                color: '#7FCDFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Database size={20} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#F1F5F9', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>CRM Compatibility</h3>
              <p style={{ fontSize: '0.9rem', color: '#6B9AB8', lineHeight: '1.6', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                <strong style={{ color: '#F1F5F9' }}>Will it mess up our CRM data?</strong><br /><br />
                Absolutely not. Voxiq uses standard, official API connections to write call actions and task records. We log calls natively without overriding any lead ownership or field properties.
              </p>
            </div>

            {/* Card 2 */}
            <div style={{
              background: '#020D1A',
              border: '1px solid rgba(127,205,255,0.08)',
              borderRadius: '20px',
              padding: '32px',
              boxShadow: '0 10px 30px rgba(127, 205, 255, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              transition: 'border-color 0.3s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(127, 205, 255, 0.3)'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = '#E2E8F0'}
            >
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                background: 'rgba(127, 205, 255, 0.1)',
                color: '#7FCDFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Settings size={20} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#F1F5F9', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>IT & Security Dependency</h3>
              <p style={{ fontSize: '0.9rem', color: '#6B9AB8', lineHeight: '1.6', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                <strong style={{ color: '#F1F5F9' }}>Do we need IT support or engineers?</strong><br /><br />
                Zero developer time needed. Voxiq connects instantly in browser. Reps dial directly through their Chrome workspace using WebRTC, bypass softphone downloads, and auto-sync outcomes.
              </p>
            </div>

            {/* Card 3 */}
            <div style={{
              background: '#020D1A',
              border: '1px solid rgba(127,205,255,0.08)',
              borderRadius: '20px',
              padding: '32px',
              boxShadow: '0 10px 30px rgba(127, 205, 255, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              transition: 'border-color 0.3s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(127, 205, 255, 0.3)'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = '#E2E8F0'}
            >
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                background: 'rgba(127, 205, 255, 0.1)',
                color: '#7FCDFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Headphones size={20} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#F1F5F9', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Onboarding Curve</h3>
              <p style={{ fontSize: '0.9rem', color: '#6B9AB8', lineHeight: '1.6', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                <strong style={{ color: '#F1F5F9' }}>How long does it take reps to learn?</strong><br /><br />
                Less than 15 minutes. The interface is optimized exclusively for phone activities. Your agents only see what they need to: lead cards, dial controls, script notes, and disposition options.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* SECTION 6 — BOTTOM CTA */}
      <section style={{ padding: '100px 0', background: '#020D1A' }}>
        <div className="container" style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 2rem' }}>
          <div style={{
            background: '#111929',
            border: '1px solid #1e2537',
            borderRadius: '32px',
            padding: '80px 40px',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 30px 60px rgba(0, 0, 0, 0.4), 0 0 40px rgba(127, 205, 255, 0.05)'
          }}>
            
            <div style={{
              position: 'absolute',
              top: '-40%',
              left: '-20%',
              width: '400px',
              height: '400px',
              background: 'rgba(127, 205, 255, 0.1)',
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
              background: 'rgba(127, 205, 255, 0.1)',
              borderRadius: '50%',
              filter: 'blur(100px)',
              pointerEvents: 'none'
            }} />

            <h2 style={{
              fontSize: 'clamp(2rem, 4vw, 3.25rem)',
              fontWeight: 700,
              color: '#F1F5F9',
              marginBottom: '20px',
              letterSpacing: '-0.02em',
              position: 'relative',
              zIndex: 1,
              fontFamily: "'Plus Jakarta Sans', sans-serif"
            }}>
              Ready to double your reps' call volume?
            </h2>
            
            <p style={{
              fontSize: '1.2rem',
              color: '#6B9AB8',
              maxWidth: '600px',
              margin: '0 auto 40px',
              lineHeight: '1.6',
              position: 'relative',
              zIndex: 1,
              fontFamily: "'Plus Jakarta Sans', sans-serif"
            }}>
              Set up Voxiq in under 10 minutes and start your 14-day free trial. No credit card required.
            </p>

            <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }} className="how-cta-actions">
              <Link
                to="/signup"
                style={{
                  textDecoration: 'none',
                  background: '#7FCDFF',
                  color: 'white',
                  padding: '20px 48px',
                  borderRadius: '12px',
                  fontWeight: 600,
                  fontSize: '1.1rem',
                  boxShadow: '0 8px 24px rgba(127, 205, 255, 0.35)',
                  transition: 'all 0.2s',
                  display: 'inline-block',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#5B4FE8';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 12px 28px rgba(127, 205, 255, 0.45)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#7FCDFF';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(127, 205, 255, 0.35)';
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
                  padding: '20px 48px',
                  borderRadius: '12px',
                  fontWeight: 600,
                  fontSize: '1.1rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
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
                Book a Demo
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <Footer />

      {/* Responsive styles */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .tab-fade-in {
          animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @media (max-width: 968px) {
          .how-cta-actions {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .how-cta-actions > * {
            width: 100% !important;
            text-align: center !important;
            justify-content: center !important;
          }
          .step-connect-line {
            display: none !important;
          }
          .how-steps-grid {
            grid-template-columns: 1fr !important;
            gap: 48px !important;
          }
          .walkthrough-grid {
            grid-template-columns: 1fr !important;
            gap: 40px !important;
          }
          .timeline-horizontal-line {
            display: none !important;
          }
          .timeline-items-grid {
            grid-template-columns: 1fr !important;
            gap: 40px !important;
          }
          .objection-grid {
            grid-template-columns: 1fr !important;
            gap: 24px !important;
          }
        }
      `}</style>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';
import { 
  CheckCircle2, 
  ArrowRight, 
  Zap, 
  Database,
  ArrowUpRight,
  Code,
  ShieldCheck,
  Cpu,
  Link as LinkIcon
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

export default function Integrations() {
  const navigate = useNavigate();

  return (
    <div style={{ background: '#020D1A', minHeight: '100vh', overflowX: 'hidden' }}>
      
      {/* 1. Hero */}
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
          src="/Intergration for Zapier..png" 
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
              Integrations
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
              Connect Voxiq with the tools you already use.
            </h1>
            <p style={{
              fontSize: '1.25rem',
              color: '#6B9AB8',
              margin: '0 0 40px 0',
              lineHeight: '1.6',
              fontFamily: "'Plus Jakarta Sans', sans-serif"
            }}>
              Voxiq integrates natively with top CRMs, email systems, and marketing automation tools. Set up workflows in minutes with no code.
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

      {/* 2. Featured Integration (full-width card, purple border) */}
      <FadeInSection>
        <section style={{ padding: '40px 0 80px', background: '#020D1A' }}>
          <div className="container" style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 2rem' }}>
            <div style={{
              background: '#020D1A',
              border: '2px solid #7FCDFF',
              borderRadius: '24px',
              padding: '48px',
              color: '#F1F5F9',
              boxShadow: '0 30px 60px rgba(127, 205, 255, 0.08)',
              position: 'relative'
            }}>
              
              <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <span style={{
                  background: '#7FCDFF',
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: '999px',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em'
                }}>
                  MOST POPULAR
                </span>
                <span style={{
                  background: 'rgba(127, 205, 255, 0.08)',
                  color: '#7FCDFF',
                  padding: '4px 12px',
                  borderRadius: '999px',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em'
                }}>
                  Native Integration
                </span>
              </div>
              
              <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#F1F5F9', margin: '0 0 8px 0', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em' }}>
                GoHighLevel
              </h2>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#6B9AB8', margin: '0 0 16px 0', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                The most powerful GHL + dialer integration
              </h3>
              
              <p style={{ fontSize: '1.05rem', color: '#6B9AB8', lineHeight: '1.6', marginBottom: '32px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Built for GHL users and agencies. 2-way contact sync, workflow triggers on call outcomes, pipeline stage updates, and conversation logs directly in GHL contacts.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '40px' }} className="features-checklist-grid">
                {[
                  '2-way contact sync',
                  'Trigger GHL workflows on call outcomes',
                  'Auto-update pipeline stages after calls',
                  'SMS and WhatsApp logs in GHL contact timeline',
                  'AI Agent integrates with GHL automation'
                ].map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <CheckCircle2 size={18} color="#7FCDFF" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span style={{ fontSize: '0.95rem', color: '#6B9AB8', fontWeight: 600 }}>{item}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  style={{
                    background: '#7FCDFF',
                    color: 'white',
                    padding: '16px 36px',
                    borderRadius: '10px',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Connect GHL
                </button>
                <button
                  style={{
                    background: 'white', color: '#0A2540',
                    border: '1px solid #1e2537',
                    padding: '16px 36px',
                    borderRadius: '10px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  View setup guide
                </button>
              </div>

            </div>
          </div>
        </section>
      </FadeInSection>

      {/* 3. Integration Cards Grid (2 columns) */}
      <FadeInSection>
        <section style={{ padding: '0 0 80px', background: '#020D1A' }}>
          <div className="container" style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 2rem' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '30px'
            }} className="related-grid">
              
              {/* Zapier */}
              <div style={{
                background: '#020D1A',
                border: '1px solid #1e2537',
                borderRadius: '16px',
                padding: '32px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <div>
                  <h4 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#F1F5F9', marginBottom: '16px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Zapier</h4>
                  <p style={{ fontSize: '0.95rem', color: '#6B9AB8', lineHeight: '1.6', margin: '0 0 20px 0', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    Connect Voxiq to 5,000+ apps with no code. Trigger zaps on calls, SMS, voicemails, and more.
                  </p>
                  <div style={{ background: '#020D1A', borderRadius: '8px', padding: '12px', marginBottom: '24px', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontWeight: 600 }}>Popular Zaps:</div>
                    <div>⚡ "New call → Add to spreadsheet"</div>
                    <div>⚡ "Missed call → Slack notification"</div>
                  </div>
                </div>
                <button style={{ background: '#020D1A', border: '1px solid #1e2537', borderRadius: '8px', padding: '10px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>
                  View Zapier integration
                </button>
              </div>


              {/* Pipedrive */}
              <div style={{
                background: '#020D1A',
                border: '1px solid #1e2537',
                borderRadius: '16px',
                padding: '32px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <div>
                  <h4 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#F1F5F9', marginBottom: '16px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Pipedrive</h4>
                  <p style={{ fontSize: '0.95rem', color: '#6B9AB8', lineHeight: '1.6', margin: '0 0 24px 0', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    Call outcomes trigger deal stage changes in Pipedrive. Log activities and notes automatically.
                  </p>
                </div>
                <button style={{ background: '#020D1A', border: '1px solid #1e2537', borderRadius: '8px', padding: '10px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>
                  View Pipedrive integration
                </button>
              </div>

            </div>
          </div>
        </section>
      </FadeInSection>

      {/* 4. Bottom Section */}
      <FadeInSection>
        <section style={{ padding: '80px 0', background: '#020D1A', borderTop: '1px solid #1e2537', borderBottom: '1px solid #1e2537', textAlign: 'center' }}>
          <div className="container" style={{ maxWidth: '800px', margin: '0 auto', padding: '0 2rem' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#F1F5F9', marginBottom: '12px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Need a custom integration?
            </h2>
            <p style={{ fontSize: '1.1rem', color: '#6B9AB8', marginBottom: '32px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Voxiq provides APIs and a REST API for enterprise and custom integration needs.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                style={{
                  background: '#7FCDFF',
                  color: 'white',
                  padding: '14px 28px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                View API docs
              </button>
              <button
                style={{
                  background: 'white', color: '#0A2540',
                  border: '1px solid #1e2537',
                  padding: '14px 28px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Contact us
              </button>
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* FOOTER */}
      <Footer />
    </div>
  );
}

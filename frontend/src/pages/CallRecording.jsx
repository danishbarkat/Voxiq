import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';
import { 
  CheckCircle2, 
  ArrowRight, 
  Zap, 
  Play,
  Pause,
  Volume2,
  Mic, 
  ShieldCheck, 
  Search,
  Tag,
  Headphones
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

export default function CallRecording() {
  const navigate = useNavigate();

  return (
    <div style={{ background: '#020D1A', minHeight: '100vh', overflowX: 'hidden' }}>
      
      {/* 1. Feature Hero */}
      <section style={{ 
        padding: '120px 0 80px', 
        background: 'radial-gradient(circle at 50% -20%, rgba(124, 109, 250, 0.15) 0%, #0B0F1A 70%)', 
        textAlign: 'center' 
      }}>
        <div className="container" style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 2rem' }}>
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
            CALL RECORDING
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
            Every conversation. Recorded, searchable, and ready for coaching.
          </h1>
          <p style={{
            fontSize: '1.25rem',
            color: '#6B9AB8',
            maxWidth: '750px',
            margin: '0 auto 40px',
            lineHeight: '1.6',
            fontFamily: "'Plus Jakarta Sans', sans-serif"
          }}>
            Voxiq records every call automatically. Managers use recordings for coaching. Reps use them to remember exactly what was said.
          </p>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginBottom: '60px' }}>
            <Link
              to="/signup"
              style={{
                textDecoration: 'none',
                background: '#7C6DFA',
                color: 'white',
                padding: '16px 36px',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '1rem',
                boxShadow: '0 8px 24px rgba(124, 109, 250, 0.25)',
                transition: 'all 0.2s',
                fontFamily: "'Plus Jakarta Sans', sans-serif"
              }}
            >
              Start Free Trial
            </Link>
            <button
              onClick={() => navigate('/pricing')}
              style={{
                background: 'white',
                color: '#F1F5F9',
                border: '1px solid #1e2537',
                padding: '16px 36px',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '1rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontFamily: "'Plus Jakarta Sans', sans-serif"
              }}
            >
              See Pricing
            </button>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '24px',
            borderTop: '1px solid #1e2537',
            paddingTop: '40px',
            maxWidth: '800px',
            margin: '0 auto'
          }} className="stats-row">
            {[
              { val: '100%', desc: 'of calls recorded' },
              { val: 'AI', desc: 'transcription' },
              { val: 'Unlimited', desc: 'storage' }
            ].map((st, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <h3 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#7C6DFA', margin: '0 0 6px 0', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{st.val}</h3>
                <p style={{ fontSize: '0.9rem', color: '#6B9AB8', margin: 0, fontWeight: 500, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{st.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 2. Key Benefits */}
      <FadeInSection>
        <section style={{ padding: '80px 0', background: '#020D1A' }}>
          <div className="container" style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 2rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '60px' }}>
              <h2 style={{ fontSize: '2.25rem', fontWeight: 900, color: '#F1F5F9', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em' }}>
                Key Benefits
              </h2>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '30px'
            }} className="benefits-grid">
              {[
                {
                  icon: <ShieldCheck size={24} color="#7C6DFA" />,
                  title: 'Automatic Recording',
                  desc: 'Every call is recorded without reps needing to press a button.'
                },
                {
                  icon: <Mic size={24} color="#7C6DFA" />,
                  title: 'AI-Powered Transcription',
                  desc: 'Full transcripts generated automatically. Search for any word across all recordings.'
                },
                {
                  icon: <Headphones size={24} color="#7C6DFA" />,
                  title: 'Coaching Playlists',
                  desc: 'Managers build playlists of great calls to train new reps faster.'
                }
              ].map((card, idx) => (
                <div key={idx} style={{
                  background: '#020D1A',
                  border: '1px solid #1e2537',
                  borderRadius: '16px',
                  padding: '32px'
                }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '10px',
                    background: 'rgba(124, 109, 250, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '20px'
                  }}>
                    {card.icon}
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#F1F5F9', marginBottom: '12px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {card.title}
                  </h3>
                  <p style={{ fontSize: '0.95rem', color: '#6B9AB8', lineHeight: '1.6', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {card.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* 3. How It Works */}
      <FadeInSection>
        <section style={{ padding: '80px 0', background: '#020D1A', borderBottom: '1px solid #1e2537' }}>
          <div className="container" style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 2rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '60px' }}>
              <h2 style={{ fontSize: '2.25rem', fontWeight: 900, color: '#F1F5F9', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>How It Works</h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '40px' }} className="steps-container">
              {[
                { step: '01', title: 'Call starts — recording begins automatically', desc: 'Voxiq handles all call tracks natively with zero rep input.' },
                { step: '02', title: 'Call ends — recording and transcript saved instantly', desc: 'Secure encryption stores standard sound assets.' },
                { step: '03', title: 'Manager reviews, shares, or uses for coaching', desc: 'Sync files back to pipeline folders and playlists.' }
              ].map((step, idx) => (
                <div key={idx} style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{
                    fontSize: '4.5rem',
                    fontWeight: 900,
                    color: 'rgba(124, 109, 250, 0.08)',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    lineHeight: '1',
                    marginBottom: '-20px'
                  }}>{step.step}</div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#F1F5F9', marginBottom: '12px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{step.title}</h3>
                  <p style={{ fontSize: '0.95rem', color: '#6B9AB8', lineHeight: '1.6', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* 4. Feature Deep Dive */}
      <FadeInSection>
        <section style={{ padding: '100px 0', background: '#020D1A' }}>
          <div className="container" style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 2rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '80px' }}>
              
              {/* Section A */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '60px',
                alignItems: 'center'
              }} className="feature-row">
                <div>
                  <h2 style={{ fontSize: '2.25rem', fontWeight: 900, color: '#F1F5F9', marginBottom: '20px', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em', lineHeight: '1.2' }}>
                    Searchable transcripts save managers 2h/week
                  </h2>
                  <p style={{ fontSize: '1.1rem', color: '#6B9AB8', lineHeight: '1.6', marginBottom: '24px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    Index call dialogues by keywords, objections, competitor names, or pricing tokens.
                  </p>
                </div>
                <div style={{
                  background: '#0F0F1A',
                  border: '1.5px solid rgba(124, 109, 250, 0.25)',
                  borderRadius: '20px',
                  padding: '24px',
                  color: 'white',
                  boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)'
                }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#A594F9' }}>AI Search Query</h4>
                  <div style={{ background: '#020D1A', border: '1px solid #1e2537', padding: '12px', borderRadius: '8px', fontSize: '0.8rem' }}>
                    Searching for: "activity sync" ... 42 matches found.
                  </div>
                </div>
              </div>

              {/* Section B */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '60px',
                alignItems: 'center'
              }} className="feature-row">
                <div style={{
                  background: '#0F0F1A',
                  border: '1.5px solid rgba(124, 109, 250, 0.25)',
                  borderRadius: '20px',
                  padding: '24px',
                  color: 'white',
                  boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)',
                  order: 0
                }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#A594F9' }}>Compliance Guard</h4>
                  <div style={{ background: '#020D1A', border: '1px solid #1e2537', padding: '12px', borderRadius: '8px', fontSize: '0.8rem' }}>
                    Regional Rules status: State Consent Active
                  </div>
                </div>
                <div>
                  <h2 style={{ fontSize: '2.25rem', fontWeight: 900, color: '#F1F5F9', marginBottom: '20px', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em', lineHeight: '1.2' }}>
                    Compliance recording for regulated industries
                  </h2>
                  <p style={{ fontSize: '1.1rem', color: '#6B9AB8', lineHeight: '1.6', marginBottom: '24px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    Enforce recording laws by checking regional codes in real-time.
                  </p>
                </div>
              </div>

            </div>
          </div>
        </section>
      </FadeInSection>

      {/* Related Features */}
      <section style={{ padding: '60px 0', background: '#020D1A', borderTop: '1px solid #1e2537' }}>
        <div className="container" style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 2rem' }}>
          <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#6B9AB8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '24px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Related Features
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }} className="related-grid">
            {[
              { name: 'Inbound Calls', path: '/features/inbound-calls' },
              { name: 'Outbound Calls', path: '/features/outbound-calls' },
              { name: 'Analytics', path: '/features/analytics' }
            ].map((rf, i) => (
              <Link 
                key={i} 
                to={rf.path}
                style={{
                  background: '#020D1A',
                  border: '1px solid #1e2537',
                  borderRadius: '12px',
                  padding: '20px 24px',
                  textDecoration: 'none',
                  color: 'inherit',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span style={{ fontSize: '1rem', fontWeight: 800, color: '#F1F5F9', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{rf.name}</span>
                <ArrowRight size={16} color="#7C6DFA" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <FadeInSection>
        <section style={{ padding: '80px 0', background: '#111929', borderTop: '1px solid #1e2537', borderBottom: '1px solid #1e2537' }}>
          <div className="container" style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 2rem', textAlign: 'center' }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 900, color: 'white', marginBottom: '20px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Secure compliant intelligence today
            </h2>
            <Link
              to="/signup"
              style={{
                background: '#7C6DFA',
                color: 'white',
                padding: '16px 40px',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '1.05rem',
                textDecoration: 'none',
                boxShadow: '0 8px 24px rgba(124, 109, 250, 0.35)',
                display: 'inline-block',
                fontFamily: "'Plus Jakarta Sans', sans-serif"
              }}
            >
              Start Free Trial
            </Link>
          </div>
        </section>
      </FadeInSection>

      {/* FOOTER */}
      <Footer />
    </div>
  );
}

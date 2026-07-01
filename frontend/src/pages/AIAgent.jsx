import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';
import { 
  CheckCircle2, 
  ArrowRight, 
  Zap, 
  Bot,
  Sparkles,
  PhoneCall,
  Calendar,
  Clock,
  Play,
  Volume2,
  MessageCircle
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

export default function AIAgent() {
  const navigate = useNavigate();

  return (
    <div style={{ background: '#020D1A', minHeight: '100vh', overflowX: 'hidden' }}>
      
      {/* 1. Feature Hero */}
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
          src="/AI Agent Caller.png" 
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
            
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <span style={{
                color: '#7FCDFF',
                fontSize: '0.85rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                background: 'rgba(127, 205, 255, 0.08)',
                padding: '6px 16px',
                borderRadius: '999px',
                fontFamily: "'Plus Jakarta Sans', sans-serif"
              }}>
                AI AGENT CALLER — NEW
              </span>
              
              <span style={{
                background: '#10B981',
                color: 'white',
                fontSize: '11px',
                fontWeight: 800,
                padding: '4px 10px',
                borderRadius: '999px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                NEW
              </span>
            </div>
            <h1 style={{
              fontSize: 'clamp(2.5rem, 5vw, 4rem)',
              fontWeight: 900,
              color: '#F1F5F9',
              letterSpacing: '-0.03em',
              marginBottom: '24px',
              lineHeight: '1.1',
              fontFamily: "'Plus Jakarta Sans', sans-serif"
            }}>
              An AI rep that calls leads, qualifies them, and books meetings — 24/7.
            </h1>
            <p style={{
              fontSize: '1.25rem',
              color: '#6B9AB8',
              margin: '0 0 40px 0',
              lineHeight: '1.6',
              fontFamily: "'Plus Jakarta Sans', sans-serif"
            }}>
              Voxiq's AI Agent uses natural voice to call new leads the moment they come in. It qualifies them with your custom script and hands warm leads off to your reps.
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
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '24px',
              borderTop: '1px solid #1e2537',
              paddingTop: '40px',
              margin: '0'
            }} className="stats-row">
              {[
                { val: '< 60s', desc: 'Calls leads in' },
                { val: '24/7', desc: 'availability' },
                { val: 'Human', desc: 'quality voice' }
              ].map((st, i) => (
                <div key={i} style={{ textAlign: 'left' }}>
                  <h3 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#7FCDFF', margin: '0 0 6px 0', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{st.val}</h3>
                  <p style={{ fontSize: '0.9rem', color: '#6B9AB8', margin: 0, fontWeight: 500, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{st.desc}</p>
                </div>
              ))}
            </div>
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
                  icon: <Bot size={24} color="#7FCDFF" />,
                  title: 'Instant Lead Response',
                  desc: 'New lead signs up? AI Agent calls them within 60 seconds — while interest is hot.'
                },
                {
                  icon: <MessageCircle size={24} color="#7FCDFF" />,
                  title: 'Natural Voice Conversation',
                  desc: 'Not a robotic IVR. A real conversation with natural language understanding.'
                },
                {
                  icon: <Calendar size={24} color="#7FCDFF" />,
                  title: 'Books Meetings Automatically',
                  desc: "Qualified leads get booked directly into your rep's calendar without human intervention."
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
                    background: 'rgba(127, 205, 255, 0.08)',
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
                { step: '01', title: 'New lead submits a form or signs up', desc: 'Trigger outreach schedules in seconds.' },
                { step: '02', title: 'AI Agent calls them immediately, runs your qualification script', desc: 'Hold natural dialogues natively.' },
                { step: '03', title: 'Qualified lead → booked on rep calendar. Unqualified → nurture sequence triggered.', desc: 'Push outcomes back to CRM pipeline segments.' }
              ].map((step, idx) => (
                <div key={idx} style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{
                    fontSize: '4.5rem',
                    fontWeight: 900,
                    color: 'rgba(127, 205, 255, 0.08)',
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
                    How the AI Agent qualification script works
                  </h2>
                  <p style={{ fontSize: '1.1rem', color: '#6B9AB8', lineHeight: '1.6', marginBottom: '24px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    Configure steps to ask qualification prompts, resolve objections, and book meetings. Customize parameters natively in the script console.
                  </p>
                  <div style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '8px', padding: '16px', fontSize: '0.82rem', lineHeight: '1.4' }}>
                    <strong>Example Dialogue:</strong><br />
                    AI: "Hi, this is Aria calling from [Company]. Is this Sarah?"<br />
                    Lead: "Yes, speaking."<br />
                    AI: "Great! You requested info about our dialer. Do you have 2 minutes?"<br />
                    Lead: "Sure!"<br />
                    AI: "Perfect. Are you currently using a dialer, or dialing manually?"
                  </div>
                </div>
                <div style={{
                  background: '#0F0F1A',
                  border: '1.5px solid rgba(127, 205, 255, 0.25)',
                  borderRadius: '20px',
                  padding: '24px',
                  color: 'white',
                  boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)'
                }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#7FCDFF' }}>Script Builder HUD</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem' }}>
                    <div>1. Introduction node</div>
                    <div>2. Lead CRM usage verify</div>
                    <div>3. Team seat sizing count</div>
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
                  border: '1.5px solid rgba(127, 205, 255, 0.25)',
                  borderRadius: '20px',
                  padding: '24px',
                  color: 'white',
                  boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)',
                  order: 0
                }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#7FCDFF' }}>GHL Action Mapping</h4>
                  <div style={{ background: '#020D1A', border: '1px solid #1e2537', padding: '12px', borderRadius: '8px', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                    {"Event: Lead Qualified\nAction: Trigger GHL Workflow"}
                  </div>
                </div>
                <div>
                  <h2 style={{ fontSize: '2.25rem', fontWeight: 900, color: '#F1F5F9', marginBottom: '20px', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em', lineHeight: '1.2' }}>
                    AI Agent + GHL workflows
                  </h2>
                  <p style={{ fontSize: '1.1rem', color: '#6B9AB8', lineHeight: '1.6', marginBottom: '24px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    Fire automations natively. Map calling outcomes back to pipeline states inside GoHighLevel campaigns.
                  </p>
                </div>
              </div>

            </div>
          </div>
        </section>
      </FadeInSection>

      {/* 5. Use Cases */}
      <FadeInSection>
        <section style={{ padding: '80px 0', background: '#020D1A' }}>
          <div className="container" style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 2rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '60px' }}>
              <h2 style={{ fontSize: '2.25rem', fontWeight: 900, color: '#F1F5F9', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Use Cases</h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '30px' }} className="usecases-grid">
              {[
                { title: 'SaaS companies with high inbound lead volume', desc: 'Qualify inbound prospects instantly before interest cools.' },
                { title: 'Real estate agents getting property inquiry leads', desc: 'Secure booking schedules immediately on neighborhood signs.' },
                { title: 'Insurance agencies running inbound lead campaigns', desc: 'Optimize renew callbacks using auto qualifications.' }
              ].map((uc, i) => (
                <div key={i} style={{
                  background: '#020D1A',
                  border: '1.5px solid rgba(127, 205, 255, 0.15)',
                  borderRadius: '16px',
                  padding: '30px'
                }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#F1F5F9', marginBottom: '12px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{uc.title}</h3>
                  <p style={{ fontSize: '0.95rem', color: '#6B9AB8', lineHeight: '1.6', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{uc.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* EXTRA SECTION: HOW AI AGENT HANDLES A CALL */}
      <section style={{ padding: '100px 0', background: '#020D1A', borderTop: '1px solid #1e2537' }}>
        <div className="container" style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 2rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{ fontSize: '2.25rem', fontWeight: 900, color: '#F1F5F9', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>HOW AI AGENT HANDLES A CALL</h2>
            <p style={{ color: '#6B9AB8', fontSize: '1.1rem', marginTop: '8px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>A chronological overview of Aria's qualification timeline</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {[
              { num: 'Step 1', title: 'Greeting', text: '"Hi, this is Aria calling from [Company]. Is this [Name]?"' },
              { num: 'Step 2', title: 'Permission', text: '"You recently requested info about [Product]. Do you have 2 minutes?"' },
              { num: 'Step 3', title: 'Qualification', text: 'Custom questions set by you' },
              { num: 'Step 4', title: 'Outcome', text: 'Warm → book meeting. Cold → SMS follow-up triggered.' },
              { num: 'Step 5', title: 'Handoff', text: 'Rep gets notification with call summary + lead score' }
            ].map((node, idx) => (
              <div key={idx} style={{
                background: '#020D1A',
                border: '1px solid #1e2537',
                borderRadius: '12px',
                padding: '20px 24px',
                display: 'flex',
                gap: '20px',
                alignItems: 'center'
              }}>
                <div style={{
                  width: '80px',
                  height: '40px',
                  borderRadius: '6px',
                  background: 'rgba(127, 205, 255, 0.08)',
                  color: '#7FCDFF',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>{node.num}</div>
                <div>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#F1F5F9', margin: '0 0 4px 0', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{node.title}</h4>
                  <p style={{ fontSize: '0.9rem', color: '#6B9AB8', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{node.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Related Features */}
      <section style={{ padding: '60px 0', background: '#020D1A', borderTop: '1px solid #1e2537' }}>
        <div className="container" style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 2rem' }}>
          <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#6B9AB8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '24px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Related Features
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }} className="related-grid">
            {[
              { name: 'Outbound Calls', path: '/features/outbound-calls' },
              { name: 'Analytics', path: '/features/analytics' },
              { name: 'Integrations', path: '/integrations' }
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
                <ArrowRight size={16} color="#7FCDFF" />
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
              Automate lead qualification on autopilot
            </h2>
            <Link
              to="/signup"
              style={{
                background: '#7FCDFF',
                color: 'white',
                padding: '16px 40px',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '1.05rem',
                textDecoration: 'none',
                boxShadow: '0 8px 24px rgba(127, 205, 255, 0.35)',
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

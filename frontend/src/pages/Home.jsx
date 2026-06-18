import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { API_URL } from '../config/env';
import { fetchJson } from '../lib/api';
import PricingCards from '../components/PricingCards';

export default function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const [apiState, setApiState] = useState({
    status: 'checking',
    timestamp: null,
    error: null,
  });
  const [pricingBilling, setPricingBilling] = useState('monthly');

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.slice(1);
      const el = document.getElementById(id);
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
      }
    }
  }, [location.hash]);

  const checkHealth = () => {
    fetchJson(`${API_URL}/health`)
      .then((data) => {
        setApiState({
          status: data.status || 'ok',
          timestamp: data.timestamp,
          error: null,
        });
      })
      .catch((error) => {
        setApiState({ status: 'down', timestamp: null, error: error.message });
      });
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div className="shell">
      <main>
        {/* Hero Section */}
        <section className="hero hero-home" id="hero">
          <div className="bg-blob" style={{ top: '-200px', right: '-200px' }}></div>
          <div className="bg-blob" style={{ bottom: '-200px', left: '-200px', background: 'rgba(45, 51, 107, 0.05)' }}></div>

          <div className="container hero-grid">
            <div className="hero-content">
              <div className="flex-center hero-badges" style={{ gap: '12px', marginBottom: '32px' }}>
                <span className="pill-status" style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #dcfce7', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px' }}>
                  <span style={{ width: '8px', height: '8px', background: '#16a34a', borderRadius: '50%' }}></span>
                  2,000+ teams dialing live
                </span>
                <span className="pill-status" style={{ background: 'var(--vx-accent-soft)', color: 'var(--vx-accent)', border: '1px solid var(--vx-accent-soft)', padding: '8px 16px' }}>
                  AI-Powered Cloud Dialer
                </span>
              </div>

              <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)', marginBottom: '32px', lineHeight: '0.95', fontWeight: 900, color: 'var(--vx-primary)' }}>
                Dial Smarter.<br />
                Close Faster.<br />
                Win More.
              </h1>

              <p style={{ fontSize: 'clamp(1rem, 2.5vw, 1.4rem)', color: 'var(--vx-gray-600)', marginBottom: '48px', maxWidth: '600px', lineHeight: '1.5' }}>
                Voxiq delivers 5x more conversations with predictive dialing, real-time AI coaching, and seamless CRM sync.
              </p>

              <div className="hero-actions hero-actions-left" style={{ marginBottom: '48px' }}>
                <Link to="/signup" className="btn btn-primary btn-lg" style={{ background: 'var(--vx-accent)', padding: '20px 48px', fontSize: '1.125rem', borderRadius: '16px', boxShadow: '0 20px 40px rgba(45, 51, 107, 0.2)' }}>Start Free Trial</Link>
                <button className="btn btn-outline btn-lg" style={{ padding: '20px 48px', fontSize: '1.125rem', borderRadius: '16px' }}>
                  Watch Demo <span style={{ marginLeft: '8px' }}>▶</span>
                </button>
              </div>

              <div className="flex-center hero-trust" style={{ gap: '32px', flexWrap: 'wrap' }}>
                <TrustItem text="No credit card required" />
                <TrustItem text="99.99% Uptime SLA" />
                <TrustItem text="SOC 2 Certified" />
              </div>
            </div>
            
            <div className="hero-media" style={{ position: 'relative' }}>
              <div className="dashboard-preview" style={{ borderRadius: '32px', overflow: 'hidden', boxShadow: '0 60px 120px rgba(0,0,0,0.15)', border: '8px solid white' }}>
                <img src="https://images.unsplash.com/photo-1551288049-bbbda546697a?auto=format&fit=crop&q=80&w=2000" alt="Voxiq Dashboard" style={{ width: '100%', display: 'block' }} />
              </div>

              {/* Floating Metrics */}
              <MetricPill top="-30px" left="-50px" emoji="📈" label="Connect Rate" value="+34.2%" color="var(--vx-accent)" />
              <MetricPill bottom="40px" right="-50px" emoji="⚡" label="Calls/Hour" value="127" color="#f97316" />
            </div>
          </div>
        </section>

        {/* Brand Bar */}
        <section style={{ padding: '80px 0', borderTop: '1px solid var(--vx-gray-100)', borderBottom: '1px solid var(--vx-gray-100)' }}>
          <div className="container text-center">
            <p style={{ color: 'var(--vx-gray-400)', fontWeight: 700, fontSize: '0.9rem', marginBottom: '40px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Trusted by high-performance sales teams
            </p>
            <div className="flex-center" style={{ gap: '80px', opacity: 0.4, flexWrap: 'wrap', filter: 'grayscale(1)' }}>
              <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--vx-primary)' }}>HubSpot</span>
              <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--vx-primary)' }}>Intercom</span>
              <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--vx-primary)' }}>Salesforce</span>
              <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--vx-primary)' }}>Segment</span>
              <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--vx-primary)' }}>Zendesk</span>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="section" id="products" style={{ background: '#fff' }}>
          <div className="container">
            <div className="section-head" style={{ marginBottom: '72px' }}>
              <h2 style={{ fontSize: '3.5rem', fontWeight: 900, color: 'var(--vx-primary)' }}>Every channel your<br />buyers are on</h2>
              <p style={{ fontSize: '1.25rem' }}>Voice, SMS, WhatsApp, and AI — all in one platform your sales team will actually use.</p>
            </div>

            <div className="features-grid" style={{ gap: '24px' }}>
              <FeatureCard
                icon="📞" tag="All Plans" tagColor="#10b981"
                title="Outbound & Inbound Calls"
                desc="Make and receive unlimited calls directly from your browser. No hardware, no downloads — just click and talk."
              />
              <FeatureCard
                icon="📊" tag="All Plans" tagColor="#10b981"
                title="Call History & Analytics"
                desc="Live dashboards and full call logs. See who's dialing, who's connecting, and where deals are slipping."
              />
              <FeatureCard
                icon="💬" tag="Pro+" tagColor="#8b5cf6"
                title="SMS Messaging"
                desc="Send and receive texts alongside your calls from the same inbox. Reach prospects on their preferred channel."
              />
              <FeatureCard
                icon="🎙️" tag="Pro+" tagColor="#8b5cf6"
                title="Call Recordings & Transcripts"
                desc="Every call automatically recorded and transcribed. Review conversations, coach your team, and close the gap."
              />
              <FeatureCard
                icon="📱" tag="Business+" tagColor="#f59e0b"
                title="WhatsApp Messaging"
                desc="Connect with customers on WhatsApp without leaving your dashboard. One unified inbox for every channel."
              />
              <FeatureCard
                icon="🧠" tag="Business+" tagColor="#f59e0b"
                title="AI Call Insights"
                desc="AI analyzes every call for sentiment, key talking points, and follow-up actions — so you coach smarter, not harder."
              />
            </div>
          </div>
        </section>

        {/* Solid Color Section - Implementation */}
        <section className="section" id="solutions" style={{ background: 'var(--vx-accent)', color: 'white' }}>
          <div className="container">
            <div className="section-head">
              <h2 style={{ fontSize: '3.5rem', fontWeight: 900, color: 'white' }}>Up and running in<br />under an hour</h2>
              <p style={{ fontSize: '1.25rem', color: 'rgba(255,255,255,0.75)' }}>No IT team. No expensive consultants. Sign up, import, and start closing.</p>
            </div>

            <div className="steps-grid" style={{ marginTop: '80px' }}>
              <StepItem num="01" emoji="🏢" title="Register Your Company" desc="Fill in your company details, pick a plan that fits your team, and verify your email — the whole setup takes under 5 minutes." />
              <StepItem num="02" emoji="📋" title="Import Your Contacts" desc="Upload a CSV, connect Salesforce or HubSpot, or enter contacts manually. Your data syncs instantly and is ready to dial." />
              <StepItem num="03" emoji="📞" title="Call, Record & Close" desc="Start dialing with a single click. Every call is auto-logged, recorded, transcribed, and analyzed the moment it ends." />
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="stats-bar" id="resources" style={{ padding: '120px 0', background: 'white' }}>
          <div className="container">
            <div className="stats-grid">
              <StatItem value="5x" label="More Conversations" />
              <StatItem value="40%" label="Faster Onboarding" />
              <StatItem value="99.99%" label="Guaranteed Uptime" />
              <StatItem value="2M+" label="Calls connected daily" />
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="section" id="pricing" style={{ background: 'var(--vx-gray-50)' }}>
          <div className="container">
            <div className="section-head" style={{ marginBottom: '48px' }}>
              <h2 style={{ fontSize: '3.5rem', fontWeight: 900, color: 'var(--vx-primary)' }}>Simple, predictable pricing</h2>
              <p style={{ fontSize: '1.25rem' }}>Per-seat pricing with no hidden fees. Start free, upgrade anytime.</p>
            </div>

            <PricingCards
              selectedPackage=""
              selectedBilling={pricingBilling}
              onBillingChange={setPricingBilling}
              onSelect={(pkgId, seats) => navigate(`/checkout?plan=${pkgId}&seats=${seats}&billing=${pricingBilling}`)}
            />
          </div>
        </section>

        {/* Footer CTA - Solid Background */}
        <section className="section text-center" id="company" style={{ background: 'var(--vx-primary)', color: 'white', padding: '140px 0' }}>
          <div className="container">
            <h2 style={{ fontSize: '4rem', fontWeight: 900, color: 'white', marginBottom: '32px', lineHeight: '1' }}>Ready to transform<br />your sales?</h2>
            <p style={{ fontSize: '1.5rem', color: 'rgba(255,255,255,0.8)', maxWidth: '800px', margin: '0 auto 60px' }}>
              Join 10,000+ sales professionals hitting quota faster than ever.
            </p>
            <div className="flex-center" style={{ gap: '24px' }}>
              <Link to="/signup" className="btn btn-primary btn-lg" style={{ background: 'white', color: 'var(--vx-accent)', padding: '24px 60px', fontSize: '1.25rem', borderRadius: '20px', fontWeight: 800, textDecoration: 'none' }}>Get Started Free</Link>
              <button className="btn btn-outline btn-lg" style={{ background: 'white', color: 'var(--vx-accent)', border: 'none', padding: '24px 60px', fontSize: '1.25rem', borderRadius: '20px', fontWeight: 800 }}>Talk to Sales</button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer Simplified */}
      <footer style={{ background: 'white', padding: '40px 0' }}>
        <div className="container flex-center" style={{ flexDirection: 'column', gap: '20px' }}>
          <img src="/logo.png" alt="Voxiq Logo" style={{ height: '24px' }} />
          <p style={{ color: 'var(--vx-gray-400)', fontSize: '0.85rem' }}>© 2026 Voxiq Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function MetricPill({ top, bottom, left, right, emoji, label, value, color }) {
  return (
    <div className="metric-pill-float" style={{ top, bottom, left, right, background: 'white', padding: '16px 24px', borderRadius: '20px', boxShadow: '0 30px 60px rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', gap: '16px', zIndex: 10 }}>
      <div style={{ width: '40px', height: '40px', background: `${color}15`, color, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>{emoji}</div>
      <div>
        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--vx-gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
        <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--vx-primary)' }}>{value}</div>
      </div>
    </div>
  );
}

function TrustItem({ text }) {
  return (
    <div className="flex-center" style={{ gap: '10px', fontSize: '1rem', fontWeight: 700, color: 'var(--vx-primary)' }}>
      <div style={{ background: 'var(--vx-primary)', color: 'white', width: '20px', height: '20px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>✓</div>
      {text}
    </div>
  );
}

function FeatureCard({ icon, title, desc, tag, tagColor = '#3b82f6' }) {
  return (
    <div className="feature-card" style={{ padding: '36px 32px', border: '1px solid var(--vx-gray-100)', background: 'white', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ width: '52px', height: '52px', background: `${tagColor}18`, borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>{icon}</div>
        {tag && <span style={{ background: `${tagColor}15`, color: tagColor, padding: '4px 10px', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', flexShrink: 0, alignSelf: 'flex-start', marginTop: '4px' }}>{tag}</span>}
      </div>
      <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--vx-primary)', margin: 0 }}>{title}</h3>
      <p style={{ color: 'var(--vx-gray-500)', fontSize: '0.9375rem', lineHeight: '1.65', margin: 0 }}>{desc}</p>
    </div>
  );
}

function StepItem({ num, emoji, title, desc }) {
  return (
    <div className="step-item" style={{ background: 'rgba(255,255,255,0.09)', padding: '40px 36px', borderRadius: '28px', border: '1px solid rgba(255,255,255,0.12)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
        <span style={{ fontSize: '2.25rem', fontFamily: 'Outfit, sans-serif', fontWeight: 900, color: 'rgba(255,255,255,0.22)', lineHeight: 1 }}>{num}</span>
        <div style={{ width: '1px', height: '36px', background: 'rgba(255,255,255,0.2)' }} />
        <span style={{ fontSize: '1.5rem' }}>{emoji}</span>
      </div>
      <h3 style={{ color: 'white', fontSize: '1.5rem', fontWeight: 800, margin: '0 0 14px' }}>{title}</h3>
      <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '1rem', lineHeight: '1.65', margin: 0 }}>{desc}</p>
    </div>
  );
}

function StatItem({ value, label }) {
  return (
    <div className="stat-item" style={{ textAlign: 'center' }}>
      <h3 style={{ fontSize: '4rem', fontWeight: 900, color: 'var(--vx-accent)', marginBottom: '8px' }}>{value}</h3>
      <p style={{ color: 'var(--vx-gray-500)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.9rem' }}>{label}</p>
    </div>
  );
}


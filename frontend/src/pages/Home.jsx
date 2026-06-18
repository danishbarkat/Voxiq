import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_URL } from '../config/env';
import { fetchJson } from '../lib/api';
import PricingCards from '../components/PricingCards';

export default function Home() {
  const navigate = useNavigate();
  const [apiState, setApiState] = useState({
    status: 'checking',
    timestamp: null,
    error: null,
  });
  const [pricingBilling, setPricingBilling] = useState('monthly');

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
            <div className="section-head" style={{ marginBottom: '80px' }}>
              <h2 style={{ fontSize: '3.5rem', fontWeight: 900, color: 'var(--vx-primary)' }}>Everything you need<br />to close more deals</h2>
              <p style={{ fontSize: '1.25rem' }}>From click-to-call to AI-powered analytics, we've got you covered.</p>
            </div>

            <div className="features-grid" style={{ gap: '40px' }}>
              <FeatureCard 
                title="1-Click Dialing" 
                desc="Connect with prospects instantly directly from your browser. No hardware required." 
              />
              <FeatureCard 
                title="Global Presence" 
                desc="Get local numbers in over 100 countries. Appear local, sell global." 
              />
              <FeatureCard 
                title="Live Coach & Monitor" 
                desc="Jump into active calls to whisper advice or take over. Turn rookies into top performers." 
              />
              <FeatureCard 
                title="Call Recording" 
                desc="Automatically record and transcribe every conversation for QA and training." 
              />
              <FeatureCard 
                title="CRM Integrations" 
                desc="Push calls, notes, and metrics directly to Salesforce, Hubspot, and more." 
              />
              <FeatureCard 
                title="Predictive AI" 
                desc="Let our AI predict the best times to call and score your leads for maximum conversion." 
              />
            </div>
          </div>
        </section>

        {/* Solid Color Section - Implementation */}
        <section className="section" id="solutions" style={{ background: 'var(--vx-accent)', color: 'white' }}>
          <div className="container">
            <div className="section-head">
              <h2 style={{ fontSize: '3.5rem', fontWeight: 900, color: 'white' }}>Up and running in<br />under an hour</h2>
              <p style={{ fontSize: '1.25rem', color: 'rgba(255,255,255,0.8)' }}>No lengthy implementations or expensive consultants required.</p>
            </div>

            <div className="steps-grid" style={{ marginTop: '80px' }}>
              <StepItem num="01" title="Create Your Profile" desc="Sign up, pick your numbers and invite your team in minutes." />
              <StepItem num="02" title="Sync Your Leads" desc="Upload CSVs or connect your CRM with a single click." />
              <StepItem num="03" title="Start Dialing" desc="Hit the phones and watch the analytics populate in real-time." />
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

function FeatureCard({ title, desc }) {
  return (
    <div className="feature-card" style={{ padding: '48px', border: '1px solid var(--vx-gray-100)', background: 'white' }}>
      <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '16px', color: 'var(--vx-primary)' }}>{title}</h3>
      <p style={{ color: 'var(--vx-gray-500)', fontSize: '1.1rem', lineHeight: '1.6' }}>{desc}</p>
    </div>
  );
}

function StepItem({ num, title, desc }) {
  return (
    <div className="step-item" style={{ background: 'white', padding: '40px', borderRadius: '24px' }}>
      <div className="step-num" style={{ color: 'var(--vx-accent)', borderBottom: '2px solid var(--vx-accent-soft)', fontSize: '2.5rem', fontWeight: 900 }}>{num}</div>
      <h3 style={{ color: 'var(--vx-primary)', fontSize: '1.75rem', fontWeight: 800, margin: '24px 0 16px' }}>{title}</h3>
      <p style={{ color: 'var(--vx-gray-600)', fontSize: '1.1rem' }}>{desc}</p>
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


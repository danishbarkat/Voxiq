import { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { getToken } from '../lib/auth';
import { API_URL } from '../config/env';

const PLANS = {
  Basic: {
    id: 'Basic',
    name: 'Basic',
    tagline: 'Unlimited calling per seat',
    price: 24.99,
    color: '#7C6DFA',
    features: ['7-Day Free Trial Included', 'Unlimited Outbound & Inbound Calls', 'Per-seat pricing', 'Call History & Analytics'],
    popular: false,
    contactSales: false,
  },
  Pro: {
    id: 'Pro',
    name: 'Pro',
    tagline: 'Calls + SMS + Recordings',
    price: 39.99,
    color: '#7C6DFA',
    features: ['7-Day Free Trial Included', 'Everything in Basic', 'SMS Messaging', 'Call Recordings', 'Advanced Analytics'],
    popular: true,
    contactSales: false,
  },
  Business: {
    id: 'Business',
    name: 'Business',
    tagline: 'Full-featured platform',
    price: 69.99,
    color: '#7C6DFA',
    features: ['7-Day Free Trial Included', 'Everything in Pro', 'WhatsApp Messaging', 'AI Call Insights', 'Priority Support'],
    popular: false,
    contactSales: false,
  },
  Enterprise: {
    id: 'Enterprise',
    name: 'Enterprise',
    tagline: 'Custom for large teams',
    price: null,
    color: '#7C6DFA',
    features: ['Everything in Business', 'Custom Seat Limit', 'Dedicated Account Manager', 'SLA & Custom Integrations'],
    popular: false,
    contactSales: true,
  },
};

function SummaryRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.875rem' }}>
      <span style={{ color: 'var(--vx-gray-500)' }}>{label}</span>
      <span style={{ fontWeight: 700, color: 'var(--vx-primary)' }}>{value}</span>
    </div>
  );
}

export default function Checkout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const planId = searchParams.get('plan') || 'Pro';
  const isUpgrade = searchParams.get('source') === 'upgrade' || !!searchParams.get('plan');
  const [seats, setSeats] = useState(Math.max(1, parseInt(searchParams.get('seats') || '1', 10)));
  const [billing, setBilling] = useState(searchParams.get('billing') === 'annual' ? 'annual' : 'monthly');

  const plan = PLANS[planId] || PLANS.Pro;
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);

  const perSeatPrice = plan.price
    ? (billing === 'annual' ? plan.price * 0.9 : plan.price)
    : null;

  const totalPrice = perSeatPrice
    ? (billing === 'annual' ? perSeatPrice * seats * 12 : perSeatPrice * seats).toFixed(2)
    : null;

  const handleContinue = async () => {
    if (plan.contactSales) {
      window.open('mailto:sales@voxiq.com', '_blank');
      return;
    }

    const token = getToken();
    if (!token) {
      navigate(`/signup?plan=${plan.id}&seats=${seats}&billing=${billing}`);
      return;
    }

    setCheckoutLoading(true);
    setCheckoutError(null);
    try {
      const res = await fetch(`${API_URL}/billing/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ packageName: plan.id, billingCycle: billing, seats }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Checkout failed');
      window.location.href = data.checkoutUrl;
    } catch (err) {
      setCheckoutError(err.message || 'Could not start checkout. Please try again.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#020D1A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '40px 24px 80px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '48px' }}>
          <Link to="/">
            <img src="/logo.png" alt="Voxiq" style={{ height: '36px' }} />
          </Link>
          <Link
            to="/#pricing"
            style={{ color: '#6B9AB8', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600 }}
          >
            ← Change Plan
          </Link>
        </div>

        {/* Page title */}
        <div style={{ marginBottom: '40px' }}>
          <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 800, color: '#F1F5F9', marginBottom: '8px' }}>
            Review Your Order
          </h1>
          <p style={{ color: '#6B9AB8', fontSize: '1rem' }}>
            Confirm your plan and continue to create your account.
          </p>
        </div>

        <div className="checkout-grid">
          {/* Left: Plan Details */}
          <div style={{ background: '#111929', borderRadius: '24px', padding: '40px', border: '1px solid #1e2537', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
            {/* Plan header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: plan.color, flexShrink: 0, display: 'inline-block' }} />
              <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.6rem', fontWeight: 800, color: '#7C6DFA' }}>{plan.name}</span>
              {plan.popular && (
                <span style={{ background: '#7C6DFA', color: '#fff', padding: '3px 10px', borderRadius: '999px', fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.05em' }}>MOST POPULAR</span>
              )}
            </div>
            <p style={{ color: '#6B9AB8', marginBottom: '28px', fontSize: '0.95rem' }}>{plan.tagline}</p>

            {/* Price display */}
            {plan.contactSales ? (
              <div style={{ marginBottom: '28px' }}>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: plan.color, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Custom Pricing</div>
                <p style={{ color: '#6B9AB8', fontSize: '0.875rem', marginTop: '4px' }}>Tailored to your team's size and needs</p>
              </div>
            ) : (
              <div style={{ marginBottom: '28px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '2.5rem', fontWeight: 800, color: plan.color, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>${perSeatPrice.toFixed(2)}</span>
                  <span style={{ color: '#6B9AB8', fontSize: '0.875rem' }}>/seat/mo</span>
                </div>
                <p style={{ color: '#6B9AB8', fontSize: '0.8rem' }}>
                  {billing === 'annual' ? `10% annual discount applied` : 'Standard monthly rate'}
                </p>
                <p style={{ color: '#10B981', fontSize: '0.8rem', fontWeight: 700, marginTop: '4px' }}>
                  7-day free trial · cancel before day 8, pay nothing
                </p>
              </div>
            )}

            {/* Billing Toggle */}
            {plan.price > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', background: '#020D1A', border: '1px solid #1e2537', borderRadius: '12px', padding: '14px 18px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: billing === 'monthly' ? '#7C6DFA' : '#64748B' }}>Monthly</span>
                <button
                  onClick={() => setBilling(b => b === 'monthly' ? 'annual' : 'monthly')}
                  style={{ width: '44px', height: '24px', borderRadius: '999px', border: 'none', cursor: 'pointer', background: billing === 'annual' ? '#7C6DFA' : '#1e2537', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}
                >
                  <span style={{ position: 'absolute', top: '2px', left: billing === 'annual' ? '22px' : '2px', width: '20px', height: '20px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s', display: 'block' }} />
                </button>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: billing === 'annual' ? '#7C6DFA' : '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  Annual&nbsp;
                  <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', padding: '2px 8px', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 800 }}>Save 10%</span>
                </span>
              </div>
            )}

            {/* Seat Selector */}
            {plan.price > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', background: '#020D1A', border: '1px solid #1e2537', borderRadius: '12px', padding: '14px 18px', gap: '16px' }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#CBD5E1', fontSize: '0.9rem' }}>Number of Seats</div>
                  <div style={{ fontSize: '0.78rem', color: '#6B9AB8', marginTop: '2px' }}>One seat = one agent account</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                  <button
                    onClick={() => setSeats(s => Math.max(1, s - 1))}
                    style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #1e2537', background: '#111929', cursor: 'pointer', fontWeight: 700, fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#CBD5E1' }}
                  >−</button>
                  <span style={{ fontWeight: 800, minWidth: '28px', textAlign: 'center', fontSize: '1.1rem', color: '#7C6DFA' }}>{seats}</span>
                  <button
                    onClick={() => setSeats(s => Math.min(100, s + 1))}
                    style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #1e2537', background: '#111929', cursor: 'pointer', fontWeight: 700, fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#CBD5E1' }}
                  >+</button>
                </div>
              </div>
            )}

            {/* Features */}
            <div style={{ borderTop: '1px solid #1e2537', paddingTop: '28px' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 800, color: '#6B9AB8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>What's included</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '10px' }}>
                {plan.features.map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9375rem', color: '#CBD5E1', fontWeight: 500 }}>
                    <span style={{ color: plan.color, fontWeight: 900, fontSize: '0.875rem', flexShrink: 0 }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right: Order Summary */}
          <div style={{ background: '#111929', borderRadius: '24px', padding: '32px', border: `2px solid #7C6DFA`, position: 'sticky', top: '100px' }}>
            <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.15rem', fontWeight: 800, color: '#F1F5F9', marginBottom: '24px' }}>Order Summary</h3>

            {/* Summary rows */}
            <div style={{ background: '#020D1A', border: '1px solid #1e2537', borderRadius: '14px', padding: '18px', marginBottom: '24px' }}>
              <SummaryRow label="Plan" value={plan.name} />
              {plan.price > 0 && (
                <>
                  <SummaryRow label="Per seat" value={`$${perSeatPrice.toFixed(2)}/mo`} />
                  <SummaryRow label="Seats" value={`× ${seats}`} />
                  <SummaryRow label="Billing" value={billing === 'annual' ? 'Annual (–10%)' : 'Monthly'} />
                </>
              )}
              {plan.price === 0 && <SummaryRow label="Duration" value="7 days free" />}

              {/* Total */}
              <div style={{ borderTop: '1px solid #1e2537', paddingTop: '14px', marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <span style={{ fontWeight: 800, color: '#F1F5F9', fontSize: '0.9375rem' }}>Total due today</span>
                <div style={{ textAlign: 'right' }}>
                  {plan.contactSales ? (
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: plan.color, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Custom</div>
                  ) : (
                    <>
                      <div style={{ fontSize: '1.6rem', fontWeight: 800, color: plan.color, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>${totalPrice}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6B9AB8' }}>/{billing === 'annual' ? 'year' : 'month'}</div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* CTA */}
            {plan.contactSales ? (
              <a
                href="mailto:sales@voxiq.com"
                style={{
                  display: 'block', padding: '15px 20px', borderRadius: '12px',
                  background: plan.color, color: '#fff', fontWeight: 800, fontSize: '1rem',
                  textAlign: 'center', textDecoration: 'none', fontFamily: 'inherit',
                  boxSizing: 'border-box', width: '100%',
                }}
              >
                Contact Sales →
              </a>
            ) : (
              <>
                {checkoutError && (
                  <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '10px', padding: '10px 14px', marginBottom: '12px', fontSize: '0.8rem', color: '#EF4444', fontWeight: 600 }}>
                    {checkoutError}
                  </div>
                )}
                <button
                  onClick={handleContinue}
                  disabled={checkoutLoading}
                  style={{
                    width: '100%', padding: '15px 20px', borderRadius: '12px', border: 'none',
                    background: checkoutLoading ? '#475569' : '#7C6DFA', color: '#fff',
                    fontWeight: 800, fontSize: '1rem', cursor: checkoutLoading ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit', letterSpacing: '0.01em', transition: 'background 0.2s',
                  }}
                >
                  {checkoutLoading ? 'Redirecting to payment…' : 'Start 7-Day Free Trial →'}
                </button>
              </>
            )}

            <p style={{ fontSize: '0.75rem', color: '#6B9AB8', textAlign: 'center', marginTop: '14px', lineHeight: '1.5' }}>
              {plan.contactSales
                ? 'Our team will reach out within 1 business day.'
                : 'Card required. Cancel before day 8 and pay nothing. Renews automatically.'}
            </p>

            {/* Trust badges */}
            <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #1e2537', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {['7-day free trial on all plans', 'Cancel anytime — no lock-in', '99.99% uptime SLA guaranteed'].map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#10B981', fontWeight: 800, fontSize: '0.8rem', flexShrink: 0 }}>✓</span>
                  <span style={{ fontSize: '0.8rem', color: '#6B9AB8' }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

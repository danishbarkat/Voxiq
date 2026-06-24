import { useState } from 'react';

const PACKAGES = [
  {
    id: 'Basic',
    name: 'Basic',
    tagline: 'Unlimited calling per seat',
    priceMonthly: 24.99,
    color: '#3b82f6',
    features: ['7-Day Free Trial Included', 'Unlimited Outbound & Inbound Calls', 'Per-seat pricing', 'Call History & Analytics'],
    notIncluded: ['SMS', 'Call Recordings', 'WhatsApp', 'AI Insights'],
    cta: 'Start Free Trial',
    popular: false,
    contactSales: false,
  },
  {
    id: 'Pro',
    name: 'Pro',
    tagline: 'Calls + SMS + Recordings',
    priceMonthly: 39.99,
    color: '#8b5cf6',
    features: ['7-Day Free Trial Included', 'Everything in Basic', 'SMS Messaging', 'Call Recordings', 'Advanced Analytics'],
    notIncluded: ['WhatsApp', 'AI Insights'],
    cta: 'Start Free Trial',
    popular: true,
    contactSales: false,
  },
  {
    id: 'Business',
    name: 'Business',
    tagline: 'Full-featured platform',
    priceMonthly: 69.99,
    color: '#f59e0b',
    features: ['7-Day Free Trial Included', 'Everything in Pro', 'WhatsApp Messaging', 'AI Call Insights', 'Priority Support'],
    notIncluded: [],
    cta: 'Start Free Trial',
    popular: false,
    contactSales: false,
  },
  {
    id: 'Enterprise',
    name: 'Enterprise',
    tagline: 'Custom for large teams',
    priceMonthly: null,
    color: '#10b981',
    features: ['Everything in Business', 'Custom Seat Limit', 'Dedicated Account Manager', 'SLA & Custom Integrations'],
    notIncluded: [],
    cta: 'Contact Sales',
    popular: false,
    contactSales: true,
  },
];

export default function PricingCards({ onSelect, selectedPackage, selectedBilling, onBillingChange }) {
  const [seats, setSeats] = useState({});

  const getSeatCount = (pkgId) => seats[pkgId] || 1;

  const getPrice = (pkg) => {
    if (!pkg.priceMonthly) return null;
    const base = pkg.priceMonthly * getSeatCount(pkg.id);
    if (selectedBilling === 'annual') return (base * 12 * 0.9).toFixed(2);
    return base.toFixed(2);
  };

  const getPerSeatLabel = (pkg) => {
    if (!pkg.priceMonthly) return null;
    const perSeat = selectedBilling === 'annual'
      ? (pkg.priceMonthly * 0.9).toFixed(2)
      : pkg.priceMonthly.toFixed(2);
    return `$${perSeat}/seat/${selectedBilling === 'annual' ? 'mo (billed annually)' : 'mo'}`;
  };

  return (
    <div style={{ width: '100%' }}>
      {/* Billing Toggle */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
        <span style={{ fontSize: '0.9rem', color: selectedBilling === 'monthly' ? '#0f172a' : '#94a3b8', fontWeight: selectedBilling === 'monthly' ? 700 : 400 }}>Monthly</span>
        <button
          onClick={() => onBillingChange(selectedBilling === 'monthly' ? 'annual' : 'monthly')}
          style={{
            width: '48px', height: '26px', borderRadius: '999px', border: 'none', cursor: 'pointer',
            background: selectedBilling === 'annual' ? '#6366f1' : '#e2e8f0',
            position: 'relative', transition: 'background 0.2s', flexShrink: 0,
          }}
        >
          <span style={{
            position: 'absolute', top: '3px',
            left: selectedBilling === 'annual' ? '25px' : '3px',
            width: '20px', height: '20px', borderRadius: '50%',
            background: '#fff', transition: 'left 0.2s', display: 'block',
          }} />
        </button>
        <span style={{ fontSize: '0.9rem', color: selectedBilling === 'annual' ? '#0f172a' : '#94a3b8', fontWeight: selectedBilling === 'annual' ? 700 : 400 }}>
          Annual&nbsp;
          <span style={{ background: '#dcfce7', color: '#16a34a', padding: '2px 8px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700 }}>Save 10%</span>
        </span>
      </div>

      {/* Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '14px' }}>
        {PACKAGES.map(pkg => {
          const isSelected = selectedPackage === pkg.id;
          const price = getPrice(pkg);
          const perSeatLabel = getPerSeatLabel(pkg);

          return (
            <div
              key={pkg.id}
              onClick={() => !pkg.contactSales && onSelect(pkg.id, getSeatCount(pkg.id))}
              style={{
                border: isSelected ? `2px solid ${pkg.color}` : '2px solid #e2e8f0',
                borderRadius: '18px',
                padding: '22px 18px',
                background: isSelected ? `${pkg.color}0d` : '#fff',
                cursor: pkg.contactSales ? 'default' : 'pointer',
                position: 'relative',
                transition: 'all 0.2s',
                boxShadow: isSelected ? `0 0 0 3px ${pkg.color}25` : '0 2px 6px rgba(0,0,0,0.05)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {pkg.popular && (
                <div style={{
                  position: 'absolute', top: '-11px', left: '50%', transform: 'translateX(-50%)',
                  background: pkg.color, color: '#fff', padding: '3px 14px',
                  borderRadius: '999px', fontSize: '0.68rem', fontWeight: 700, whiteSpace: 'nowrap',
                }}>MOST POPULAR</div>
              )}

              <div style={{ marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '7px' }}>
                <span style={{ display: 'inline-block', width: '9px', height: '9px', borderRadius: '50%', background: pkg.color, flexShrink: 0 }} />
                <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>{pkg.name}</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '14px' }}>{pkg.tagline}</div>

              {/* Price */}
              <div style={{ marginBottom: '14px' }}>
                {pkg.contactSales ? (
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: pkg.color }}>Talk to Sales</div>
                ) : (
                  <>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: pkg.color }}>
                      ${price}
                      <span style={{ fontSize: '0.72rem', fontWeight: 500, color: '#94a3b8' }}>
                        /{selectedBilling === 'annual' ? 'yr' : 'mo'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
                      {perSeatLabel} × {getSeatCount(pkg.id)} seat{getSeatCount(pkg.id) > 1 ? 's' : ''}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: 700, marginTop: '4px' }}>
                      7-day free trial · cancel anytime
                    </div>
                  </>
                )}
              </div>

              {/* Seat Selector */}
              {!pkg.contactSales && pkg.priceMonthly > 0 && (
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '14px', background: '#f8fafc', borderRadius: '10px', padding: '7px 10px' }}
                  onClick={e => e.stopPropagation()}
                >
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, flex: 1 }}>Seats</span>
                  <button
                    onClick={() => setSeats(s => ({ ...s, [pkg.id]: Math.max(1, getSeatCount(pkg.id) - 1) }))}
                    style={{ width: '22px', height: '22px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '0.95rem', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >−</button>
                  <span style={{ fontWeight: 700, minWidth: '20px', textAlign: 'center', fontSize: '0.9rem' }}>{getSeatCount(pkg.id)}</span>
                  <button
                    onClick={() => setSeats(s => ({ ...s, [pkg.id]: Math.min(100, getSeatCount(pkg.id) + 1) }))}
                    style={{ width: '22px', height: '22px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '0.95rem', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >+</button>
                </div>
              )}

              {/* Features */}
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 14px 0', fontSize: '0.77rem', flex: 1 }}>
                {pkg.features.map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '7px', marginBottom: '5px', color: '#374151' }}>
                    <span style={{ color: pkg.color, fontWeight: 700, marginTop: '1px', flexShrink: 0 }}>✓</span>
                    {f}
                  </li>
                ))}
                {pkg.notIncluded.map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '7px', marginBottom: '5px', color: '#cbd5e1' }}>
                    <span style={{ fontWeight: 700, marginTop: '1px', flexShrink: 0 }}>✗</span>
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <button
                onClick={e => { e.stopPropagation(); if (!pkg.contactSales) onSelect(pkg.id, getSeatCount(pkg.id)); }}
                style={{
                  width: '100%', padding: '9px', borderRadius: '10px', border: 'none',
                  background: pkg.contactSales ? '#f1f5f9' : isSelected ? pkg.color : `${pkg.color}22`,
                  color: pkg.contactSales ? '#64748b' : isSelected ? '#fff' : pkg.color,
                  fontWeight: 700, fontSize: '0.82rem', cursor: pkg.contactSales ? 'default' : 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {isSelected && !pkg.contactSales ? '✓ Selected' : pkg.cta}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

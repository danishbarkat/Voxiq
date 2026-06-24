import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Building2, ClipboardList, Headphones, LayoutDashboard, LogOut, Phone, WalletCards } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { API_URL } from '../config/env';
import { fetchJson } from '../lib/api';
import { clearToken } from '../lib/auth';
import BetterMultiCompanyLineChart from '../components/BetterMultiCompanyLineChart';

const NAV_ITEMS_V2 = [
  { key: 'dashboard', icon: LayoutDashboard, label: 'Dashboard'  },
  { key: 'requests',  icon: ClipboardList, label: 'Requests'   },
  { key: 'companies', icon: Building2, label: 'Companies'  },
  { key: 'numbers',   icon: Phone, label: 'Numbers'    },
  { key: 'recordings', icon: Headphones, label: 'Recordings' },
  { key: 'analytics', icon: BarChart3, label: 'Analytics'  },
  { key: 'billing',   icon: WalletCards, label: 'Billing'    },
];

const ProWorldMap = lazy(() => import('../components/ProWorldMap'));

// ─── constants ────────────────────────────────────────────────────────────────

const STATUS_COLORS = {
  PENDING:  { bg: '#fef3c7', color: '#92400e', label: 'Pending'  },
  ACTIVE:   { bg: '#d1fae5', color: '#065f46', label: 'Active'   },
  INACTIVE: { bg: '#fee2e2', color: '#991b1b', label: 'Inactive' },
};

const NAV_ITEMS = [
  { key: 'dashboard', icon: '⊞', label: 'Dashboard'  },
  { key: 'requests',  icon: '◎', label: 'Requests'   },
  { key: 'companies', icon: '🏢', label: 'Companies'  },
  { key: 'numbers',   icon: '📞', label: 'Numbers'    },
  { key: 'recordings', icon: '🎧', label: 'Recordings' },
  { key: 'analytics', icon: '📊', label: 'Analytics'  },
  { key: 'billing',   icon: '💰', label: 'Billing'    },
];

// ─── in-memory cache (survives tab switches, clears on page refresh) ─────────
const _cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function cachePut(key, data) { _cache.set(key, { data, at: Date.now() }); }

function cacheGet(key) {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at > CACHE_TTL) { _cache.delete(key); return null; }
  return entry.data;
}

// ─── tiny primitives ──────────────────────────────────────────────────────────

function Badge({ children, bg = '#fee2e2', color = '#991b1b' }) {
  return (
    <span style={{ background: bg, color, padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
      {children}
    </span>
  );
}

function StatusBadge({ status }) {
  const s = STATUS_COLORS[status] || STATUS_COLORS.INACTIVE;
  return <Badge bg={s.bg} color={s.color}>{s.label}</Badge>;
}

function formatMinutesValue(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return '0';
  if (numeric >= 1000) return Math.round(numeric).toLocaleString();
  if (numeric >= 100) return Math.round(numeric).toString();
  return numeric.toFixed(1).replace(/\.0$/, '');
}

function sanitizeDurationSeconds(value) {
  const numeric = Number(value);
  const maxReasonableSeconds = 12 * 60 * 60;
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  if (numeric <= maxReasonableSeconds) return numeric;
  if (numeric <= maxReasonableSeconds * 1000) return numeric / 1000;
  return 0;
}

function StatCard({ label, value, sub, accent }) {
  const accentColor = accent || '#6b7280';
  return (
    <div style={{
      background: `linear-gradient(135deg, ${accentColor}0d 0%, #ffffff 60%)`,
      borderRadius: 18,
      border: `1.5px solid ${accentColor}30`,
      padding: '22px 24px 18px',
      display: 'flex',
      flexDirection: 'column',
      gap: 3,
      boxShadow: `0 2px 12px ${accentColor}18, 0 1px 3px rgba(0,0,0,0.04)`,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 4, background: accentColor, borderRadius: '18px 0 0 18px' }} />
      <div style={{ fontSize: 10, fontWeight: 700, color: `${accentColor}cc`, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 900, color: accentColor, lineHeight: 1, letterSpacing: '-0.03em', marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function MiniBars({ data, valueKey = 'calls', labelKey = 'label', color = '#6366f1' }) {
  const max = Math.max(...data.map(d => d[valueKey] || 0), 1);
  const BAR_MAX_PX = 80;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5 }}>
      {data.map(item => {
        const val = item[valueKey] || 0;
        const barH = Math.max(4, Math.round((val / max) * BAR_MAX_PX));
        return (
          <div key={`${item[labelKey]}-${val}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div title={`${item[labelKey]}: ${val}`}
              style={{ width: '100%', borderRadius: '5px 5px 2px 2px', background: color, opacity: val ? 1 : 0.18, height: `${barH}px` }} />
            <div style={{ fontSize: 9, color: '#6b7280', textAlign: 'center', lineHeight: 1.2 }}>{item[labelKey]}</div>
          </div>
        );
      })}
    </div>
  );
}

const TREND_COLORS = ['#22c55e', '#38bdf8', '#f59e0b', '#f43f5e', '#8b5cf6', '#14b8a6'];

function MultiCompanyLineChart({ series = [] }) {
  const chartCompanies = useMemo(() => {
    const unique = new Map();
    series.forEach(point => {
      (point.companies || []).forEach(company => {
        if (!unique.has(company.accountId)) {
          unique.set(company.accountId, {
            accountId: company.accountId,
            companyName: company.companyName,
            color: TREND_COLORS[unique.size % TREND_COLORS.length],
          });
        }
      });
    });
    return [...unique.values()];
  }, [series]);

  const maxCalls = Math.max(
    ...series.flatMap(point => (point.companies || []).map(company => company.calls || 0)),
    1,
  );

  const width = 760;
  const height = 260;
  const padding = { top: 24, right: 24, bottom: 40, left: 40 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const stepX = series.length > 1 ? innerWidth / (series.length - 1) : innerWidth / 2;

  const getX = index => padding.left + (series.length > 1 ? index * stepX : innerWidth / 2);
  const getY = value => padding.top + innerHeight - ((value || 0) / maxCalls) * innerHeight;

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {chartCompanies.map(company => (
          <div key={company.accountId} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 999, background: '#0f172a', color: '#e5eefb', fontSize: 11, fontWeight: 700 }}>
            <span style={{ width: 10, height: 10, borderRadius: 999, background: company.color }} />
            {company.companyName}
          </div>
        ))}
      </div>

      <div style={{ borderRadius: 18, padding: 16, background: 'radial-gradient(circle at top, rgba(34,197,94,0.14), rgba(15,23,42,0.98) 45%)', border: '1px solid rgba(148,163,184,0.18)', boxShadow: '0 24px 50px rgba(15,23,42,0.16)' }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
          {Array.from({ length: 5 }).map((_, idx) => {
            const y = padding.top + (innerHeight / 4) * idx;
            const value = Math.round(maxCalls - (maxCalls / 4) * idx);
            return (
              <g key={idx}>
                <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="rgba(148,163,184,0.18)" strokeDasharray="4 6" />
                <text x={8} y={y + 4} fill="#94a3b8" fontSize="10">{value}</text>
              </g>
            );
          })}

          {chartCompanies.map(company => {
            const points = series.map((point, index) => {
              const match = (point.companies || []).find(item => item.accountId === company.accountId);
              return {
                x: getX(index),
                y: getY(match?.calls || 0),
                value: match?.calls || 0,
                label: point.label,
              };
            });

            const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
            return (
              <g key={company.accountId}>
                <path d={path} fill="none" stroke={company.color} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                {points.map(point => (
                  <g key={`${company.accountId}-${point.label}`}>
                    <circle cx={point.x} cy={point.y} r="4.5" fill={company.color} stroke="#0f172a" strokeWidth="2" />
                    <title>{`${company.companyName} • ${point.label}: ${point.value} calls`}</title>
                  </g>
                ))}
              </g>
            );
          })}

          {series.map((point, index) => (
            <text key={point.key || point.label} x={getX(index)} y={height - 12} textAnchor="middle" fill="#cbd5e1" fontSize="10">
              {point.label}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}

// ─── modals ───────────────────────────────────────────────────────────────────

const OVERLAY = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modal = w => ({ background: '#fff', borderRadius: 18, padding: 28, width: w, maxWidth: '92vw', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' });
const inputStyle = { width: '100%', padding: '10px 12px', border: '1.5px solid #e5e7eb', borderRadius: 10, marginBottom: 14, boxSizing: 'border-box', fontSize: 14, outline: 'none' };
const labelStyle = { display: 'block', fontWeight: 700, fontSize: 13, color: '#374151', marginBottom: 5 };
const btnPrimary = bg => ({ padding: '10px 20px', background: bg, color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 14 });
const btnSecondary = { padding: '10px 20px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 14 };
const actionRow = { display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 };

const ALL_PACKAGES = [
  { name: 'Trial',      color: '#6366f1', agents: 1,   trial: true,  features: { out: true,  in: false, sms: false, rec: false, wp: false, ai: false } },
  { name: 'Basic',      color: '#3b82f6', agents: 1,   trial: false, features: { out: true,  in: true,  sms: false, rec: false, wp: false, ai: false } },
  { name: 'Pro',        color: '#8b5cf6', agents: 1,   trial: false, features: { out: true,  in: true,  sms: true,  rec: true,  wp: false, ai: false } },
  { name: 'Business',   color: '#f59e0b', agents: 1,   trial: false, features: { out: true,  in: true,  sms: true,  rec: true,  wp: true,  ai: true  } },
  { name: 'Enterprise', color: '#10b981', agents: 100, trial: false, features: { out: true,  in: true,  sms: true,  rec: true,  wp: true,  ai: true  } },
];

function ApproveModal({ company, onClose, onApproved }) {
  const [agentLimit, setAgentLimit] = useState(company.requestedAgentLimit || company.agentLimit || 1);
  const [selectedPackage, setSelectedPackage] = useState('Trial');
  const [availableNumbers, setAvailableNumbers] = useState([]);
  const [selectedNumbers, setSelectedNumbers] = useState([]);
  const [numbersLoading, setNumbersLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchJson(`${API_URL}/superadmin/numbers`)
      .then(data => setAvailableNumbers(Array.isArray(data) ? data : []))
      .catch(() => setAvailableNumbers([]))
      .finally(() => setNumbersLoading(false));
  }, []);

  const toggleNumber = (num) => {
    setSelectedNumbers(prev =>
      prev.some(n => n.number === num.number)
        ? prev.filter(n => n.number !== num.number)
        : [...prev, { number: num.number, callerName: company.name, areaCode: num.countryCode || '' }]
    );
  };

  const handleApprove = async () => {
    setLoading(true); setError(null);
    try {
      await fetchJson(`${API_URL}/superadmin/companies/${company.id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ agentLimit: Number(agentLimit), numberPool: selectedNumbers, packageName: selectedPackage }),
      });
      onApproved();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const freeNumbers = availableNumbers.filter(n => !n.assigned);
  const assignedNumbers = availableNumbers.filter(n => n.assigned);

  return (
    <div style={OVERLAY}>
      <div style={{ ...modal(560), maxHeight: '90vh', overflowY: 'auto' }}>
        <h3 style={{ margin: '0 0 4px', fontSize: 18 }}>Approve — {company.name}</h3>
        <p style={{ color: '#6b7280', margin: '0 0 8px', fontSize: 13 }}>
          Requested {company.requestedAgentLimit || 0} agents and {company.requestedNumbers || 0} numbers.
        </p>
        {company.ntn && (
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '8px 12px', marginBottom: 16, fontSize: 13, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>NTN: <strong style={{ fontFamily: 'monospace' }}>{company.ntn}</strong></span>
            <a href="https://e.fbr.gov.pk/esbn/Verification" target="_blank" rel="noopener noreferrer"
              style={{ color: '#2563eb', fontSize: 12, fontWeight: 700, textDecoration: 'none', background: '#dbeafe', padding: '2px 8px', borderRadius: 6 }}>
              Verify on FBR ↗
            </a>
          </div>
        )}
        {!company.ntn && (
          <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, padding: '8px 12px', marginBottom: 16, fontSize: 12, color: '#92400e' }}>
            No NTN provided — verify company identity before approving.
          </div>
        )}

        {error && <div style={{ background: '#fee2e2', color: '#991b1b', borderRadius: 10, padding: '10px 12px', marginBottom: 14, fontSize: 13 }}>{error}</div>}

        {/* Package selector */}
        <label style={labelStyle}>Assign Package</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 6, marginBottom: 14 }}>
          {ALL_PACKAGES.map(pkg => {
            const isActive = selectedPackage === pkg.name;
            const f = pkg.features;
            return (
              <button key={pkg.name} type="button" onClick={() => setSelectedPackage(pkg.name)}
                style={{ border: `2px solid ${isActive ? pkg.color : '#e5e7eb'}`, borderRadius: 10,
                  padding: '8px 6px', cursor: 'pointer', textAlign: 'left',
                  background: isActive ? `${pkg.color}15` : '#fff', transition: 'all 0.15s' }}>
                <div style={{ fontWeight: 800, fontSize: 11, color: pkg.color, marginBottom: 2 }}>{pkg.name}</div>
                <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 3 }}>
                  {pkg.trial ? 'Free · 7 days' : (pkg.name === 'Enterprise' ? 'Custom' : `$${pkg.name === 'Basic' ? '24.99' : pkg.name === 'Pro' ? '39.99' : '69.99'}/seat`)}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px 2px' }}>
                  {[['out','Out'],['in','In'],['sms','SMS'],['rec','Rec'],['wp','WA'],['ai','AI']].map(([key, lbl]) => (
                    <div key={key} style={{ fontSize: 9, fontWeight: 700, color: f[key] ? '#059669' : '#d1d5db', display: 'flex', alignItems: 'center', gap: 2 }}>
                      <span>{f[key] ? '✓' : '✗'}</span>{lbl}
                    </div>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
        {selectedPackage === 'Trial' && (
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '8px 12px', marginBottom: 14, fontSize: 12, color: '#1e40af' }}>
            🎯 <strong>Trial:</strong> 1 seat · 7 days · Outbound calls only · No SMS, Recording, WhatsApp, or AI
          </div>
        )}

        <label style={labelStyle}>Approved Agent Limit</label>
        <input type="number" min="1" value={agentLimit} onChange={e => setAgentLimit(e.target.value)} style={inputStyle} />

        <label style={labelStyle}>
          Assign Numbers
          {selectedNumbers.length > 0 && (
            <span style={{ marginLeft: 8, background: '#d1fae5', color: '#065f46', borderRadius: 999, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
              {selectedNumbers.length} selected
            </span>
          )}
        </label>

        {numbersLoading ? (
          <div style={{ padding: '14px', color: '#6b7280', fontSize: 13, background: '#f9fafb', borderRadius: 10, marginBottom: 14 }}>
            Loading Telnyx numbers…
          </div>
        ) : availableNumbers.length === 0 ? (
          <div style={{ padding: '14px', background: '#fef3c7', color: '#92400e', borderRadius: 10, marginBottom: 14, fontSize: 13 }}>
            No numbers found on your Telnyx account. Check your TELNYX_API_KEY.
          </div>
        ) : (
          <div style={{ border: '1.5px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', marginBottom: 14 }}>
            {freeNumbers.length > 0 && (
              <>
                <div style={{ padding: '8px 14px', background: '#f9fafb', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e5e7eb' }}>
                  Available ({freeNumbers.length})
                </div>
                {freeNumbers.map(num => {
                  const checked = selectedNumbers.some(n => n.number === num.number);
                  return (
                    <label key={num.number}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderBottom: '1px solid #f3f4f6', cursor: 'pointer',
                        background: checked ? '#f0fdf4' : '#fff', transition: 'background 0.1s' }}>
                      <input type="checkbox" checked={checked} onChange={() => toggleNumber(num)}
                        style={{ width: 16, height: 16, accentColor: '#10b981', cursor: 'pointer', flexShrink: 0 }} />
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div>
                          <span style={{ fontWeight: 700, fontSize: 14, fontFamily: 'monospace' }}>{num.number}</span>
                          {num.countryCode && (
                            <span style={{ marginLeft: 8, background: '#ede9fe', color: '#5b21b6', borderRadius: 6, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>{num.countryCode}</span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: '#6b7280' }}>
                          Caller: <strong>{company.name}</strong>
                        </div>
                      </div>
                      {checked && <span style={{ fontSize: 16, color: '#10b981' }}>✓</span>}
                    </label>
                  );
                })}
              </>
            )}
            {assignedNumbers.length > 0 && (
              <>
                <div style={{ padding: '8px 14px', background: '#f9fafb', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e5e7eb', borderTop: freeNumbers.length > 0 ? '1px solid #e5e7eb' : 'none' }}>
                  Already Assigned ({assignedNumbers.length})
                </div>
                {assignedNumbers.map(num => (
                  <div key={num.number} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderBottom: '1px solid #f3f4f6', opacity: 0.45 }}>
                    <input type="checkbox" disabled style={{ width: 16, height: 16, flexShrink: 0 }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, fontFamily: 'monospace' }}>{num.number}</span>
                      {num.countryCode && (
                        <span style={{ background: '#f3f4f6', color: '#6b7280', borderRadius: 6, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>{num.countryCode}</span>
                      )}
                      <span style={{ fontSize: 12, color: '#6b7280' }}>already assigned</span>
                    </div>
                  </div>
                ))}
              </>
            )}
            {freeNumbers.length === 0 && assignedNumbers.length > 0 && (
              <div style={{ padding: 14, color: '#6b7280', fontSize: 13 }}>All numbers are already assigned to other companies.</div>
            )}
          </div>
        )}

        <div style={actionRow}>
          <button onClick={onClose} style={btnSecondary}>Cancel</button>
          <button onClick={handleApprove} disabled={loading} style={btnPrimary('#10b981')}>
            {loading ? 'Approving…' : `Approve & Activate${selectedNumbers.length ? ` (${selectedNumbers.length} numbers)` : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function RejectModal({ company, onClose, onRejected }) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReject = async () => {
    setLoading(true);
    try {
      await fetchJson(`${API_URL}/superadmin/companies/${company.id}/reject`, {
        method: 'POST', body: JSON.stringify({ reason }),
      });
      onRejected();
    } finally { setLoading(false); }
  };

  return (
    <div style={OVERLAY}>
      <div style={modal(420)}>
        <h3 style={{ margin: '0 0 16px', fontSize: 18 }}>Reject — {company.name}</h3>
        <label style={labelStyle}>Reason</label>
        <textarea rows={4} value={reason} onChange={e => setReason(e.target.value)}
          style={{ ...inputStyle, minHeight: 100, resize: 'vertical' }} />
        <div style={actionRow}>
          <button onClick={onClose} style={btnSecondary}>Cancel</button>
          <button onClick={handleReject} disabled={loading || !reason.trim()} style={btnPrimary('#ef4444')}>
            {loading ? 'Rejecting…' : 'Reject'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── chart helpers ────────────────────────────────────────────────────────────

function BarChart({ data = [], valueKey = 'value', labelKey = 'label', color = '#6366f1', height = 160 }) {
  const maxRaw = Math.max(...data.map(d => d[valueKey] || 0), 1);
  const max = Math.max(4, Math.ceil(maxRaw / 4) * 4);
  const W = Math.max(260, data.length * 56);
  const H = height;
  const padding = { top: 18, right: 10, bottom: 34, left: 34 };
  const baseY = H - padding.bottom;
  const chartTop = padding.top;
  const chartHeight = baseY - chartTop;
  const barGap = 10;
  const barW = data.length ? (W - padding.left - padding.right - barGap * (data.length - 1)) / data.length : W;
  const ticks = Array.from({ length: 4 }, (_, idx) => Math.round((max / 3) * idx));
  const gradientId = `bar-gradient-${color.replace('#', '')}`;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', height: `${height}px`, display: 'block' }}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.95" />
          <stop offset="100%" stopColor={color} stopOpacity="0.72" />
        </linearGradient>
      </defs>

      {ticks.map((tick, idx) => {
        const y = baseY - (tick / max) * chartHeight;
        return (
          <g key={idx}>
            <line x1={padding.left} y1={y} x2={W - padding.right} y2={y} stroke="#e7eef7" strokeDasharray="4 5" strokeWidth="1" />
            {idx > 0 && (
              <text x={padding.left - 8} y={y + 4} textAnchor="end" fontSize="11" fontWeight="600" fill="#94a3b8">
                {tick}
              </text>
            )}
          </g>
        );
      })}

      {data.map((d, i) => {
        const val = d[valueKey] || 0;
        const barH = (val / max) * chartHeight;
        const x = padding.left + i * (barW + barGap);
        const label = String(d[labelKey] || '');
        return (
          <g key={i}>
            <rect
              x={x}
              y={baseY - barH}
              width={barW}
              height={barH}
              fill={`url(#${gradientId})`}
              rx="8"
            />
            <rect
              x={x}
              y={baseY - barH}
              width={barW}
              height={Math.min(barH, 14)}
              fill="#ffffff22"
              rx="8"
            />
            <text x={x + barW / 2} y={H - 10} textAnchor="middle" fontSize="12" fill="#64748b" fontWeight="700">
              {label.length > 6 ? `${label.slice(0, 6)}…` : label}
            </text>
            {barH > 10 && (
              <text x={x + barW / 2} y={baseY - barH - 8} textAnchor="middle" fontSize="13" fill={color} fontWeight="800">
                {val}
              </text>
            )}
          </g>
        );
      })}
      <line x1={padding.left} y1={baseY} x2={W - padding.right} y2={baseY} stroke="#cfd8e3" strokeWidth="1.2" />
    </svg>
  );
}

function DonutChart({ segments = [], size = 120 }) {
  const total = segments.reduce((s, seg) => s + (seg.value || 0), 0);
  if (total === 0) return <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: 12, padding: 20 }}>No data</div>;
  const cx = size / 2, cy = size / 2, r = size * 0.39, ir = size * 0.27;
  let angle = -Math.PI / 2;
  const paths = segments.map(seg => {
    const pct = seg.value / total;
    const sweep = pct * 2 * Math.PI;
    const x1 = cx + r * Math.cos(angle), y1 = cy + r * Math.sin(angle);
    const x2 = cx + r * Math.cos(angle + sweep), y2 = cy + r * Math.sin(angle + sweep);
    const ix1 = cx + ir * Math.cos(angle), iy1 = cy + ir * Math.sin(angle);
    const ix2 = cx + ir * Math.cos(angle + sweep), iy2 = cy + ir * Math.sin(angle + sweep);
    const large = sweep > Math.PI ? 1 : 0;
    const d = `M${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} L${ix2},${iy2} A${ir},${ir} 0 ${large},0 ${ix1},${iy1} Z`;
    angle += sweep;
    return { d, color: seg.color, label: seg.label, value: seg.value, pct: Math.round(pct * 100) };
  });
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, width: '100%' }}>
      <svg width={size} height={size} style={{ flexShrink: 0, overflow: 'visible' }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#eaf0f6" strokeWidth={size * 0.12} />
        {paths.map((p, i) => <path key={i} d={p.d} fill={p.color} stroke="#fff" strokeWidth="1.5" />)}
        <circle cx={cx} cy={cy} r={ir} fill="#ffffff" />
        <text x={cx} y={cy - 2} textAnchor="middle" fontSize={size * 0.2} fontWeight="900" fill="#0f172a">{total.toLocaleString()}</text>
        <text x={cx} y={cy + 16} textAnchor="middle" fontSize={size * 0.085} fill="#64748b" fontWeight="700">Total calls</text>
      </svg>
      <div style={{ display: 'grid', gap: 10, minWidth: 200, flex: 1 }}>
        {paths.map((p, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: 12,
              padding: '0 0 6px',
              borderBottom: i === paths.length - 1 ? 'none' : '1px solid #edf2f7',
            }}
          >
            <div style={{ width: 12, height: 12, borderRadius: 999, background: p.color, flexShrink: 0 }} />
            <span style={{ color: '#334155', fontWeight: 700, flex: 1 }}>{p.label}</span>
            <span style={{ color: '#0f172a', fontWeight: 800 }}>{p.value}</span>
            <span style={{ color: '#64748b', fontWeight: 700, minWidth: 42, textAlign: 'right' }}>{p.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── tab panels ───────────────────────────────────────────────────────────────

const CAMPAIGN_MODE_COLORS = {
  PREDICTIVE: { bg: '#dbeafe', color: '#1d4ed8', label: 'Predictive' },
  POWER:      { bg: '#fef3c7', color: '#92400e', label: 'Power' },
  PREVIEW:    { bg: '#d1fae5', color: '#065f46', label: 'Preview' },
};

function DashboardTab({ overview, overviewLoading, isMobile = false, isPhone = false }) {
  const topCompanies  = overview?.topCompanies || [];
  const topStates     = (overview?.topStates || []).map(s => ({ id: s.state, value: s.calls, label: s.state }));
  const topCountries  = (overview?.topCountries || []).map(c => ({ id: c.id, value: c.calls }));
  const [trendPeriod, setTrendPeriod] = useState('daily');
  const trendSeries = overview?.companyTrends?.[trendPeriod] || [];
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1440,
  );

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isTablet = viewportWidth <= 1100;

  return (
    <div style={{ display: 'grid', gap: 22 }}>
      {/* ── Stat Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, 1fr)', gap: isPhone ? 12 : 16 }}>
        {overviewLoading || !overview ? (
          Array.from({ length: 8 }).map((_, i) => <StatCard key={i} label="Loading" value="…" />)
        ) : (
          <>
            <StatCard label="Companies"     value={overview.totalCompanies}  sub={`${overview.activeCompanies} active`} accent="#6366f1" />
            <StatCard label="Open Requests" value={overview.pendingCompanies + (overview.reactivationRequests || 0)} sub="pending review" accent="#f59e0b" />
            <StatCard label="Agents"        value={overview.totalAgents}     sub={`${overview.totalAdmins} admins`} accent="#3b82f6" />
            <StatCard label="Leads"         value={overview.totalLeads}      sub={`${overview.totalLists} lists`} accent="#8b5cf6" />
            <StatCard label="Calls"         value={overview.totalCalls}      sub={`${overview.connectionRate}% connected`} accent="#ef4444" />
            <StatCard label="Minutes"       value={formatMinutesValue(overview.totalMinutes)}    sub={`${overview.inboundCalls} in / ${overview.outboundCalls} out`} accent="#0ea5e9" />
            <StatCard label="Revenue"       value={`$${Math.round(overview.totalRevenue || 0).toLocaleString()}`} sub={`${overview.recordings} recordings`} accent="#059669" />
            <StatCard label="Numbers"       value={overview.totalNumbers}    sub={`${overview.totalCampaigns} campaigns`} accent="#14b8a6" />
          </>
        )}
      </div>

      {/* ── World Call Heatmap ── */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: '22px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4, color: '#111827' }}>World Call Activity Map — All Companies</div>
        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 16 }}>
          Explore every country even with no dial data. Hover for flag + name, drag to pan, and scroll to zoom.
        </div>
        <Suspense fallback={
          <div style={{ height: 360, background: '#f8fafc', borderRadius: 12, display: 'grid', placeItems: 'center' }}>
            <div style={{ color: '#94a3b8', fontSize: 14, fontWeight: 600 }}>Loading map…</div>
          </div>
        }>
          <ProWorldMap data={topCountries} compact={isMobile} />
        </Suspense>
      </div>

      {/* ── Graphs ── */}
      {!overviewLoading && overview && (
        <div style={{ display: 'grid', gap: 18 }}>
          {/* Company Call Trends — full width */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: '22px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15, color: '#111827' }}>Company Call Trends</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 3 }}>Daily, weekly, and monthly performance by company</div>
              </div>
              <div style={{ display: 'inline-flex', gap: 6, padding: 4, borderRadius: 999, background: '#eef2ff' }}>
                {['daily', 'weekly', 'monthly'].map(period => (
                  <button
                    key={period}
                    type="button"
                    onClick={() => setTrendPeriod(period)}
                    style={{
                      border: 'none',
                      borderRadius: 999,
                      padding: '7px 12px',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: 12,
                      background: trendPeriod === period ? '#111827' : 'transparent',
                      color: trendPeriod === period ? '#fff' : '#4f46e5',
                    }}
                  >
                    {period.charAt(0).toUpperCase() + period.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            {trendSeries.length > 0
              ? <BetterMultiCompanyLineChart series={trendSeries} />
              : <div style={{ color: '#9ca3af', fontSize: 12, textAlign: 'center', padding: '80px 0' }}>No trend data yet</div>
            }
          </div>

          {/* 3 smaller charts in an even row */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: 18, alignItems: 'start' }}>
            {/* Companies by calls bar chart */}
            <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #e5edf6', padding: '16px 16px 14px', boxShadow: '0 8px 20px rgba(15,23,42,0.05)', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14, color: '#0f172a' }}>Companies by Calls</div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Top performers across the current view</div>
              </div>
              <div style={{ height: 176, display: 'flex', alignItems: 'flex-end' }}>
                {topCompanies.length > 0
                  ? <BarChart data={topCompanies.map(c => ({ label: c.companyName?.slice(0, 8), value: c.totalCalls }))} color="#6366f1" height={176} />
                  : <div style={{ color: '#9ca3af', fontSize: 12, textAlign: 'center', width: '100%' }}>No data yet</div>
                }
              </div>
              <div style={{ paddingTop: 10, borderTop: '1px solid #eef2f7', fontSize: 11, color: '#64748b' }}>
                {topCompanies[0] ? `${topCompanies[0].companyName} leads this period.` : 'Waiting for call activity.'}
              </div>
            </div>

            {/* Call status donut */}
            <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #e5edf6', padding: '16px 16px 14px', boxShadow: '0 8px 20px rgba(15,23,42,0.05)', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14, color: '#0f172a' }}>Call Status</div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Connected, missed, and inbound breakdown</div>
              </div>
              <div style={{ minHeight: 176, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <DonutChart segments={[
                  { label: 'Connected', value: overview.connectedCalls || 0,  color: '#10b981' },
                  { label: 'Missed',    value: Math.max(0, (overview.totalCalls || 0) - (overview.connectedCalls || 0) - (overview.inboundCalls || 0)), color: '#f59e0b' },
                  { label: 'Inbound',   value: overview.inboundCalls || 0,   color: '#6366f1' },
                ]} size={106} />
              </div>
              <div style={{ paddingTop: 10, borderTop: '1px solid #eef2f7', fontSize: 11, color: '#64748b' }}>
                {overview.connectionRate}% of calls connected successfully.
              </div>
            </div>

            {/* Top states bar chart */}
            <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #e5edf6', padding: '16px 16px 14px', boxShadow: '0 8px 20px rgba(15,23,42,0.05)', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14, color: '#0f172a' }}>Top States Called</div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Regional call demand snapshot</div>
              </div>
              <div style={{ height: 176, display: 'flex', alignItems: 'flex-end' }}>
                {topStates.length > 0
                  ? <BarChart data={topStates.slice(0, 8).map(s => ({ label: s.id, value: s.value }))} color="#0f766e" height={176} />
                  : <div style={{ color: '#9ca3af', fontSize: 12, textAlign: 'center', width: '100%' }}>No data yet</div>
                }
              </div>
              <div style={{ paddingTop: 10, borderTop: '1px solid #eef2f7', fontSize: 11, color: '#64748b' }}>
                {topStates[0] ? `${topStates[0].id} is the most active state right now.` : 'Waiting for geo activity.'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Companies + State breakdown ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : 'minmax(0, 1.3fr) minmax(0, 1fr)', gap: 18 }}>
        <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #e5edf6', padding: '22px 24px', boxShadow: '0 10px 24px rgba(15,23,42,0.05)' }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#111827' }}>Top Companies by Calls</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Best performers ranked by current call volume</div>
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            {topCompanies.length === 0
              ? <div style={{ color: '#9ca3af', fontSize: 13 }}>No activity yet.</div>
              : topCompanies.map((c, i) => (
                <div key={c.accountId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, padding: '14px 16px', background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)', borderRadius: 14, border: '1px solid #edf2f7' }}>
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center', minWidth: 0 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 12, background: i === 0 ? '#ede9fe' : '#f1f5f9', color: i === 0 ? '#6d28d9' : '#475569', fontSize: 13, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 15, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.companyName}</div>
                      <div style={{ color: '#6b7280', fontSize: 12 }}>{formatMinutesValue(c.totalMinutes)} min • ${Math.round(c.revenue || 0).toLocaleString()}</div>
                      {c.topStates?.slice(0, 3).length > 0 && (
                        <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                          {c.topStates.slice(0, 3).map(s => (
                            <span key={s.state} style={{ background: '#f0f9ff', color: '#0369a1', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4, fontFamily: 'monospace' }}>
                              {s.state} {s.calls}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{c.totalCalls}</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>calls</div>
                  </div>
                </div>
              ))
            }
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #e5edf6', padding: '22px 24px', boxShadow: '0 10px 24px rgba(15,23,42,0.05)' }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#111827' }}>Top Calling States</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Readable regional ranking with call share</div>
          </div>
          {topStates.length > 0 ? (
            <div style={{ display: 'grid', gap: 12 }}>
              {(() => {
                const maxStateCalls = Math.max(...topStates.map(s => s.value || 0), 1);
                return topStates.slice(0, 8).map((s, i) => (
                  <div key={s.id} style={{ display: 'grid', gap: 6 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr auto', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 10, background: i === 0 ? '#d1fae5' : '#f1f5f9', color: i === 0 ? '#047857' : '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900 }}>
                        {s.id}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>{s.id}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>Rank #{i + 1}</div>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 900, color: '#0f172a' }}>{s.value}</div>
                    </div>
                    <div style={{ height: 8, borderRadius: 999, background: '#edf2f7', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.max(8, (s.value / maxStateCalls) * 100)}%`, height: '100%', borderRadius: 999, background: 'linear-gradient(90deg, #0f766e 0%, #2dd4bf 100%)' }} />
                    </div>
                  </div>
                ));
              })()}
            </div>
          ) : (
            <div style={{ color: '#9ca3af', fontSize: 13 }}>No geo data yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function RequestsTab({ companies, loading, onApprove, onReject, onActivate, onRegenerate, isMobile = false }) {
  const pending = companies.filter(c => c.status === 'PENDING');
  const reactivation = companies.filter(c => c.reactivationRequested);

  const [verifications, setVerifications] = useState([]);
  const [vLoading, setVLoading] = useState(true);
  const [revealedOtps, setRevealedOtps] = useState({});
  const [refreshingOtp, setRefreshingOtp] = useState({});

  const loadVerifications = useCallback(async () => {
    try {
      const data = await fetchJson(`${API_URL}/superadmin/pending-verifications`);
      setVerifications(Array.isArray(data) ? data : []);
    } catch { setVerifications([]); }
    finally { setVLoading(false); }
  }, []);

  useEffect(() => { loadVerifications(); }, [loadVerifications]);

  const handleRefreshOtp = async (email) => {
    setRefreshingOtp(p => ({ ...p, [email]: true }));
    try {
      const res = await fetchJson(`${API_URL}/superadmin/pending-verifications/${encodeURIComponent(email)}/resend-otp`, { method: 'POST' });
      setVerifications(prev => prev.map(v => v.email === email ? { ...v, otpCode: res.otpCode, expired: false } : v));
      setRevealedOtps(p => ({ ...p, [email]: true }));
    } finally {
      setRefreshingOtp(p => ({ ...p, [email]: false }));
    }
  };

  const total = pending.length + reactivation.length;

  if (loading) return <Placeholder>Loading requests…</Placeholder>;
  if (total === 0 && verifications.length === 0) return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', padding: '36px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 36, marginBottom: 10 }}>✅</div>
      <div style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>All clear</div>
      <div style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>No pending requests right now.</div>
    </div>
  );

  return (
    <div style={{ display: 'grid', gap: 20 }}>

      {/* ── Awaiting Email Verification ── */}
      {!vLoading && verifications.length > 0 && (
        <div>
          <SectionHeader icon="📧" title="Awaiting Email Verification" count={verifications.length} countBg="#fef3c7" countColor="#92400e" />
          <div style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #fde68a', overflow: 'hidden', marginTop: 10 }}>
            <div style={{ padding: '10px 16px', background: '#fffbeb', fontSize: 12, color: '#92400e', borderBottom: '1px solid #fde68a' }}>
              Use `New OTP` to email a fresh 24-hour verification code to the pending signup.
            </div>
            <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: isMobile ? 760 : '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                {['Company', 'Email', 'Phone', 'OTP Code', 'Status', 'Email Activity', 'Action'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, color: '#6b7280', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                ))}
                </tr>
              </thead>
              <tbody>
                {verifications.map((v, i) => (
                  <tr key={v.email} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ padding: '13px 16px', borderBottom: '1px solid #f3f4f6' }}>
                      <div style={{ fontWeight: 700 }}>{v.companyName}</div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>{v.name}</div>
                    </td>
                    <td style={{ padding: '13px 16px', borderBottom: '1px solid #f3f4f6', fontSize: 13, fontFamily: 'monospace' }}>{v.email}</td>
                    <td style={{ padding: '13px 16px', borderBottom: '1px solid #f3f4f6', fontSize: 13 }}>{v.phone || '—'}</td>
                    <td style={{ padding: '13px 16px', borderBottom: '1px solid #f3f4f6' }}>
                      {revealedOtps[v.email] ? (
                        <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 18, color: '#7c3aed', background: '#ede9fe', padding: '4px 10px', borderRadius: 8, letterSpacing: 3 }}>
                          {v.otpCode}
                        </span>
                      ) : (
                        <button onClick={() => setRevealedOtps(p => ({ ...p, [v.email]: true }))}
                          style={{ background: '#ede9fe', color: '#5b21b6', border: 'none', borderRadius: 7, padding: '5px 12px', cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>
                          Show OTP
                        </button>
                      )}
                    </td>
                    <td style={{ padding: '13px 16px', borderBottom: '1px solid #f3f4f6' }}>
                      <Badge bg={v.expired ? '#fee2e2' : '#d1fae5'} color={v.expired ? '#991b1b' : '#065f46'}>
                        {v.expired ? 'Expired' : 'Valid'}
                      </Badge>
                    </td>
                    <td style={{ padding: '13px 16px', borderBottom: '1px solid #f3f4f6', fontSize: 12 }}>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{v.sentTo || v.email}</div>
                      <div style={{ color: '#6b7280', marginTop: 3 }}>
                        {v.lastEmailedAt ? `Last email: ${formatDateTime(v.lastEmailedAt)}` : 'No email activity yet'}
                      </div>
                    </td>
                    <td style={{ padding: '13px 16px', borderBottom: '1px solid #f3f4f6' }}>
                      <button onClick={() => handleRefreshOtp(v.email)} disabled={refreshingOtp[v.email]}
                        style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 7, padding: '6px 12px', cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>
                        {refreshingOtp[v.email] ? '…' : 'Email OTP'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}

      {reactivation.length > 0 && (
        <div>
          <SectionHeader icon="🔄" title="Reactivation Requests" count={reactivation.length} countBg="#fef3c7" countColor="#92400e" />
          <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
            {reactivation.map(c => (
              <div key={c.id} style={{ background: '#fff', borderRadius: 12, border: '1.5px solid #fed7aa', padding: 16, display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{c.adminName} · {c.adminEmail}</div>
                  <div style={{ fontSize: 12, color: '#9a3412', marginTop: 6, background: '#fff7ed', padding: '4px 8px', borderRadius: 6, display: 'inline-block' }}>
                    {(c.rejectionReason || '').replace('[REACTIVATION_REQUEST]', '').trim()}
                  </div>
                </div>
                <button onClick={() => onActivate(c)} style={btnPrimary('#10b981')}>Activate</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {pending.length > 0 && (
        <div>
          <SectionHeader icon="📋" title="New Company Signups" count={pending.length} countBg="#ede9fe" countColor="#5b21b6" />
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', overflow: 'hidden', marginTop: 10 }}>
            <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: isMobile ? 720 : '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['Company', 'Admin', 'Request', 'Phone', 'Date', 'Actions'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '11px 16px', fontSize: 11, color: '#6b7280', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pending.map((c, i) => (
                  <tr key={c.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6' }}>
                      <div style={{ fontWeight: 700 }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: '#6366f1', marginTop: 3, fontFamily: 'monospace', fontWeight: 700 }}>{c.accessCode || '—'}</div>
                    </td>
                    <td style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6' }}>
                      <div style={{ fontSize: 13 }}>{c.adminName}</div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>{c.adminEmail}</div>
                    </td>
                    <td style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6', fontSize: 13 }}>
                      {c.requestedAgentLimit} agents<br />
                      <span style={{ color: '#6b7280', fontSize: 12 }}>{c.requestedNumbers} numbers</span>
                    </td>
                    <td style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6', fontSize: 13 }}>
                      {c.adminPhone || '—'}
                      {c.ntn && (
                        <div style={{ marginTop: 4 }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1d4ed8', fontSize: 12 }}>NTN: {c.ntn}</span>
                          <a href={`https://e.fbr.gov.pk/esbn/Verification`} target="_blank" rel="noopener noreferrer"
                            style={{ marginLeft: 6, fontSize: 10, color: '#2563eb', textDecoration: 'underline' }}>
                            Verify FBR ↗
                          </a>
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6', fontSize: 13, color: '#6b7280' }}>
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6' }}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button onClick={() => onApprove(c)} style={{ ...btnPrimary('#10b981'), padding: '7px 12px', fontSize: 12 }}>Approve</button>
                        <button onClick={() => onReject(c)} style={{ ...btnPrimary('#ef4444'), padding: '7px 12px', fontSize: 12 }}>Reject</button>
                        <button onClick={() => onRegenerate(c.id)} style={{ ...btnSecondary, padding: '7px 12px', fontSize: 12 }}>New Code</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CompaniesTab({ companies, loading, onToggle, onRegenerate, onDelete, isMobile = false, isPhone = false }) {
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const loadDetail = useCallback(async (id) => {
    if (!id) return;
    setDetailLoading(true);
    try {
      const data = await fetchJson(`${API_URL}/superadmin/companies/${id}/details`);
      setDetail(data);
    } finally { setDetailLoading(false); }
  }, []);

  useEffect(() => { if (selectedId) loadDetail(selectedId); }, [selectedId, loadDetail]);

  const filtered = useMemo(() => {
    return companies.filter(c => {
      const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || (c.adminEmail || '').toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === 'ALL' || c.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [companies, search, filterStatus]);

  if (loading) return <Placeholder>Loading companies…</Placeholder>;

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
          <input
            type="text" placeholder="Search companies…" value={search} onChange={e => setSearch(e.target.value)}
            style={{ ...inputStyle, marginBottom: 0, flex: '1 1 200px', minWidth: 140 }}
          />
          {['ALL', 'ACTIVE', 'PENDING', 'INACTIVE'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              style={{ padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12,
                background: filterStatus === s ? '#111827' : '#f3f4f6',
                color: filterStatus === s ? '#fff' : '#374151' }}>
              {s}
            </button>
          ))}
        </div>

        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          {isMobile ? (
            <div style={{ display: 'grid', gap: 10, padding: 12 }}>
              {filtered.length === 0 && (
                <div style={{ padding: 16, color: '#9ca3af', fontSize: 13 }}>No companies match your filter.</div>
              )}
              {filtered.map((c) => {
                const pkgColor = { Trial:'#6366f1', Basic:'#3b82f6', Pro:'#8b5cf6', Business:'#f59e0b', Enterprise:'#10b981' }[c.packageName] || '#9ca3af';
                const trialExpired = c.isTrial && c.trialEndsAt && new Date(c.trialEndsAt) < new Date();
                const trialDaysLeft = c.isTrial && c.trialEndsAt && !trialExpired
                  ? Math.ceil((new Date(c.trialEndsAt) - new Date()) / (1000*60*60*24)) : null;
                const isSelected = selectedId === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedId(prev => prev === c.id ? null : c.id)}
                    style={{
                      background: isSelected ? '#f5faff' : '#fff',
                      border: `1px solid ${isSelected ? '#bfdbfe' : '#e5e7eb'}`,
                      borderRadius: 14,
                      padding: 14,
                      boxShadow: isSelected ? '0 8px 20px rgba(59,130,246,0.10)' : '0 2px 8px rgba(15,23,42,0.04)',
                      display: 'grid',
                      gap: 12,
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: 15, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, overflowWrap: 'anywhere' }}>{c.adminEmail || 'No admin'}</div>
                      </div>
                      <StatusBadge status={c.status} />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {c.packageName ? (
                        <>
                          <span style={{ background: `${pkgColor}18`, color: pkgColor, border: `1px solid ${pkgColor}40`, borderRadius: 999, padding: '3px 10px', fontSize: 11, fontWeight: 800 }}>
                            {c.packageName}
                          </span>
                          {c.isTrial && !trialExpired && trialDaysLeft !== null && (
                            <span style={{ fontSize: 11, color: trialDaysLeft <= 2 ? '#ef4444' : '#64748b', fontWeight: 700 }}>
                              {trialDaysLeft}d left
                            </span>
                          )}
                          {trialExpired && (
                            <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 800 }}>Expired</span>
                          )}
                        </>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: 12 }}>No package</span>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
                      <div style={{ background: '#f8fafc', borderRadius: 12, padding: '10px 12px' }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Team</div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>{c.agentCount} agents</div>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{c.leadCount} leads</div>
                      </div>
                      <div style={{ background: '#f8fafc', borderRadius: 12, padding: '10px 12px' }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Calls</div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>{c.totalCalls}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{formatMinutesValue(c.totalMinutes)} min</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Revenue</div>
                        <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', marginTop: 4 }}>${Math.round(c.revenue || 0).toLocaleString()}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
                        {c.status !== 'PENDING' && (
                          <button onClick={() => onToggle(c)}
                            style={{ ...btnPrimary(c.status === 'ACTIVE' ? '#f59e0b' : '#10b981'), padding: '8px 12px', fontSize: 11 }}>
                            {c.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                          </button>
                        )}
                        <button onClick={() => onDelete(c)}
                          style={{ ...btnPrimary('#ef4444'), padding: '8px 12px', fontSize: 11 }}>
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
          <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: isMobile ? 780 : '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['Company', 'Package', 'Status', 'Team', 'Calls', 'Revenue', 'Actions'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '11px 16px', fontSize: 11, color: '#6b7280', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 24, color: '#9ca3af', fontSize: 13 }}>No companies match your filter.</td></tr>
              )}
              {filtered.map((c, i) => {
                const pkgColor = { Trial:'#6366f1', Basic:'#3b82f6', Pro:'#8b5cf6', Business:'#f59e0b', Enterprise:'#10b981' }[c.packageName] || '#9ca3af';
                const trialExpired = c.isTrial && c.trialEndsAt && new Date(c.trialEndsAt) < new Date();
                const trialDaysLeft = c.isTrial && c.trialEndsAt && !trialExpired
                  ? Math.ceil((new Date(c.trialEndsAt) - new Date()) / (1000*60*60*24)) : null;
                return (
                <tr key={c.id}
                  onClick={() => setSelectedId(prev => prev === c.id ? null : c.id)}
                  style={{ background: selectedId === c.id ? '#f0f9ff' : i % 2 === 0 ? '#fff' : '#fafafa', cursor: 'pointer', transition: 'background 0.15s' }}>
                  <td style={{ padding: '13px 16px', borderBottom: '1px solid #f3f4f6' }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>{c.adminEmail || 'No admin'}</div>
                  </td>
                  <td style={{ padding: '13px 16px', borderBottom: '1px solid #f3f4f6' }}>
                    {c.packageName ? (
                      <div>
                        <span style={{ background: `${pkgColor}18`, color: pkgColor, border: `1px solid ${pkgColor}40`, borderRadius: 20, padding: '2px 9px', fontSize: 11, fontWeight: 800 }}>
                          {c.packageName}
                        </span>
                        {c.isTrial && !trialExpired && trialDaysLeft !== null && (
                          <div style={{ fontSize: 10, color: trialDaysLeft <= 2 ? '#ef4444' : '#6b7280', marginTop: 3, fontWeight: 600 }}>
                            {trialDaysLeft}d left
                          </div>
                        )}
                        {trialExpired && (
                          <div style={{ fontSize: 10, color: '#ef4444', marginTop: 3, fontWeight: 700 }}>EXPIRED</div>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: '#d1d5db', fontSize: 12 }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '13px 16px', borderBottom: '1px solid #f3f4f6' }}><StatusBadge status={c.status} /></td>
                  <td style={{ padding: '13px 16px', borderBottom: '1px solid #f3f4f6', fontSize: 13 }}>
                    {c.agentCount} agents
                    <div style={{ fontSize: 12, color: '#6b7280' }}>{c.leadCount} leads</div>
                  </td>
                  <td style={{ padding: '13px 16px', borderBottom: '1px solid #f3f4f6', fontSize: 13 }}>
                    {c.totalCalls}
                    <div style={{ fontSize: 12, color: '#6b7280' }}>{formatMinutesValue(c.totalMinutes)} min</div>
                  </td>
                  <td style={{ padding: '13px 16px', borderBottom: '1px solid #f3f4f6', fontSize: 13, fontWeight: 700 }}>
                    ${Math.round(c.revenue || 0).toLocaleString()}
                  </td>
                  <td style={{ padding: '11px 16px', borderBottom: '1px solid #f3f4f6' }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {c.status !== 'PENDING' && (
                        <button onClick={() => onToggle(c)}
                          style={{ ...btnPrimary(c.status === 'ACTIVE' ? '#f59e0b' : '#10b981'), padding: '7px 10px', fontSize: 11 }}>
                          {c.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                      <button onClick={() => onDelete(c)}
                        style={{ ...btnPrimary('#ef4444'), padding: '7px 10px', fontSize: 11 }}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
          </div>
          )}
        </div>
      </div>

      {selectedId && (
        <div style={{ background: '#fff', borderRadius: 16, border: '1.5px solid #6366f120', padding: isPhone ? '18px 16px' : '24px 28px', display: 'grid', gap: 18, boxShadow: '0 2px 12px rgba(99,102,241,0.08)' }}>
          {detailLoading
            ? <Placeholder>Loading details…</Placeholder>
            : detail
            ? <CompanyDetail detail={detail} onRegenerate={onRegenerate} onRefresh={() => loadDetail(selectedId)} isMobile={isMobile} isPhone={isPhone} />
            : null
          }
        </div>
      )}
    </div>
  );
}

const PACKAGES = [
  { name: 'Trial',      price: 'Free',          agents: 1,   color: '#6366f1', features: { out: true,  in: false, sms: false, rec: false, wp: false, ai: false } },
  { name: 'Basic',      price: '$24.99/seat',   agents: 1,   color: '#3b82f6', features: { out: true,  in: true,  sms: false, rec: false, wp: false, ai: false } },
  { name: 'Pro',        price: '$39.99/seat',   agents: 1,   color: '#8b5cf6', features: { out: true,  in: true,  sms: true,  rec: true,  wp: false, ai: false } },
  { name: 'Business',   price: '$69.99/seat',   agents: 1,   color: '#f59e0b', features: { out: true,  in: true,  sms: true,  rec: true,  wp: true,  ai: true  } },
  { name: 'Enterprise', price: 'Custom',        agents: 100, color: '#10b981', features: { out: true,  in: true,  sms: true,  rec: true,  wp: true,  ai: true  } },
];

function PackageSection({ detail, onRefresh, isPhone = false }) {
  const [saving, setSaving] = useState(false);
  const [usage, setUsage] = useState(null);
  const [toggling, setToggling] = useState(null);

  useEffect(() => {
    fetchJson(`${API_URL}/superadmin/companies/${detail.id}/package-usage`)
      .then(setUsage).catch(() => {});
  }, [detail.id]);

  const handleAssignPackage = async (pkgName) => {
    if (!window.confirm(`Assign "${pkgName}" package to ${detail.name}?`)) return;
    setSaving(true);
    try {
      await fetchJson(`${API_URL}/superadmin/companies/${detail.id}/package`, {
        method: 'PATCH',
        body: JSON.stringify({ packageName: pkgName }),
      });
      const updated = await fetchJson(`${API_URL}/superadmin/companies/${detail.id}/package-usage`);
      setUsage(updated);
      onRefresh();
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  const handleToggleFeature = async (flag, currentValue) => {
    setToggling(flag);
    try {
      await fetchJson(`${API_URL}/superadmin/companies/${detail.id}/features`, {
        method: 'PATCH',
        body: JSON.stringify({ [flag]: !currentValue }),
      });
      setUsage(prev => prev ? { ...prev, [flag]: !currentValue } : prev);
    } catch (err) { alert(err.message); }
    finally { setToggling(null); }
  };

  const currentPkg = PACKAGES.find(p => p.name === (usage?.packageName || detail.packageName));

  const FeatureToggle = ({ flag, on, label }) => {
    const busy = toggling === flag;
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #f3f4f6' }}>
        <span style={{ fontSize: 12, color: '#374151', fontWeight: 500 }}>{label}</span>
        <button
          onClick={() => !busy && handleToggleFeature(flag, on)}
          disabled={busy}
          style={{
            width: 40, height: 22, borderRadius: 11, border: 'none', cursor: busy ? 'not-allowed' : 'pointer',
            background: on ? '#10b981' : '#d1d5db', position: 'relative', transition: 'background 0.2s', padding: 0,
            opacity: busy ? 0.6 : 1,
          }}
          title={on ? `Disable ${label}` : `Enable ${label}`}
        >
          <div style={{
            width: 16, height: 16, borderRadius: '50%', background: '#fff',
            position: 'absolute', top: 3, left: on ? 21 : 3, transition: 'left 0.2s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
          }} />
        </button>
      </div>
    );
  };

  const UsageBar = ({ used, limit, label, color }) => {
    if (limit === null || limit === undefined) return (
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6b7280', marginBottom: 3 }}>
          <span>{label}</span><span style={{ fontWeight: 700, color: '#374151' }}>{used?.toLocaleString()} / ∞</span>
        </div>
        <div style={{ height: 5, background: '#e5e7eb', borderRadius: 3 }}>
          <div style={{ width: '20%', height: '100%', background: color, borderRadius: 3 }} />
        </div>
      </div>
    );
    const pct = Math.min(100, Math.round((used / limit) * 100));
    const barColor = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : color;
    return (
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6b7280', marginBottom: 3 }}>
          <span>{label}</span>
          <span style={{ fontWeight: 700, color: pct >= 90 ? '#ef4444' : '#374151' }}>
            {used?.toLocaleString()} / {limit?.toLocaleString()} ({pct}%)
          </span>
        </div>
        <div style={{ height: 5, background: '#e5e7eb', borderRadius: 3 }}>
          <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: 3, transition: 'width 0.4s' }} />
        </div>
      </div>
    );
  };

  return (
    <div style={{ border: '1.5px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '8px 14px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Package & Features
        </span>
        {currentPkg && (
          <span style={{ background: currentPkg.color, color: '#fff', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 800 }}>
            {currentPkg.name}
          </span>
        )}
        {!currentPkg && <span style={{ color: '#9ca3af', fontSize: 12 }}>No package assigned</span>}
      </div>

      {/* Feature toggles */}
      {usage && (
        <div style={{ padding: '10px 14px', borderBottom: '1px solid #f3f4f6' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
            Feature Access
          </div>
          <FeatureToggle flag="canOutboundCall"      on={usage.canOutboundCall}      label="Outbound Calls" />
          <FeatureToggle flag="canInboundCall"       on={usage.canInboundCall}       label="Inbound Calls"  />
          <FeatureToggle flag="canCallInternational" on={usage.canCallInternational ?? true} label="International Calls" />
          <FeatureToggle flag="canSendSms"           on={usage.canSendSms}           label="SMS Messaging"  />
          <FeatureToggle flag="canSendWhatsapp"      on={usage.canSendWhatsapp}      label="WhatsApp Messaging" />
          <FeatureToggle flag="canRecord"            on={usage.canRecord}            label="Call Recording" />
          <FeatureToggle flag="canAiInsights"        on={usage.canAiInsights}        label="AI Call Insights" />
          <div style={{ marginTop: 10 }}>
            <UsageBar used={usage.usage?.callsThisMonth} limit={usage.monthlyCallLimit} label="Calls this month" color="#6366f1" />
            {usage.canSendSms && <UsageBar used={usage.usage?.smsThisMonth} limit={usage.monthlySmsLimit} label="SMS this month" color="#10b981" />}
          </div>
        </div>
      )}

      {/* Package picker */}
      <div style={{ padding: '10px 14px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Assign Package
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: isPhone ? '1fr' : 'repeat(3, 1fr)', gap: 6 }}>
          {PACKAGES.map(pkg => {
            const isActive = (usage?.packageName || detail.packageName) === pkg.name;
            const f = pkg.features;
            return (
              <button key={pkg.name} onClick={() => !saving && handleAssignPackage(pkg.name)}
                disabled={saving}
                style={{
                  border: `2px solid ${isActive ? pkg.color : '#e5e7eb'}`,
                  borderRadius: 10, padding: '8px 8px 6px', cursor: 'pointer', textAlign: 'left',
                  background: isActive ? `${pkg.color}12` : '#fff',
                  transition: 'all 0.15s',
                }}>
                <div style={{ fontWeight: 800, fontSize: 12, color: pkg.color, marginBottom: 3 }}>{pkg.name}</div>
                <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 4 }}>
                  {pkg.price}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px 4px' }}>
                  {[['out', 'Out'], ['in', 'In'], ['sms', 'SMS'], ['rec', 'Rec'], ['wp', 'WA'], ['ai', 'AI']].map(([key, label]) => (
                    <div key={key} style={{ fontSize: 9, fontWeight: 700, color: f[key] ? '#059669' : '#d1d5db', display: 'flex', alignItems: 'center', gap: 2 }}>
                      <span style={{ fontSize: 10 }}>{f[key] ? '✓' : '✗'}</span> {label}
                    </div>
                  ))}
                </div>
                {isActive && <div style={{ fontSize: 9, color: pkg.color, fontWeight: 700, marginTop: 4, textAlign: 'center' }}>● ACTIVE</div>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CompanyDetail({ detail, onRegenerate, onRefresh, isMobile = false, isPhone = false }) {
  const [unassigning, setUnassigning] = useState(null);
  const [showAssignPicker, setShowAssignPicker] = useState(false);
  const [availableNumbers, setAvailableNumbers] = useState([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [selectedToAssign, setSelectedToAssign] = useState([]);
  const [assigning, setAssigning] = useState(false);
  const [editingAgents, setEditingAgents] = useState(false);
  const [newAgentLimit, setNewAgentLimit] = useState(detail.agentLimit || 1);
  const [savingAgents, setSavingAgents] = useState(false);

  const handleSaveAgentLimit = async () => {
    setSavingAgents(true);
    try {
      await fetchJson(`${API_URL}/superadmin/companies/${detail.id}/agent-limit`, {
        method: 'PATCH',
        body: JSON.stringify({ agentLimit: Number(newAgentLimit) }),
      });
      setEditingAgents(false);
      onRefresh();
    } catch (err) { alert(err.message); }
    finally { setSavingAgents(false); }
  };

  const assignedNumbers = Array.isArray(detail.numberPool) ? detail.numberPool : [];
  const assignedSet = new Set(assignedNumbers.map(n => n.number));

  const openPicker = async () => {
    setShowAssignPicker(true);
    setSelectedToAssign([]);
    setPickerLoading(true);
    try {
      const data = await fetchJson(`${API_URL}/superadmin/numbers`);
      // show all unassigned OR previously assigned to this company
      setAvailableNumbers(Array.isArray(data) ? data.filter(n => !n.assigned || assignedSet.has(n.number)) : []);
    } catch { setAvailableNumbers([]); }
    finally { setPickerLoading(false); }
  };

  const toggleAssign = (num) => {
    setSelectedToAssign(prev =>
      prev.some(n => n.number === num.number)
        ? prev.filter(n => n.number !== num.number)
        : [...prev, { number: num.number, callerName: detail.name, areaCode: num.countryCode || '' }]
    );
  };

  const handleAssign = async () => {
    if (!selectedToAssign.length) return;
    setAssigning(true);
    try {
      await fetchJson(`${API_URL}/superadmin/companies/${detail.id}/assign-numbers`, {
        method: 'POST',
        body: JSON.stringify({ agentLimit: detail.agentLimit || 1, numberPool: selectedToAssign }),
      });
      setShowAssignPicker(false);
      setSelectedToAssign([]);
      onRefresh();
    } catch (err) { alert(err.message); }
    finally { setAssigning(false); }
  };

  const handleUnassign = async (number) => {
    if (!window.confirm(`Unassign ${number} from ${detail.name}?`)) return;
    setUnassigning(number);
    try {
      await fetchJson(`${API_URL}/superadmin/companies/${detail.id}/unassign-number`, {
        method: 'POST',
        body: JSON.stringify({ number }),
      });
      onRefresh();
    } catch (err) { alert(err.message); }
    finally { setUnassigning(null); }
  };

  return (
    <>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#111827' }}>{detail.name}</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginTop: 3, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {detail.lists.length} lists · {assignedNumbers.length} numbers
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {editingAgents ? (
                  <>
                    <input type="number" min="1" value={newAgentLimit} onChange={e => setNewAgentLimit(e.target.value)}
                      style={{ width: 60, padding: '2px 6px', borderRadius: 6, border: '1.5px solid #6366f1', fontSize: 12, fontWeight: 700 }} />
                    <button onClick={handleSaveAgentLimit} disabled={savingAgents}
                      style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
                      {savingAgents ? '…' : 'Save'}
                    </button>
                    <button onClick={() => setEditingAgents(false)}
                      style={{ background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontSize: 11 }}>
                      Cancel
                    </button>
                  </>
                ) : (
                  <span onClick={() => { setNewAgentLimit(detail.agentLimit || 1); setEditingAgents(true); }}
                    style={{ background: '#ede9fe', color: '#5b21b6', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                    title="Click to edit agent limit">
                    {detail.agents?.length || 0}/{detail.agentLimit || '?'} agents ✎
                  </span>
                )}
              </span>
            </div>
          </div>
          <StatusBadge status={detail.status} />
        </div>

        {/* NTN + Contact info row */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : detail.ntn ? '1fr 1fr' : '1fr', gap: 10, marginBottom: 2 }}>
          {detail.ntn && (
            <div style={{ background: detail.ntn ? '#eff6ff' : '#fef3c7', border: `1.5px solid ${detail.ntn ? '#bfdbfe' : '#fcd34d'}`, borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>NTN (Tax Number)</div>
                <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 15, color: '#1d4ed8', letterSpacing: '0.08em' }}>{detail.ntn}</div>
              </div>
              <a href="https://e.fbr.gov.pk/esbn/Verification" target="_blank" rel="noopener noreferrer"
                style={{ background: '#2563eb', color: '#fff', borderRadius: 7, padding: '5px 10px', fontSize: 11, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                Verify FBR ↗
              </a>
            </div>
          )}
          {!detail.ntn && (
            <div style={{ background: '#fef3c7', border: '1.5px solid #fcd34d', borderRadius: 10, padding: '10px 14px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#92400e' }}>⚠ No NTN Provided — verify company identity before approval</div>
            </div>
          )}
          <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '10px 14px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Contact</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{detail.adminName || '—'}</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>{detail.adminEmail}</div>
            {detail.adminPhone && <div style={{ fontSize: 12, color: '#374151', fontFamily: 'monospace' }}>{detail.adminPhone}</div>}
            {detail.website && <a href={detail.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#2563eb' }}>{detail.website}</a>}
          </div>
        </div>

        <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '12px 14px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>First Login Access Code</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <code style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', letterSpacing: '0.05em' }}>{detail.accessCode || '—'}</code>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Badge bg={detail.accessCodeUsed ? '#d1fae5' : '#fef3c7'} color={detail.accessCodeUsed ? '#065f46' : '#92400e'}>
                {detail.accessCodeUsed ? 'Used' : 'Unused'}
              </Badge>
              <button onClick={() => onRegenerate(detail.id)} style={{ ...btnSecondary, padding: '6px 12px', fontSize: 12 }}>Regenerate</button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ border: '1.5px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '8px 14px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Numbers ({assignedNumbers.length})
          </span>
          <button onClick={showAssignPicker ? () => setShowAssignPicker(false) : openPicker}
            style={{ background: showAssignPicker ? '#f3f4f6' : '#6366f1', color: showAssignPicker ? '#374151' : '#fff', border: 'none', borderRadius: 7, padding: '4px 11px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
            {showAssignPicker ? 'Cancel' : '+ Assign'}
          </button>
        </div>

        {/* Assign picker */}
        {showAssignPicker && (
          <div style={{ borderBottom: '1px solid #e5e7eb', background: '#fafafa', padding: 12 }}>
            {pickerLoading ? (
              <div style={{ color: '#9ca3af', fontSize: 13, padding: '6px 0' }}>Loading numbers…</div>
            ) : availableNumbers.length === 0 ? (
              <div style={{ color: '#9ca3af', fontSize: 13 }}>No available numbers to assign.</div>
            ) : (
              <>
                <div style={{ display: 'grid', gap: 6, marginBottom: 10 }}>
                  {availableNumbers.map(num => {
                    const alreadyAssigned = assignedSet.has(num.number);
                    const checked = selectedToAssign.some(n => n.number === num.number);
                    return (
                      <label key={num.number} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, cursor: alreadyAssigned ? 'default' : 'pointer',
                        background: alreadyAssigned ? '#f0fdf4' : checked ? '#ede9fe' : '#fff', border: `1px solid ${alreadyAssigned ? '#bbf7d0' : checked ? '#c4b5fd' : '#e5e7eb'}` }}>
                        <input type="checkbox" checked={checked || alreadyAssigned} disabled={alreadyAssigned}
                          onChange={() => !alreadyAssigned && toggleAssign(num)}
                          style={{ width: 15, height: 15, accentColor: '#6366f1', flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13 }}>{num.number}</span>
                          {num.countryCode && <span style={{ marginLeft: 7, background: '#ede9fe', color: '#5b21b6', borderRadius: 5, padding: '1px 6px', fontSize: 11, fontWeight: 700 }}>{num.countryCode}</span>}
                        </div>
                        {alreadyAssigned && <Badge bg="#d1fae5" color="#065f46">Already assigned</Badge>}
                      </label>
                    );
                  })}
                </div>
                <button onClick={handleAssign} disabled={assigning || !selectedToAssign.length}
                  style={{ ...btnPrimary('#6366f1'), padding: '8px 16px', fontSize: 13, opacity: selectedToAssign.length ? 1 : 0.5 }}>
                  {assigning ? 'Assigning…' : `Assign ${selectedToAssign.length ? `(${selectedToAssign.length})` : ''}`}
                </button>
              </>
            )}
          </div>
        )}

        {assignedNumbers.length === 0 && !showAssignPicker && (
          <div style={{ padding: '16px 14px', color: '#9ca3af', fontSize: 13 }}>No numbers assigned yet.</div>
        )}

        {assignedNumbers.map(n => (
          <div key={n.number} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 14px', borderBottom: '1px solid #f3f4f6' }}>
            <div>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13 }}>{n.number}</span>
              {n.areaCode && <span style={{ marginLeft: 8, background: '#ede9fe', color: '#5b21b6', borderRadius: 5, padding: '1px 6px', fontSize: 11, fontWeight: 700 }}>{n.areaCode}</span>}
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{n.callerName}</div>
            </div>
            <button onClick={() => handleUnassign(n.number)} disabled={unassigning === n.number}
              style={{ background: 'none', border: '1px solid #fca5a5', color: '#ef4444', borderRadius: 8, padding: '5px 11px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
              {unassigning === n.number ? '…' : 'Unassign'}
            </button>
          </div>
        ))}
      </div>

      <PackageSection detail={detail} onRefresh={onRefresh} isPhone={isPhone} />

      <div style={{ display: 'grid', gridTemplateColumns: isPhone ? '1fr' : 'repeat(2, 1fr)', gap: 10 }}>
        <StatCard label="Calls"     value={detail.stats.totalCalls}    sub={`${detail.stats.inboundCalls} in / ${detail.stats.outboundCalls} out`} />
        <StatCard label="Revenue"   value={`$${Math.round(detail.stats.revenue || 0).toLocaleString()}`} sub={`${detail.stats.recordings} recordings`} />
        <StatCard label="Minutes"   value={formatMinutesValue(detail.stats.totalMinutes)}  sub={`${detail.stats.avgDuration}s avg`} />
        <StatCard label="Connected" value={detail.stats.connectedCalls} sub={`${detail.campaigns.length} campaigns`} />
      </div>

      <div>
        <div style={{ fontWeight: 700, fontSize: 13, color: '#374151', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>World Call Map</div>
        <ProWorldMap data={(detail.topCountries || []).map(c => ({ id: c.id, value: c.calls }))} compact={isMobile} />
      </div>

      {detail.campaigns?.length > 0 && (
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#374151', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Campaigns ({detail.campaigns.length})</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {detail.campaigns.map(camp => {
              const modeStyle = CAMPAIGN_MODE_COLORS[camp.mode] || { bg: '#f3f4f6', color: '#374151', label: camp.mode };
              return (
                <div key={camp.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 12px', background: '#f9fafb', borderRadius: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{camp.name}</div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                      <span style={{ background: modeStyle.bg, color: modeStyle.color, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4 }}>{modeStyle.label}</span>
                      <Badge bg={camp.status === 'ACTIVE' ? '#d1fae5' : '#f3f4f6'} color={camp.status === 'ACTIVE' ? '#065f46' : '#6b7280'}>{camp.status}</Badge>
                      {camp.localPresence && <span style={{ background: '#fef3c7', color: '#92400e', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4 }}>Local Presence</span>}
                      {camp.record && <span style={{ background: '#ede9fe', color: '#5b21b6', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4 }}>Recording</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {detail.lists?.length > 0 && (
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#374151', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Lead Lists ({detail.lists.length})</div>
          <div style={{ display: 'grid', gap: 7 }}>
            {detail.lists.map(list => (
              <div key={list.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', background: '#f9fafb', borderRadius: 10 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{list.name}</div>
                <Badge bg="#ede9fe" color="#5b21b6">{list.leadCount} leads</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {detail.topAgents?.length > 0 && (
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#374151', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Top Agents</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {detail.topAgents.map(agent => (
              <div key={agent.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '10px 12px', background: '#f9fafb', borderRadius: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{agent.name}</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>{agent.email}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>{agent.calls}</div>
                  <div style={{ fontSize: 12, color: '#059669', fontWeight: 700 }}>${Math.round(agent.revenue || 0)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {detail.recentCalls?.length > 0 && (
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#374151', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recent Calls</div>
          <div style={{ display: 'grid', gap: 7, maxHeight: 220, overflowY: 'auto' }}>
            {detail.recentCalls.map(call => (
              <div key={call.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '9px 11px', background: '#f9fafb', borderRadius: 9 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{call.leadName}</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>{call.agentName} · {call.campaignName}</div>
                </div>
                <div style={{ textAlign: 'right', fontSize: 11, color: '#6b7280' }}>
                  <div style={{ textTransform: 'capitalize' }}>{call.direction}</div>
                  <div>{call.callStatus}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

const COUNTRY_NAMES = {
  '+1': 'United States / Canada', '+7': 'Russia', '+20': 'Egypt', '+27': 'South Africa',
  '+30': 'Greece', '+31': 'Netherlands', '+32': 'Belgium', '+33': 'France', '+34': 'Spain',
  '+36': 'Hungary', '+39': 'Italy', '+40': 'Romania', '+41': 'Switzerland', '+43': 'Austria',
  '+44': 'United Kingdom', '+45': 'Denmark', '+46': 'Sweden', '+47': 'Norway', '+48': 'Poland',
  '+49': 'Germany', '+51': 'Peru', '+52': 'Mexico', '+54': 'Argentina', '+55': 'Brazil',
  '+56': 'Chile', '+57': 'Colombia', '+60': 'Malaysia', '+61': 'Australia', '+62': 'Indonesia',
  '+63': 'Philippines', '+64': 'New Zealand', '+65': 'Singapore', '+66': 'Thailand',
  '+81': 'Japan', '+82': 'South Korea', '+84': 'Vietnam', '+86': 'China',
  '+90': 'Turkey', '+91': 'India', '+92': 'Pakistan', '+971': 'UAE', '+966': 'Saudi Arabia',
  '+972': 'Israel', '+961': 'Lebanon', '+964': 'Iraq', '+963': 'Syria',
  '+212': 'Morocco', '+213': 'Algeria', '+216': 'Tunisia', '+218': 'Libya',
};

function AssignNumberModal({ number, companies, onClose, onAssigned }) {
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAssign = async () => {
    if (!selectedCompanyId) return;
    setLoading(true);
    setError(null);
    const company = companies.find(c => c.id === selectedCompanyId);
    try {
      await fetchJson(`${API_URL}/superadmin/companies/${selectedCompanyId}/assign-numbers`, {
        method: 'POST',
        body: JSON.stringify({
          numberPool: [{ number: number.number, callerName: company?.name || '', areaCode: number.countryCode || '' }],
        }),
      });
      onAssigned();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={OVERLAY}>
      <div style={{ ...modal(420) }}>
        <h3 style={{ margin: '0 0 4px', fontSize: 17 }}>Assign Number</h3>
        <p style={{ color: '#6b7280', margin: '0 0 18px', fontSize: 13, fontFamily: 'monospace' }}>{number.number}</p>
        {error && <div style={{ background: '#fee2e2', color: '#991b1b', borderRadius: 8, padding: '9px 12px', marginBottom: 14, fontSize: 13 }}>{error}</div>}
        <label style={labelStyle}>Select Company</label>
        <select value={selectedCompanyId} onChange={e => setSelectedCompanyId(e.target.value)} style={{ ...inputStyle, marginBottom: 18 }}>
          <option value="">— Choose company —</option>
          {companies.map(c => (
            <option key={c.id} value={c.id}>{c.name} ({c.status})</option>
          ))}
        </select>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Cancel</button>
          <button onClick={handleAssign} disabled={!selectedCompanyId || loading}
            style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: selectedCompanyId ? '#2563eb' : '#93c5fd', color: '#fff', cursor: selectedCompanyId ? 'pointer' : 'not-allowed', fontWeight: 700, fontSize: 13 }}>
            {loading ? 'Assigning…' : 'Assign'}
          </button>
        </div>
      </div>
    </div>
  );
}

const SEARCH_COUNTRIES = [
  { code: 'US', name: 'United States' }, { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' }, { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' }, { code: 'FR', name: 'France' },
  { code: 'NL', name: 'Netherlands' }, { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' }, { code: 'DK', name: 'Denmark' },
  { code: 'ES', name: 'Spain' }, { code: 'IT', name: 'Italy' },
  { code: 'PL', name: 'Poland' }, { code: 'AT', name: 'Austria' },
  { code: 'CH', name: 'Switzerland' }, { code: 'BE', name: 'Belgium' },
  { code: 'PT', name: 'Portugal' }, { code: 'RO', name: 'Romania' },
  { code: 'CZ', name: 'Czech Republic' }, { code: 'HU', name: 'Hungary' },
  { code: 'MX', name: 'Mexico' }, { code: 'BR', name: 'Brazil' },
  { code: 'AR', name: 'Argentina' }, { code: 'CO', name: 'Colombia' },
  { code: 'CL', name: 'Chile' }, { code: 'PE', name: 'Peru' },
  { code: 'IL', name: 'Israel' }, { code: 'ZA', name: 'South Africa' },
  { code: 'NG', name: 'Nigeria' }, { code: 'KE', name: 'Kenya' },
  { code: 'PH', name: 'Philippines' }, { code: 'SG', name: 'Singapore' },
  { code: 'HK', name: 'Hong Kong' }, { code: 'TW', name: 'Taiwan' },
  { code: 'MY', name: 'Malaysia' }, { code: 'TH', name: 'Thailand' },
  { code: 'ID', name: 'Indonesia' }, { code: 'VN', name: 'Vietnam' },
];

function MessagingSetup() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 5000); };

  const load = useCallback(async () => {
    try {
      const data = await fetchJson(`${API_URL}/superadmin/messaging/profile`);
      setProfile(data);
    } catch { setProfile(null); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await fetchJson(`${API_URL}/superadmin/messaging/create-profile`, { method: 'POST', body: JSON.stringify({}) });
      showToast(`Profile created! ID: ${res.profileId}. Add TELNYX_MESSAGING_PROFILE_ID=${res.profileId} to .env`, true);
      load();
    } catch (err) {
      showToast(err.message || 'Failed to create profile', false);
    } finally {
      setCreating(false);
    }
  };

  const configured = profile?.hasConfigured;
  const bg = configured ? 'linear-gradient(135deg,#d1fae5 0%,#a7f3d0 100%)' : 'linear-gradient(135deg,#fef3c7 0%,#fde68a 100%)';
  const borderColor = configured ? '#10b981' : '#f59e0b';
  const iconBg = configured ? '#10b981' : '#f59e0b';

  return (
    <div style={{ background: '#fff', borderRadius: 14, border: `1.5px solid ${borderColor}`, overflow: 'hidden' }}>
      <div style={{ padding: '12px 18px', background: bg, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
          {configured ? '✅' : '⚠️'}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: '#1e293b' }}>SMS / Messaging Setup</div>
          <div style={{ fontSize: 12, color: '#475569', marginTop: 1 }}>
            {loading ? 'Checking profile…' : configured ? `Messaging profile configured — SMS/MMS ready` : 'No messaging profile configured — SMS/MMS disabled'}
          </div>
        </div>
        {!loading && !configured && (
          <button onClick={handleCreate} disabled={creating}
            style={{ background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 9, padding: '8px 16px', cursor: creating ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: 12, opacity: creating ? 0.7 : 1, whiteSpace: 'nowrap' }}>
            {creating ? 'Creating…' : '+ Create Profile'}
          </button>
        )}
      </div>
      {toast && (
        <div style={{ padding: '10px 18px', background: toast.ok ? '#d1fae5' : '#fee2e2', color: toast.ok ? '#065f46' : '#991b1b', fontSize: 12, fontWeight: 600 }}>
          {toast.msg}
        </div>
      )}
      {!loading && profile?.profiles?.length > 0 && (
        <div style={{ padding: '10px 18px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {profile.profiles.map(p => (
            <div key={p.id} style={{ background: p.isConfigured ? '#ede9fe' : '#f1f5f9', border: `1px solid ${p.isConfigured ? '#6366f1' : '#e2e8f0'}`, borderRadius: 8, padding: '6px 12px', fontSize: 12 }}>
              <span style={{ fontWeight: 700, color: p.isConfigured ? '#4f46e5' : '#374151' }}>{p.name}</span>
              <span style={{ color: '#6b7280', marginLeft: 6, fontFamily: 'monospace', fontSize: 11 }}>{p.id.slice(0, 8)}…</span>
              {p.isConfigured && <span style={{ marginLeft: 6, background: '#6366f1', color: '#fff', borderRadius: 4, padding: '1px 6px', fontSize: 10, fontWeight: 700 }}>ACTIVE</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SearchBuyNumbers({ onPurchased, messagingReady }) {
  const [country, setCountry] = useState('US');
  const [areaCode, setAreaCode] = useState('');
  const [numType, setNumType] = useState('local');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState(null);
  const [buying, setBuying] = useState(null);
  const [toast, setToast] = useState(null);
  const [selectedFeatures, setSelectedFeatures] = useState({});

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  };

  const toggleFeature = (phoneNumber, feature) => {
    setSelectedFeatures(prev => {
      const curr = prev[phoneNumber] || { voice: true, sms: false, mms: false };
      return { ...prev, [phoneNumber]: { ...curr, [feature]: !curr[feature] } };
    });
  };

  const getFeatures = (phoneNumber) => selectedFeatures[phoneNumber] || { voice: true, sms: false, mms: false };

  const handleSearch = async () => {
    setSearching(true);
    setResults(null);
    setSelectedFeatures({});
    try {
      const params = new URLSearchParams({ country });
      if (areaCode.trim()) params.set('areaCode', areaCode.trim());
      if (numType) params.set('type', numType);
      const data = await fetchJson(`${API_URL}/superadmin/numbers/available?${params}`);
      setResults(Array.isArray(data) ? data : []);
    } catch (err) {
      showToast(err.message || 'Search failed', false);
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleBuy = async (phoneNumber) => {
    const feats = getFeatures(phoneNumber);
    const featureList = Object.entries(feats).filter(([, v]) => v).map(([k]) => k);
    const wantsSms = feats.sms || feats.mms || feats.whatsapp;
    if (wantsSms && !messagingReady) {
      if (!window.confirm(`SMS/MMS/WhatsApp selected but no messaging profile configured — order will proceed for voice only.\n\nContinue?`)) return;
    }
    if (!window.confirm(`Buy ${phoneNumber}?\nFeatures: ${featureList.join(', ')}\n\nThis will charge your Telnyx account.`)) return;
    setBuying(phoneNumber);
    try {
      const res = await fetchJson(`${API_URL}/superadmin/numbers/order`, {
        method: 'POST',
        body: JSON.stringify({ phoneNumber, features: featureList }),
      });
      const extras = [];
      if (res.messagingEnabled) extras.push('SMS');
      if (res.whatsappEnabled) extras.push('WhatsApp');
      const extrasStr = extras.length ? ` + ${extras.join(' & ')} enabled` : '';
      showToast(`✓ ${phoneNumber} ordered! Status: ${res.status}${extrasStr}`, true);
      setResults(prev => prev ? prev.filter(r => r.phoneNumber !== phoneNumber) : prev);
      onPurchased();
    } catch (err) {
      showToast(err.message || 'Order failed', false);
    } finally {
      setBuying(null);
    }
  };

  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #6366f1', overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 20 }}>🛒</span>
        <div>
          <div style={{ fontWeight: 800, fontSize: 15, color: '#fff' }}>Search & Buy Numbers</div>
          <div style={{ fontSize: 12, color: '#c7d2fe', marginTop: 2 }}>Search available Telnyx numbers and purchase with feature selection</div>
        </div>
      </div>

      <div style={{ padding: '16px 20px' }}>
        {toast && (
          <div style={{ background: toast.ok ? '#d1fae5' : '#fee2e2', color: toast.ok ? '#065f46' : '#991b1b', borderRadius: 9, padding: '10px 14px', marginBottom: 14, fontSize: 13, fontWeight: 600 }}>
            {toast.msg}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 160px', minWidth: 140 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Country</div>
            <select value={country} onChange={e => setCountry(e.target.value)} style={{ ...inputStyle, marginBottom: 0 }}>
              {SEARCH_COUNTRIES.map(c => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: '1 1 120px', minWidth: 100 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Area Code</div>
            <input
              type="text" placeholder="e.g. 442" value={areaCode} onChange={e => setAreaCode(e.target.value.replace(/\D/g, ''))}
              style={{ ...inputStyle, marginBottom: 0 }} maxLength={6}
            />
          </div>
          <div style={{ flex: '1 1 120px', minWidth: 110 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Type</div>
            <select value={numType} onChange={e => setNumType(e.target.value)} style={{ ...inputStyle, marginBottom: 0 }}>
              <option value="local">Local</option>
              <option value="toll_free">Toll Free</option>
              <option value="mobile">Mobile</option>
            </select>
          </div>
          <button onClick={handleSearch} disabled={searching}
            style={{ padding: '10px 22px', borderRadius: 9, border: 'none', background: '#6366f1', color: '#fff', cursor: searching ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: 13, opacity: searching ? 0.7 : 1, whiteSpace: 'nowrap', height: 40 }}>
            {searching ? 'Searching…' : '🔍 Search'}
          </button>
        </div>

        {results !== null && (
          <div style={{ marginTop: 14 }}>
            {results.length === 0 ? (
              <div style={{ padding: '20px 0', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                No available numbers found. Try a different area code or type.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
                  {results.length} number{results.length !== 1 ? 's' : ''} available — select features before buying
                </div>
                {results.map(r => {
                  const feats = getFeatures(r.phoneNumber);
                  const smsCost = (feats.sms || feats.mms) ? 0.10 : 0;
                  const totalCost = (Number(r.monthlyCost) || 1.00) + smsCost;
                  return (
                    <div key={r.phoneNumber} style={{ padding: '12px 14px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 15, color: '#0f172a', flex: '1 1 160px' }}>
                          {r.phoneNumber}
                        </div>
                        <div style={{ display: 'flex', gap: 6, flex: '1 1 160px', flexWrap: 'wrap' }}>
                          {r.regionName && (
                            <span style={{ background: '#ede9fe', color: '#5b21b6', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{r.regionName}</span>
                          )}
                          <span style={{ background: '#f0fdf4', color: '#166534', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{r.type}</span>
                        </div>
                        <div style={{ fontSize: 12, color: '#0f172a', fontWeight: 700, whiteSpace: 'nowrap' }}>
                          ${totalCost.toFixed(2)}/mo
                          {smsCost > 0 && <span style={{ color: '#6b7280', fontWeight: 400 }}> (incl. SMS)</span>}
                        </div>
                        <button
                          onClick={() => handleBuy(r.phoneNumber)}
                          disabled={buying === r.phoneNumber}
                          style={{ background: buying === r.phoneNumber ? '#9ca3af' : '#10b981', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 16px', cursor: buying === r.phoneNumber ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: 12, whiteSpace: 'nowrap' }}>
                          {buying === r.phoneNumber ? 'Ordering…' : '🛒 Buy'}
                        </button>
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                        {[
                          { key: 'voice',     label: '📞 Voice',     locked: true,  color: '#6366f1' },
                          { key: 'sms',       label: '💬 SMS',       locked: false, color: '#6366f1' },
                          { key: 'mms',       label: '🖼 MMS',       locked: false, color: '#6366f1' },
                          { key: 'whatsapp',  label: '🟢 WhatsApp',  locked: false, color: '#25d366' },
                        ].map(({ key, label, locked, color }) => (
                          <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: locked ? 'default' : 'pointer', background: feats[key] ? (key === 'whatsapp' ? '#dcfce7' : '#ede9fe') : '#f1f5f9', border: `1px solid ${feats[key] ? color : '#e2e8f0'}`, borderRadius: 7, padding: '5px 11px', userSelect: 'none' }}>
                            <input
                              type="checkbox"
                              checked={!!feats[key]}
                              disabled={locked}
                              onChange={() => !locked && toggleFeature(r.phoneNumber, key)}
                              style={{ accentColor: color, cursor: locked ? 'default' : 'pointer' }}
                            />
                            <span style={{ fontSize: 12, fontWeight: 600, color: feats[key] ? (key === 'whatsapp' ? '#15803d' : '#4f46e5') : '#6b7280' }}>{label}</span>
                            {locked && <span style={{ fontSize: 10, color: '#9ca3af' }}>(always)</span>}
                            {!locked && (key === 'sms' || key === 'mms' || key === 'whatsapp') && !messagingReady && <span style={{ fontSize: 10, color: '#f59e0b' }}>⚠</span>}
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function NumbersTab({ isMobile = false, isPhone = false }) {
  const cached = cacheGet('tab:numbers');
  const [numbers, setNumbers] = useState(cached?.numbers || []);
  const [companies, setCompanies] = useState(cached?.companies || []);
  const [loading, setLoading] = useState(!cached);
  const [refreshing, setRefreshing] = useState(false);
  const [assignTarget, setAssignTarget] = useState(null);
  const [messagingReady, setMessagingReady] = useState(cached?.messagingReady ?? false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else if (!cacheGet('tab:numbers')) setLoading(true);
    try {
      const [numsResult, compsResult, msgResult] = await Promise.allSettled([
        fetchJson(`${API_URL}/superadmin/numbers`),
        fetchJson(`${API_URL}/superadmin/companies`),
        fetchJson(`${API_URL}/superadmin/messaging/profile`),
      ]);
      const nums = numsResult.status === 'fulfilled' ? (Array.isArray(numsResult.value) ? numsResult.value : []) : [];
      const comps = compsResult.status === 'fulfilled' ? (Array.isArray(compsResult.value) ? compsResult.value : []) : [];
      const msg = msgResult.status === 'fulfilled' ? msgResult.value : null;
      cachePut('tab:numbers', { numbers: nums, companies: comps, messagingReady: !!msg?.hasConfigured });
      setNumbers(nums);
      setCompanies(comps);
      setMessagingReady(!!msg?.hasConfigured);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { if (!cacheGet('tab:numbers')) load(); }, [load]);

  const free = numbers.filter(n => !n.assigned);
  const assigned = numbers.filter(n => n.assigned);

  return (
    <div style={{ display: 'grid', gap: 18, maxWidth: isMobile ? '100%' : 860 }}>
      {assignTarget && (
        <AssignNumberModal
          number={assignTarget}
          companies={companies}
          onClose={() => setAssignTarget(null)}
          onAssigned={() => { setAssignTarget(null); load(true); }}
        />
      )}

      <MessagingSetup />
      <SearchBuyNumbers onPurchased={() => setTimeout(() => load(true), 3000)} messagingReady={messagingReady} />

      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: '#1d4ed8', display: 'flex', alignItems: isPhone ? 'flex-start' : 'center', flexDirection: isPhone ? 'column' : 'row', gap: 10 }}>
        <span style={{ fontSize: 18 }}>📞</span>
        Your purchased Telnyx numbers — assign them to companies below.
        <button onClick={() => load(true)} disabled={refreshing}
          style={{ marginLeft: 'auto', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap' }}>
          {refreshing ? 'Refreshing…' : '↻ Refresh'}
        </button>
      </div>

      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ fontWeight: 800, fontSize: 15 }}>Telnyx Numbers</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Badge bg="#d1fae5" color="#065f46">{free.length} available</Badge>
            <Badge bg="#fee2e2" color="#991b1b">{assigned.length} assigned</Badge>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '28px 20px', color: '#9ca3af', fontSize: 13, textAlign: 'center' }}>Fetching from Telnyx…</div>
        ) : numbers.length === 0 ? (
          <div style={{ padding: '36px 20px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>📞</div>
            No numbers found on your Telnyx account.<br />
            <span style={{ fontSize: 12 }}>Purchase numbers on Telnyx then click Refresh.</span>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: isMobile ? 560 : '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['Number', 'Country', 'Status', 'Action'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, color: '#6b7280', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {numbers.map((n, i) => {
                const countryName = COUNTRY_NAMES[n.countryCode] || 'Unknown';
                return (
                  <tr key={n.number} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa', opacity: n.assigned ? 0.7 : 1 }}>
                    <td style={{ padding: '13px 16px', borderBottom: '1px solid #f3f4f6' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 14 }}>{n.number}</span>
                    </td>
                    <td style={{ padding: '13px 16px', borderBottom: '1px solid #f3f4f6' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ background: '#ede9fe', color: '#5b21b6', borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 700, fontFamily: 'monospace' }}>
                          {n.countryCode || '?'}
                        </span>
                        <span style={{ fontSize: 13, color: '#374151' }}>{countryName}</span>
                      </div>
                    </td>
                    <td style={{ padding: '13px 16px', borderBottom: '1px solid #f3f4f6' }}>
                      <Badge bg={n.assigned ? '#fee2e2' : '#d1fae5'} color={n.assigned ? '#991b1b' : '#065f46'}>
                        {n.assigned ? 'Assigned' : 'Available'}
                      </Badge>
                    </td>
                    <td style={{ padding: '13px 16px', borderBottom: '1px solid #f3f4f6' }}>
                      {!n.assigned && (
                        <button onClick={() => setAssignTarget(n)}
                          style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 7, padding: '6px 14px', cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>
                          Assign to Company
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}

function AnalyticsTab({ analytics, loading, isPhone = false }) {
  const [period, setPeriod] = useState('daily');

  const cards = useMemo(() => analytics
    .map(a => ({
      name: a.companyName,
      calls: a[period]?.calls || 0,
      minutes: a[period]?.totalMinutes || 0,
      connected: a[period]?.connectedCalls || 0,
      revenue: a[period]?.revenue || 0,
      inbound: a[period]?.inboundCalls || 0,
      outbound: a[period]?.outboundCalls || 0,
      recordings: a[period]?.recordings || 0,
      states: a[period]?.topStates || [],
    }))
    .sort((a, b) => b.calls - a.calls),
    [analytics, period]);

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {['daily', 'weekly', 'monthly'].map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            style={{ padding: '9px 18px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13,
              background: period === p ? '#111827' : '#f3f4f6',
              color: period === p ? '#fff' : '#374151' }}>
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      {loading
        ? <Placeholder>Loading analytics…</Placeholder>
        : cards.length === 0
        ? <Placeholder>No analytics data yet.</Placeholder>
        : (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${isPhone ? 220 : 290}px, 1fr))`, gap: 16 }}>
            {cards.map(c => (
              <div key={c.name} style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>{c.name}</div>
                    <div style={{ color: '#6b7280', fontSize: 12, marginTop: 2 }}>{c.calls} calls · {formatMinutesValue(c.minutes)} min</div>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#059669' }}>${Math.round(c.revenue).toLocaleString()}</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 14 }}>
                  {[
                    { label: 'Connected',  value: c.connected  },
                    { label: 'Recordings', value: c.recordings },
                    { label: 'Inbound',    value: c.inbound    },
                    { label: 'Outbound',   value: c.outbound   },
                  ].map(item => (
                    <div key={item.label} style={{ background: '#f9fafb', borderRadius: 10, padding: '9px 11px' }}>
                      <div style={{ color: '#6b7280', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{item.label}</div>
                      <div style={{ fontWeight: 800, fontSize: 16, marginTop: 3 }}>{item.value}</div>
                    </div>
                  ))}
                </div>

                {c.states?.length > 0 && (
                  <MiniBars data={c.states.slice(0, 5).map(s => ({ ...s, label: s.state }))} valueKey="calls" labelKey="label" color="#7c3aed" />
                )}
              </div>
            ))}
          </div>
        )
      }
    </div>
  );
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function Placeholder({ children }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', padding: '28px 20px', color: '#9ca3af', fontSize: 14 }}>
      {children}
    </div>
  );
}

function formatDuration(seconds) {
  const safeSeconds = sanitizeDurationSeconds(seconds);
  if (!Number.isFinite(safeSeconds) || safeSeconds <= 0) return '0s';
  const mins = Math.floor(safeSeconds / 60);
  const secs = Math.round(safeSeconds % 60);
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

function formatDateTime(value) {
  if (!value) return 'Unknown time';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown time';
  return date.toLocaleString();
}

function toAbsoluteMediaUrl(url) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const base = API_URL.replace(/\/api$/, '');
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
}

function triggerDownload(url, filename) {
  const absolute = toAbsoluteMediaUrl(url);
  if (!absolute) return;
  const anchor = document.createElement('a');
  anchor.href = absolute;
  anchor.download = filename || '';
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

function SectionHeader({ icon, title, count, countBg, countColor }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 18 }}>{icon}</span>
      <span style={{ fontWeight: 800, fontSize: 16, color: '#111827' }}>{title}</span>
      {count > 0 && <Badge bg={countBg} color={countColor}>{count}</Badge>}
    </div>
  );
}

function RecordingsTab({ isPhone = false }) {
  const [data, setData] = useState({ items: [], companies: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ accountId: '', search: '', from: '', to: '' });
  const [transcripts, setTranscripts] = useState({});
  const [transcriptLoading, setTranscriptLoading] = useState({});
  const [transcriptErrors, setTranscriptErrors] = useState({});

  const loadRecordings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', '300');
      if (filters.accountId) params.set('accountId', filters.accountId);
      if (filters.search.trim()) params.set('search', filters.search.trim());
      if (filters.from) params.set('from', filters.from);
      if (filters.to) params.set('to', filters.to);

      const response = await fetchJson(`${API_URL}/superadmin/recordings?${params.toString()}`);
      setData({
        items: Array.isArray(response?.items) ? response.items : [],
        companies: Array.isArray(response?.companies) ? response.companies : [],
        total: Number(response?.total) || 0,
      });
    } catch {
      setData({ items: [], companies: [], total: 0 });
    } finally {
      setLoading(false);
    }
  }, [filters.accountId, filters.from, filters.search, filters.to]);

  useEffect(() => {
    loadRecordings();
  }, [loadRecordings]);

  const visibleDownloads = useMemo(() => (
    data.items.flatMap((item) => {
      const files = [];
      if (item.recordingUrl) files.push({ url: item.recordingUrl, filename: `${item.companyName}-${item.id}-recording.mp3` });
      if (item.vmRecordingUrl) files.push({ url: item.vmRecordingUrl, filename: `${item.companyName}-${item.id}-voicemail.mp3` });
      return files;
    })
  ), [data.items]);

  const handleBulkDownload = useCallback(() => {
    visibleDownloads.forEach((file, index) => {
      window.setTimeout(() => triggerDownload(file.url, file.filename), index * 250);
    });
  }, [visibleDownloads]);

  const handleTranscribe = useCallback(async (item, source = 'recording') => {
    const key = `${item.id}:${source}`;
    if (transcriptLoading[key] || transcripts[key]) return;

    setTranscriptLoading((prev) => ({ ...prev, [key]: true }));
    setTranscriptErrors((prev) => ({ ...prev, [key]: '' }));

    try {
      const response = await fetchJson(`${API_URL}/superadmin/recordings/${item.id}/transcribe`, {
        method: 'POST',
        body: JSON.stringify({ source }),
      });
      setTranscripts((prev) => ({ ...prev, [key]: response?.text || '' }));
    } catch (error) {
      setTranscriptErrors((prev) => ({ ...prev, [key]: error.message || 'Transcription failed.' }));
    } finally {
      setTranscriptLoading((prev) => ({ ...prev, [key]: false }));
    }
  }, [transcriptLoading, transcripts]);

  // group items by company for the "All" view
  const groupedByCompany = useMemo(() => {
    if (filters.accountId) return null; // single company selected — no grouping needed
    const map = new Map();
    data.items.forEach((item) => {
      const key = item.companyId || item.companyName || 'Unknown';
      if (!map.has(key)) map.set(key, { companyName: item.companyName || 'Unknown', items: [] });
      map.get(key).items.push(item);
    });
    return Array.from(map.values());
  }, [data.items, filters.accountId]);

  const RecordingCard = ({ item }) => {
    const fullUrl = toAbsoluteMediaUrl(item.recordingUrl);
    const vmUrl   = toAbsoluteMediaUrl(item.vmRecordingUrl);
    const recordingKey = `${item.id}:recording`;
    const vmKey = `${item.id}:voicemail`;
    const recordingTranscript = transcripts[recordingKey];
    const voicemailTranscript = transcripts[vmKey];
    const recordingError = transcriptErrors[recordingKey];
    const voicemailError = transcriptErrors[vmKey];
    const recordingBusy = !!transcriptLoading[recordingKey];
    const voicemailBusy = !!transcriptLoading[vmKey];
    return (
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 16, marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>
              {item.agentName || 'Unknown Agent'}
              <span style={{ fontWeight: 400, color: '#6b7280', fontSize: 12, marginLeft: 8 }}>
                {item.leadName && `${item.leadName} • `}{item.leadPhone || item.toNumber || item.fromNumber || 'Unknown number'}
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{formatDateTime(item.startedAt)}</div>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <Badge bg="#eef2ff" color="#4338ca">{item.direction || 'outbound'}</Badge>
            <Badge bg="#ecfdf5" color="#047857">{item.callStatus}</Badge>
            <Badge bg="#f8fafc" color="#475569">{formatDuration(item.durationSeconds)}</Badge>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 10 }}>
          {/* Main recording */}
          <div style={{ background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0', padding: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 11, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              Full Call Recording
            </div>
            {fullUrl ? (
              <>
                <audio
                  controls
                  preload="metadata"
                  src={fullUrl}
                  onPlay={() => handleTranscribe(item, 'recording')}
                  style={{ width: '100%', height: 36 }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, flexWrap: 'wrap', gap: 8 }}>
                  <span style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>
                    {item.fromNumber || '?'} → {item.toNumber || '?'}
                  </span>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      onClick={() => handleTranscribe(item, 'recording')}
                      disabled={recordingBusy}
                      style={{ ...btnSecondary, padding: '6px 12px', fontSize: 11, opacity: recordingBusy ? 0.7 : 1 }}
                    >
                      {recordingBusy ? 'Transcribing…' : recordingTranscript ? 'Transcript Ready' : 'Transcribe'}
                    </button>
                    <button onClick={() => triggerDownload(fullUrl, `${item.companyName}-${item.id}-recording.mp3`)}
                      style={{ ...btnSecondary, padding: '6px 12px', fontSize: 11 }}>
                      ⬇ Download
                    </button>
                  </div>
                </div>
                {(recordingTranscript || recordingError) && (
                  <div style={{ marginTop: 10, background: '#ffffff', border: '1px solid #dbe4f0', borderRadius: 10, padding: 12 }}>
                    <div style={{ fontWeight: 700, fontSize: 11, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                      Transcript
                    </div>
                    <div style={{ fontSize: 13, lineHeight: 1.6, color: recordingError ? '#b91c1c' : '#0f172a', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                      {recordingError || recordingTranscript}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div style={{ fontSize: 12, color: '#94a3b8' }}>No call recording saved.</div>
            )}
          </div>

          {/* Voicemail */}
          {vmUrl && (
            <div style={{ background: '#faf5ff', borderRadius: 10, border: '1px solid #e9d5ff', padding: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 11, color: '#6b21a8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                Voicemail Drop
              </div>
              <audio
                controls
                preload="metadata"
                src={vmUrl}
                onPlay={() => handleTranscribe(item, 'voicemail')}
                style={{ width: '100%', height: 36 }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, gap: 8, flexWrap: 'wrap' }}>
                <button
                  onClick={() => handleTranscribe(item, 'voicemail')}
                  disabled={vmBusy}
                  style={{ ...btnSecondary, padding: '6px 12px', fontSize: 11, opacity: vmBusy ? 0.7 : 1 }}
                >
                  {vmBusy ? 'Transcribing…' : voicemailTranscript ? 'Transcript Ready' : 'Transcribe Voicemail'}
                </button>
                <button onClick={() => triggerDownload(vmUrl, `${item.companyName}-${item.id}-voicemail.mp3`)}
                  style={{ ...btnSecondary, padding: '6px 12px', fontSize: 11 }}>
                  ⬇ Download Voicemail
                </button>
              </div>
              {(voicemailTranscript || voicemailError) && (
                <div style={{ marginTop: 10, background: '#ffffff', border: '1px solid #ead7ff', borderRadius: 10, padding: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: 11, color: '#6b21a8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                    Voicemail Transcript
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.6, color: voicemailError ? '#b91c1c' : '#0f172a', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                    {voicemailError || voicemailTranscript}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>

      {/* ── Company Capsule Chips ───────────────────────────── */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 18 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
          Filter by Company
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
          {/* All chip */}
          <button
            onClick={() => setFilters((p) => ({ ...p, accountId: '' }))}
            style={{
              padding: '6px 16px', borderRadius: 20, border: '2px solid',
              borderColor: !filters.accountId ? '#4f46e5' : '#e5e7eb',
              background: !filters.accountId ? '#4f46e5' : '#f8fafc',
              color: !filters.accountId ? '#fff' : '#374151',
              fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            All Companies ({data.total})
          </button>
          {data.companies.map((company) => {
            const active = filters.accountId === (company.accountId || '');
            return (
              <button
                key={company.accountId || company.companyName}
                onClick={() => setFilters((p) => ({ ...p, accountId: company.accountId || '' }))}
                style={{
                  padding: '6px 16px', borderRadius: 20, border: '2px solid',
                  borderColor: active ? '#4f46e5' : '#e5e7eb',
                  background: active ? '#4f46e5' : '#fff',
                  color: active ? '#fff' : '#374151',
                  fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                {company.companyName}
                <span style={{
                  background: active ? 'rgba(255,255,255,0.25)' : '#e5e7eb',
                  color: active ? '#fff' : '#6b7280',
                  borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700,
                }}>
                  {company.recordings}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search + Date filters */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 220px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: 5 }}>Search</div>
            <input value={filters.search} onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
              placeholder="Phone, lead, agent, company…" style={{ ...inputStyle, marginBottom: 0 }} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: 5 }}>From</div>
            <input type="date" value={filters.from} onChange={(e) => setFilters((p) => ({ ...p, from: e.target.value }))}
              style={{ ...inputStyle, width: isPhone ? '100%' : 145, marginBottom: 0 }} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: 5 }}>To</div>
            <input type="date" value={filters.to} onChange={(e) => setFilters((p) => ({ ...p, to: e.target.value }))}
              style={{ ...inputStyle, width: isPhone ? '100%' : 145, marginBottom: 0 }} />
          </div>
          <button onClick={loadRecordings} style={{ ...btnPrimary('#4f46e5'), padding: '10px 18px' }}>Refresh</button>
          <button onClick={handleBulkDownload} disabled={!visibleDownloads.length}
            style={{ ...btnPrimary('#059669'), padding: '10px 18px', opacity: visibleDownloads.length ? 1 : 0.55 }}>
            Bulk Download ({visibleDownloads.length})
          </button>
        </div>
      </div>

      {/* ── Recordings list ─────────────────────────────────── */}
      {loading ? (
        <Placeholder>Loading recordings…</Placeholder>
      ) : data.items.length === 0 ? (
        <Placeholder>No recordings found.</Placeholder>
      ) : filters.accountId ? (
        /* Single company selected — flat list */
        <div>
          {data.items.map((item) => <RecordingCard key={item.id} item={item} />)}
        </div>
      ) : (
        /* All companies — grouped by company */
        <div style={{ display: 'grid', gap: 20 }}>
          {(groupedByCompany || []).map(({ companyName, items }) => (
            <div key={companyName} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, overflow: 'hidden' }}>
              {/* Company header — clickable to filter */}
              <div
                onClick={() => {
                  const co = data.companies.find((c) => c.companyName === companyName);
                  if (co) setFilters((p) => ({ ...p, accountId: co.accountId || '' }));
                }}
                style={{
                  padding: '14px 18px', background: 'linear-gradient(135deg,#1e3a8a,#4f46e5)',
                  display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                }}
              >
                <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: '4px 12px', fontWeight: 800, fontSize: 15, color: '#fff' }}>
                  {companyName}
                </div>
                <span style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: '2px 10px', fontSize: 12, color: '#fff', fontWeight: 600 }}>
                  {items.length} recording{items.length !== 1 ? 's' : ''}
                </span>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>Click to filter →</span>
              </div>
              <div style={{ padding: '14px 18px' }}>
                {items.map((item) => <RecordingCard key={item.id} item={item} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Billing Tab ─────────────────────────────────────────────────────────────

const COUNTRY_FLAGS = {
  US:'🇺🇸', GB:'🇬🇧', AU:'🇦🇺', DE:'🇩🇪', FR:'🇫🇷', NL:'🇳🇱', SE:'🇸🇪', NO:'🇳🇴',
  DK:'🇩🇰', BE:'🇧🇪', PL:'🇵🇱', CH:'🇨🇭', AT:'🇦🇹', ES:'🇪🇸', IT:'🇮🇹', CA:'🇨🇦',
  BR:'🇧🇷', MX:'🇲🇽', IN:'🇮🇳', PK:'🇵🇰', AE:'🇦🇪', SA:'🇸🇦', IL:'🇮🇱', NZ:'🇳🇿',
  SG:'🇸🇬', JP:'🇯🇵', KR:'🇰🇷', CN:'🇨🇳', INBOUND:'📥', OTHER:'🌐',
};

function CountryBreakdown({ breakdown }) {
  if (!breakdown?.length) return <div style={{ padding: '10px 18px', color: '#9ca3af', fontSize: 12 }}>No call data</div>;
  return (
    <div style={{ padding: '12px 18px 16px', background: '#f8fafc', borderTop: '1px solid #e5e7eb' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
        Country-wise Call Breakdown
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#f1f5f9' }}>
              {['Country', 'Calls', 'Minutes', 'Telnyx Rate', 'Telnyx Cost', 'Your Rate', 'You Charge', 'Profit', 'Margin'].map(h => (
                <th key={h} style={{ padding: '7px 10px', textAlign: 'left', fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {breakdown.map((b, i) => {
              const margin = b.sellCost > 0 ? ((b.profit / b.sellCost) * 100).toFixed(0) : null;
              const marginColor = margin >= 45 ? '#059669' : margin >= 30 ? '#d97706' : '#dc2626';
              return (
                <tr key={b.country} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: 16, marginRight: 6 }}>{COUNTRY_FLAGS[b.country] || '🌐'}</span>
                    <span style={{ fontWeight: 600 }}>{b.countryName}</span>
                  </td>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid #f1f5f9', color: '#374151' }}>{b.calls}</td>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid #f1f5f9', color: '#374151' }}>{b.minutes}</td>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid #f1f5f9', color: '#6b7280', fontFamily: 'monospace' }}>${b.telnyxRate}/min</td>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid #f1f5f9', color: '#dc2626', fontWeight: 700 }}>${b.telnyxCost?.toFixed(4)}</td>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid #f1f5f9', color: '#059669', fontFamily: 'monospace', fontWeight: 700 }}>${b.sellRate}/min</td>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid #f1f5f9', color: '#059669', fontWeight: 800 }}>${b.sellCost?.toFixed(4)}</td>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid #f1f5f9', color: b.profit >= 0 ? '#059669' : '#dc2626', fontWeight: 700 }}>${b.profit?.toFixed(4)}</td>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid #f1f5f9' }}>
                    {margin !== null
                      ? <span style={{ background: margin >= 45 ? '#d1fae5' : margin >= 30 ? '#fef3c7' : '#fee2e2', color: marginColor, borderRadius: 20, padding: '2px 7px', fontWeight: 700, fontSize: 11 }}>{margin}%</span>
                      : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BillingTab({ isMobile = false, isPhone = false }) {
  const [data, setData] = useState(() => cacheGet('tab:billing'));
  const [loading, setLoading] = useState(!cacheGet('tab:billing'));
  const [expanded, setExpanded] = useState({});

  const load = useCallback((isRefresh = false) => {
    if (isRefresh || !cacheGet('tab:billing')) setLoading(true);
    fetchJson(`${API_URL}/superadmin/billing-summary`)
      .then(d => { cachePut('tab:billing', d); setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { if (!cacheGet('tab:billing')) load(); }, [load]);

  if (loading) return <Placeholder>Loading billing data…</Placeholder>;
  if (!data) return <Placeholder>Failed to load billing data.</Placeholder>;

  const { summary, companies, month, rates, sellRates } = data;
  const pkgColors = { Trial:'#6366f1', Basic:'#3b82f6', Pro:'#8b5cf6', Business:'#f59e0b', Enterprise:'#10b981' };

  const SummaryCard = ({ label, value, sub, color = '#111827', bg = '#f9fafb' }) => (
    <div style={{ background: bg, border: '1.5px solid #e5e7eb', borderRadius: 14, padding: '18px 20px', minWidth: 0 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 900, color, letterSpacing: '-0.5px' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{sub}</div>}
    </div>
  );

  return (
    <div style={{ display: 'grid', gap: 20 }}>

      {/* Month header */}
      <div style={{ display: 'flex', alignItems: isPhone ? 'flex-start' : 'center', justifyContent: 'space-between', flexDirection: isPhone ? 'column' : 'row', gap: 12 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 18, color: '#111827' }}>Billing Summary — {month}</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
            US→US ${rates.usOutboundPerMin}/min · US→UK ${rates.ukOutboundPerMin}/min · Intl ${rates.intlOutboundPerMin}/min · Inbound ${rates.usInboundPerMin}/min · SMS ${rates.smsOutbound}/msg
          </div>
        </div>
        <button onClick={load} style={{ ...btnSecondary, padding: '8px 16px', fontSize: 12 }}>↻ Refresh</button>
      </div>

      {/* Summary cards — two rows */}
      <div style={{ display: 'grid', gap: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          📦 Flat Package Revenue
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: isPhone ? '1fr' : isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 12 }}>
          <SummaryCard label="Package Revenue" value={`$${summary.totalRevenue.toLocaleString()}`}
            sub={`${companies.length} active companies`} color="#059669" bg="#f0fdf4" />
          <SummaryCard label="Telnyx Cost" value={`$${summary.totalTelnyxCost.toFixed(2)}`}
            sub={`${summary.totalCalls} calls · ${summary.totalSms} SMS`} color="#dc2626" bg="#fef2f2" />
          <SummaryCard label="Pkg Net Profit" value={`$${summary.totalNetProfit.toFixed(2)}`}
            sub="Package − Telnyx cost" color={summary.totalNetProfit >= 0 ? '#059669' : '#dc2626'}
            bg={summary.totalNetProfit >= 0 ? '#f0fdf4' : '#fef2f2'} />
          <SummaryCard label="Pkg Margin" value={`${summary.overallMargin}%`}
            sub="Flat package margin" color={summary.overallMargin >= 50 ? '#059669' : summary.overallMargin >= 30 ? '#d97706' : '#dc2626'}
            bg={summary.overallMargin >= 50 ? '#f0fdf4' : summary.overallMargin >= 30 ? '#fffbeb' : '#fef2f2'} />
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 6 }}>
          ⏱ Per-Minute Usage Billing (if charged per-use)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: isPhone ? '1fr' : isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 12 }}>
          <SummaryCard label="Usage Bill Total" value={`$${summary.totalUsageBill?.toFixed(2) || '0.00'}`}
            sub="Sum of per-minute charges" color="#2563eb" bg="#eff6ff" />
          <SummaryCard label="Telnyx Cost" value={`$${summary.totalTelnyxCost.toFixed(2)}`}
            sub="Same Telnyx cost" color="#dc2626" bg="#fef2f2" />
          <SummaryCard label="Usage Profit" value={`$${summary.totalUsageProfit?.toFixed(2) || '0.00'}`}
            sub="Usage bill − Telnyx" color={(summary.totalUsageProfit || 0) >= 0 ? '#059669' : '#dc2626'}
            bg={(summary.totalUsageProfit || 0) >= 0 ? '#f0fdf4' : '#fef2f2'} />
          <SummaryCard label="Usage Margin" value={`${summary.usageMargin || 0}%`}
            sub="Per-minute margin" color={(summary.usageMargin || 0) >= 45 ? '#059669' : (summary.usageMargin || 0) >= 30 ? '#d97706' : '#dc2626'}
            bg={(summary.usageMargin || 0) >= 45 ? '#f0fdf4' : (summary.usageMargin || 0) >= 30 ? '#fffbeb' : '#fef2f2'} />
        </div>
      </div>

      {/* Per-company table */}
      <div style={{ background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '12px 18px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', fontWeight: 700, fontSize: 12, color: '#374151' }}>
          Per-Company Breakdown — click row to see country detail
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['','Company','Package','Pkg Price','Usage Bill','Calls','Call Cost','SMS','SMS Cost','Numbers','Num Cost','Telnyx Total','Pkg Profit','Pkg %','Usage Profit','Usage %'].map(h => (
                  <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 10, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {companies.length === 0 && (
                <tr><td colSpan={13} style={{ padding: 24, color: '#9ca3af', textAlign: 'center' }}>No active companies this month.</td></tr>
              )}
              {companies.map((c, i) => {
                const pkgClr = pkgColors[c.packageName] || '#9ca3af';
                const profitClr = c.netProfit >= 0 ? '#059669' : '#dc2626';
                const marginClr = c.margin >= 50 ? '#059669' : c.margin >= 30 ? '#d97706' : '#dc2626';
                const isExpanded = !!expanded[c.id];
                return (
                  <>
                    <tr key={c.id}
                      onClick={() => setExpanded(prev => ({ ...prev, [c.id]: !prev[c.id] }))}
                      style={{ background: isExpanded ? '#f0f9ff' : i % 2 === 0 ? '#fff' : '#fafafa', cursor: 'pointer' }}>
                      <td style={{ padding: '10px 8px 10px 14px', borderBottom: isExpanded ? 'none' : '1px solid #f3f4f6' }}>
                        <span style={{ fontSize: 10, color: '#6366f1' }}>{isExpanded ? '▼' : '▶'}</span>
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: isExpanded ? 'none' : '1px solid #f3f4f6', fontWeight: 700 }}>{c.name}</td>
                      <td style={{ padding: '10px 12px', borderBottom: isExpanded ? 'none' : '1px solid #f3f4f6' }}>
                        {c.packageName
                          ? <span style={{ background: `${pkgClr}18`, color: pkgClr, border: `1px solid ${pkgClr}40`, borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 800 }}>{c.packageName}</span>
                          : <span style={{ color: '#d1d5db' }}>—</span>}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: isExpanded ? 'none' : '1px solid #f3f4f6', fontWeight: 700, color: '#059669' }}>${c.packagePrice}</td>
                      <td style={{ padding: '10px 12px', borderBottom: isExpanded ? 'none' : '1px solid #f3f4f6', fontWeight: 800, color: '#2563eb' }}>
                        ${(c.usageBill || 0).toFixed(3)}
                        <div style={{ fontSize: 9, color: '#93c5fd' }}>per-min total</div>
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: isExpanded ? 'none' : '1px solid #f3f4f6' }}>
                        {c.totalCalls}
                        <div style={{ fontSize: 10, color: '#9ca3af' }}>{formatMinutesValue(c.totalCallMinutes)} min</div>
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: isExpanded ? 'none' : '1px solid #f3f4f6', color: '#dc2626' }}>${c.callCost.toFixed(3)}</td>
                      <td style={{ padding: '10px 12px', borderBottom: isExpanded ? 'none' : '1px solid #f3f4f6' }}>{c.smsCount}</td>
                      <td style={{ padding: '10px 12px', borderBottom: isExpanded ? 'none' : '1px solid #f3f4f6', color: '#dc2626' }}>${c.smsCost.toFixed(3)}</td>
                      <td style={{ padding: '10px 12px', borderBottom: isExpanded ? 'none' : '1px solid #f3f4f6' }}>
                        {c.numbers}
                        {c.ukNumbers > 0 && <div style={{ fontSize: 9, color: '#1d4ed8' }}>🇬🇧 {c.ukNumbers} UK · 🇺🇸 {c.usNumbers} US</div>}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: isExpanded ? 'none' : '1px solid #f3f4f6', color: '#dc2626' }}>${c.numCost.toFixed(2)}</td>
                      <td style={{ padding: '10px 12px', borderBottom: isExpanded ? 'none' : '1px solid #f3f4f6', fontWeight: 700, color: '#dc2626' }}>${c.totalTelnyxCost.toFixed(3)}</td>
                      <td style={{ padding: '10px 12px', borderBottom: isExpanded ? 'none' : '1px solid #f3f4f6', fontWeight: 800, color: profitClr }}>${c.netProfit.toFixed(2)}</td>
                      <td style={{ padding: '10px 12px', borderBottom: isExpanded ? 'none' : '1px solid #f3f4f6' }}>
                        {c.margin !== null
                          ? <span style={{ background: c.margin >= 50 ? '#d1fae5' : c.margin >= 30 ? '#fef3c7' : '#fee2e2', color: marginClr, borderRadius: 20, padding: '2px 8px', fontWeight: 700, fontSize: 11 }}>{c.margin}%</span>
                          : <span style={{ color: '#d1d5db' }}>—</span>}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: isExpanded ? 'none' : '1px solid #f3f4f6', fontWeight: 800, color: (c.usageProfit || 0) >= 0 ? '#059669' : '#dc2626' }}>
                        ${(c.usageProfit || 0).toFixed(2)}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: isExpanded ? 'none' : '1px solid #f3f4f6' }}>
                        {c.usageMargin !== null
                          ? <span style={{ background: c.usageMargin >= 45 ? '#d1fae5' : c.usageMargin >= 30 ? '#fef3c7' : '#fee2e2', color: c.usageMargin >= 45 ? '#065f46' : c.usageMargin >= 30 ? '#92400e' : '#991b1b', borderRadius: 20, padding: '2px 8px', fontWeight: 700, fontSize: 11 }}>{c.usageMargin}%</span>
                          : <span style={{ color: '#d1d5db' }}>—</span>}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${c.id}-breakdown`}>
                        <td colSpan={13} style={{ padding: 0, borderBottom: '1px solid #e5e7eb' }}>
                          <CountryBreakdown breakdown={c.countryBreakdown} />
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
            {companies.length > 0 && (
              <tfoot>
                <tr style={{ background: '#1f2937' }}>
                  <td colSpan={3} style={{ padding: '11px 12px', fontWeight: 800, color: '#fff', fontSize: 12 }}>TOTAL</td>
                  <td style={{ padding: '11px 12px', fontWeight: 800, color: '#6ee7b7' }}>${summary.totalRevenue.toFixed(2)}</td>
                  <td style={{ padding: '11px 12px', color: '#9ca3af' }}>{summary.totalCalls}</td>
                  <td colSpan={4} style={{ padding: '11px 12px', color: '#fca5a5', fontWeight: 700 }}>Telnyx: ${summary.totalTelnyxCost.toFixed(2)}</td>
                  <td style={{ padding: '11px 12px' }}></td>
                  <td style={{ padding: '11px 12px', fontWeight: 800, color: '#fca5a5' }}>${summary.totalTelnyxCost.toFixed(2)}</td>
                  <td style={{ padding: '11px 12px', fontWeight: 900, color: summary.totalNetProfit >= 0 ? '#6ee7b7' : '#fca5a5', fontSize: 13 }}>${summary.totalNetProfit.toFixed(2)}</td>
                  <td style={{ padding: '11px 12px', fontWeight: 800, color: '#fbbf24' }}>{summary.overallMargin}%</td>
                  <td style={{ padding: '11px 12px' }}></td>
                  <td style={{ padding: '11px 12px' }}></td>
                  <td style={{ padding: '11px 12px' }}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Rates reference — two columns: cost vs sell */}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '14px 18px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 10, textTransform: 'uppercase' }}>Rate Card</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                {['Call Type', 'Telnyx Cost (you pay)', 'Your Sell Price', 'Margin'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rates && sellRates && [
                ['🇺🇸 US→US Outbound',  rates.usOutboundPerMin,      sellRates.usOutboundPerMin,    'min'],
                ['🇬🇧 US→UK Outbound',  rates.ukOutboundPerMin,      sellRates.ukOutboundPerMin,    'min'],
                ['🌐 Intl Outbound',     rates.intlOutboundPerMin,    sellRates.intlOutboundPerMin,  'min'],
                ['📥 Inbound',           rates.usInboundPerMin,       sellRates.inboundPerMin,       'min'],
                ['🎙 Recording add-on',  rates.recordPerMin,          sellRates.recordPerMin,        'min'],
                ['💬 SMS Outbound',      rates.smsOutbound,           sellRates.smsOutbound,         'msg'],
                ['💬 SMS Inbound',       rates.smsInbound,            sellRates.smsInbound,          'msg'],
                ['🇺🇸 US Number',        rates.usNumberPerMonth,      sellRates.usNumberPerMonth,    'mo'],
                ['🇬🇧 UK Number',        rates.ukNumberPerMonth,      sellRates.ukNumberPerMonth,    'mo'],
              ].map(([label, cost, sell, unit], i) => {
                const margin = sell > 0 ? Math.round(((sell - cost) / sell) * 100) : 0;
                return (
                  <tr key={label} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                    <td style={{ padding: '9px 12px', borderBottom: '1px solid #f1f5f9', fontWeight: 600 }}>{label}</td>
                    <td style={{ padding: '9px 12px', borderBottom: '1px solid #f1f5f9', color: '#dc2626', fontFamily: 'monospace', fontWeight: 700 }}>${cost}/{unit}</td>
                    <td style={{ padding: '9px 12px', borderBottom: '1px solid #f1f5f9', color: '#059669', fontFamily: 'monospace', fontWeight: 800 }}>${sell}/{unit}</td>
                    <td style={{ padding: '9px 12px', borderBottom: '1px solid #f1f5f9' }}>
                      <span style={{ background: margin >= 45 ? '#d1fae5' : margin >= 30 ? '#fef3c7' : '#fee2e2', color: margin >= 45 ? '#065f46' : margin >= 30 ? '#92400e' : '#991b1b', borderRadius: 20, padding: '2px 8px', fontWeight: 700, fontSize: 11 }}>{margin}%</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export default function SuperAdmin() {
  const navigate = useNavigate();
  const { disconnectForLogout } = useSocket();
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1440,
  );
  const [tab, setTab] = useState('dashboard');
  const [companies, setCompanies] = useState(() => cacheGet('main:companies') || []);
  const [overview, setOverview] = useState(() => cacheGet('main:overview'));
  const [analytics, setAnalytics] = useState(() => cacheGet('main:analytics') || []);
  const [loading, setLoading] = useState(!cacheGet('main:companies'));
  const [overviewLoading, setOverviewLoading] = useState(!cacheGet('main:overview'));
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [approveModal, setApproveModal] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);

  const loadDashboard = useCallback(async () => {
    const hasCompanies = !!cacheGet('main:companies');
    const hasOverview = !!cacheGet('main:overview');
    if (!hasCompanies) setLoading(true);
    if (!hasOverview) setOverviewLoading(true);
    try {
      const d = await fetchJson(`${API_URL}/superadmin/dashboard`);
      const result = Array.isArray(d.companies) ? d.companies : [];
      cachePut('main:companies', result);
      cachePut('main:overview', d.overview);
      setCompanies(result);
      setOverview(d.overview);
      setLoadError('');
    } catch (error) {
      console.error('Failed to load super admin dashboard', error);
      if (!cacheGet('main:companies')) setCompanies([]);
      setLoadError('Super Admin data is temporarily unavailable. Please refresh in a moment.');
    } finally {
      setLoading(false);
      setOverviewLoading(false);
    }
  }, []);

  const loadAnalytics = useCallback(async () => {
    if (!cacheGet('main:analytics')) setAnalyticsLoading(true);
    try {
      const d = await fetchJson(`${API_URL}/superadmin/analytics`);
      const result = Array.isArray(d) ? d : [];
      cachePut('main:analytics', result);
      setAnalytics(result);
    }
    finally { setAnalyticsLoading(false); }
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);
  useEffect(() => { if (tab === 'analytics' && !cacheGet('main:analytics')) loadAnalytics(); }, [tab, loadAnalytics]);
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleToggle = async (company) => {
    const ep = company.status === 'ACTIVE' ? 'deactivate' : 'activate';
    await fetchJson(`${API_URL}/superadmin/companies/${company.id}/${ep}`, { method: 'POST' });
    await loadDashboard();
  };

  const handleDelete = async (company) => {
    const confirmed = window.confirm(
      `PERMANENTLY DELETE "${company.name}"?\n\nYeh delete ho ga:\n• Sare agents aur admins\n• Sare leads, campaigns, call logs\n• Sare SMS messages\n\nPhone numbers free ho jayen ge.\nYeh action UNDO NAHI ho sakta.`
    );
    if (!confirmed) return;
    try {
      await fetchJson(`${API_URL}/superadmin/companies/${company.id}/delete`, { method: 'POST' });
      await loadDashboard();
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const handleRegenerate = async (companyId) => {
    const result = await fetchJson(`${API_URL}/superadmin/companies/${companyId}/access-code/regenerate`, { method: 'POST' });
    alert(`New access code: ${result.accessCode}`);
    await loadDashboard();
  };

  const pendingCount = companies.filter(c => c.status === 'PENDING').length;
  const reactivationCount = companies.filter(c => c.reactivationRequested).length;
  const openRequests = pendingCount + reactivationCount;
  const isTablet = viewportWidth <= 1100;
  const isMobile = viewportWidth <= 768;
  const isPhone = viewportWidth <= 480;
  const isCompactLayout = viewportWidth <= 1280;

  return (
    <div style={{ display: 'flex', flexDirection: isCompactLayout ? 'column' : 'row', height: isCompactLayout ? 'auto' : '100vh', minHeight: isCompactLayout ? '100vh' : 'unset', overflow: isCompactLayout ? 'visible' : 'hidden', background: '#f0f2f5', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* Sidebar */}
      <aside style={{ width: isCompactLayout ? '100%' : 200, background: 'linear-gradient(180deg, #0f172a 0%, #111827 100%)', color: '#fff', display: 'flex', flexDirection: 'column', flexShrink: 0, position: isCompactLayout ? 'sticky' : 'relative', top: isCompactLayout ? 0 : 'unset', zIndex: isCompactLayout ? 1100 : 50, height: isCompactLayout ? 'auto' : '100vh', overflowY: isCompactLayout ? 'visible' : 'auto', boxShadow: isCompactLayout ? '0 2px 8px rgba(0,0,0,0.2)' : '2px 0 8px rgba(0,0,0,0.15)' }}>
        <div style={{ padding: isPhone ? '10px 14px 8px' : isCompactLayout ? '16px' : '22px 20px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: isPhone ? '#ffffff' : 'transparent' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '6px 10px', borderRadius: 14, background: 'transparent', marginBottom: 4 }}>
            <img src="/logo.png" alt="Voxiq" style={{ height: 26 }} />
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: isPhone ? '#0f172a' : '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Super Admin</div>
        </div>

        <nav style={{ flex: 1, padding: isPhone ? '6px 8px 6px' : isCompactLayout ? '12px 12px 8px' : '12px 10px', display: isPhone ? 'grid' : 'flex', gridTemplateColumns: isPhone ? 'repeat(4, minmax(0, 1fr))' : 'none', flexDirection: isCompactLayout ? 'row' : 'column', flexWrap: isCompactLayout ? 'wrap' : 'nowrap', overflowX: 'visible', gap: isPhone ? 6 : isCompactLayout ? 8 : 0 }}>
          {NAV_ITEMS_V2.map(item => {
            const isActive = tab === item.key;
            const badge = item.key === 'requests' ? openRequests : 0;
            const Icon = item.icon;
            return (
              <button key={item.key} onClick={() => setTab(item.key)}
                style={{ width: isPhone ? '100%' : isCompactLayout ? 'auto' : '100%', minWidth: isPhone ? 0 : isCompactLayout ? 'max-content' : 'auto', flex: isPhone ? 'none' : '0 0 auto', display: 'flex', flexDirection: isPhone ? 'column' : 'row', alignItems: 'center', justifyContent: 'center', gap: isPhone ? 5 : 10, padding: isPhone ? '8px 4px 7px' : '10px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', marginBottom: isCompactLayout && !isPhone ? 0 : 4, textAlign: isPhone ? 'center' : 'left',
                  background: isActive ? 'rgba(99,102,241,0.25)' : 'transparent',
                  color: isActive ? '#fff' : '#94a3b8', fontWeight: isActive ? 700 : 500, fontSize: isPhone ? 10 : 14, transition: 'all 0.15s',
                  borderLeft: !isCompactLayout && isActive ? '3px solid #6366f1' : !isCompactLayout ? '3px solid transparent' : 'none',
                  position: isPhone ? 'relative' : 'static' }}>
                <span style={{
                  width: isPhone ? 26 : 30,
                  height: isPhone ? 26 : 30,
                  borderRadius: 8,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isActive ? 'linear-gradient(135deg, rgba(129,140,248,0.95), rgba(99,102,241,0.8))' : 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(148,163,184,0.04))',
                  boxShadow: isActive ? '0 8px 18px rgba(99,102,241,0.35), inset 0 1px 0 rgba(255,255,255,0.25)' : 'inset 0 1px 0 rgba(255,255,255,0.08)',
                  border: `1px solid ${isActive ? 'rgba(255,255,255,0.16)' : 'rgba(148,163,184,0.12)'}`,
                  flexShrink: 0,
                }}>
                  <Icon size={isPhone ? 13 : 16} strokeWidth={2.2} />
                </span>
                <span style={{ flex: isPhone ? 'none' : 1, lineHeight: 1.2 }}>{item.label}</span>
                {badge > 0 && (
                  <span style={{ background: '#ef4444', color: '#fff', borderRadius: 999, fontSize: 10, fontWeight: 800, padding: '1px 6px', minWidth: 18, textAlign: 'center', position: isPhone ? 'absolute' : 'static', top: 8, right: 8 }}>{badge}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div style={{ padding: isCompactLayout ? '0 12px 12px' : '14px 12px', borderTop: isCompactLayout ? 'none' : '1px solid rgba(255,255,255,0.08)' }}>
          <button onClick={() => { disconnectForLogout(); clearToken(); navigate('/login'); }}
            style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.08)', color: '#d1d5db', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: isPhone ? 'center' : 'flex-start', gap: 8 }}>
            <span style={{ width: 30, height: 30, borderRadius: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(148,163,184,0.04))', border: '1px solid rgba(148,163,184,0.12)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)', flexShrink: 0 }}><LogOut size={16} strokeWidth={2.2} /></span> Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflowY: isCompactLayout ? 'visible' : 'auto', overflowX: 'hidden' }}>
        <header style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: isPhone ? '12px 14px' : isMobile ? '14px 16px' : '18px 28px', display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: 12, position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 20, color: '#111827' }}>
              {NAV_ITEMS_V2.find(n => n.key === tab)?.label}
            </div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 1 }}>
              {tab === 'dashboard' && 'Platform-wide overview and stats'}
              {tab === 'requests' && 'Pending signups and reactivation requests'}
              {tab === 'companies' && 'Manage all company accounts'}
              {tab === 'numbers'   && 'Manage your Telnyx number pool for assignment'}
              {tab === 'recordings' && 'Company-wide recordings with playback and downloads'}
              {tab === 'analytics' && 'Per-company call analytics'}
              {tab === 'billing'   && 'Telnyx costs vs package revenue — net profit per company'}
            </div>
          </div>
          {openRequests > 0 && (
            <button onClick={() => setTab('requests')}
              style={{ marginLeft: 'auto', background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: 999, padding: '6px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              {openRequests} open request{openRequests > 1 ? 's' : ''}
            </button>
          )}
        </header>

        <div style={{ padding: isPhone ? 12 : isMobile ? 16 : 28, flex: 1, minWidth: 0 }}>
          {loadError && (
            <div style={{ marginBottom: 16, background: '#fff7ed', color: '#9a3412', border: '1px solid #fdba74', borderRadius: 14, padding: '12px 14px', fontSize: 13, fontWeight: 600 }}>
              {loadError}
            </div>
          )}
          {tab === 'dashboard' && (
            <DashboardTab overview={overview} overviewLoading={overviewLoading} isMobile={isMobile} isPhone={isPhone} />
          )}
          {tab === 'requests' && (
            <RequestsTab
              companies={companies} loading={loading}
              onApprove={setApproveModal}
              onReject={setRejectModal}
              onActivate={handleToggle}
              onRegenerate={handleRegenerate}
              isMobile={isMobile}
            />
          )}
          {tab === 'companies' && (
            <CompaniesTab companies={companies} loading={loading} onToggle={handleToggle} onRegenerate={handleRegenerate} onDelete={handleDelete} isMobile={isMobile} isPhone={isPhone} />
          )}
          {tab === 'numbers' && <NumbersTab isMobile={isMobile} isPhone={isPhone} />}
          {tab === 'recordings' && <RecordingsTab isPhone={isPhone} />}
          {tab === 'analytics' && (
            <AnalyticsTab analytics={analytics} loading={analyticsLoading} isPhone={isPhone} />
          )}
          {tab === 'billing' && <BillingTab isMobile={isMobile} isPhone={isPhone} />}
        </div>
      </main>

      {approveModal && (
        <ApproveModal company={approveModal} onClose={() => setApproveModal(null)}
          onApproved={async () => { setApproveModal(null); await loadDashboard(); }} />
      )}
      {rejectModal && (
        <RejectModal company={rejectModal} onClose={() => setRejectModal(null)}
          onRejected={async () => { setRejectModal(null); await loadDashboard(); }} />
      )}
    </div>
  );
}


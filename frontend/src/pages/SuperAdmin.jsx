import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config/env';
import { fetchJson } from '../lib/api';
import { clearToken } from '../lib/auth';

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
  { key: 'analytics', icon: '📊', label: 'Analytics'  },
];

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

function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: accent || '#111827', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#6b7280' }}>{sub}</div>}
    </div>
  );
}

function MiniBars({ data, valueKey = 'calls', labelKey = 'label', color = '#6366f1' }) {
  const max = Math.max(...data.map(d => d[valueKey] || 0), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 100 }}>
      {data.map(item => (
        <div key={`${item[labelKey]}-${item[valueKey]}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div title={`${item[labelKey]}: ${item[valueKey]}`}
            style={{ width: '100%', borderRadius: '6px 6px 3px 3px', background: color, opacity: item[valueKey] ? 1 : 0.18,
              height: `${Math.max(6, Math.round(((item[valueKey] || 0) / max) * 86))}%` }} />
          <div style={{ fontSize: 10, color: '#6b7280', textAlign: 'center', lineHeight: 1.2 }}>{item[labelKey]}</div>
        </div>
      ))}
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

function ApproveModal({ company, onClose, onApproved }) {
  const [agentLimit, setAgentLimit] = useState(company.requestedAgentLimit || company.agentLimit || 1);
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
        body: JSON.stringify({ agentLimit: Number(agentLimit), numberPool: selectedNumbers }),
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
        <p style={{ color: '#6b7280', margin: '0 0 20px', fontSize: 13 }}>
          Requested {company.requestedAgentLimit || 0} agents and {company.requestedNumbers || 0} numbers.
        </p>

        {error && <div style={{ background: '#fee2e2', color: '#991b1b', borderRadius: 10, padding: '10px 12px', marginBottom: 14, fontSize: 13 }}>{error}</div>}

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

// ─── tab panels ───────────────────────────────────────────────────────────────

function DashboardTab({ overview, overviewLoading }) {
  const topCompanies = overview?.topCompanies || [];
  const topStates = (overview?.topStates || []).map(s => ({ ...s, label: s.state }));

  return (
    <div style={{ display: 'grid', gap: 22 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
        {overviewLoading || !overview ? (
          Array.from({ length: 8 }).map((_, i) => <StatCard key={i} label="Loading" value="…" />)
        ) : (
          <>
            <StatCard label="Companies"     value={overview.totalCompanies}  sub={`${overview.activeCompanies} active`} accent="#6366f1" />
            <StatCard label="Open Requests" value={overview.pendingCompanies + (overview.reactivationRequests || 0)} sub="pending review" accent="#f59e0b" />
            <StatCard label="Agents"        value={overview.totalAgents}     sub={`${overview.totalAdmins} admins`} />
            <StatCard label="Leads"         value={overview.totalLeads}      sub={`${overview.totalLists} lists`} />
            <StatCard label="Calls"         value={overview.totalCalls}      sub={`${overview.connectionRate}% connected`} />
            <StatCard label="Minutes"       value={overview.totalMinutes}    sub={`${overview.inboundCalls} in / ${overview.outboundCalls} out`} />
            <StatCard label="Revenue"       value={`$${Math.round(overview.totalRevenue || 0).toLocaleString()}`} sub={`${overview.recordings} recordings`} accent="#059669" />
            <StatCard label="Numbers"       value={overview.totalNumbers}    sub={`${overview.totalCampaigns} campaigns`} />
          </>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 1fr)', gap: 18 }}>
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', padding: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 14, color: '#111827' }}>Top Companies by Calls</div>
          <div style={{ display: 'grid', gap: 10 }}>
            {topCompanies.length === 0
              ? <div style={{ color: '#9ca3af', fontSize: 13 }}>No activity yet.</div>
              : topCompanies.map((c, i) => (
                <div key={c.accountId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '11px 14px', background: '#f9fafb', borderRadius: 12 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <div style={{ width: 26, height: 26, borderRadius: 8, background: '#ede9fe', color: '#6d28d9', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{c.companyName}</div>
                      <div style={{ color: '#6b7280', fontSize: 12 }}>{c.totalMinutes} min • ${Math.round(c.revenue || 0).toLocaleString()}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#111827' }}>{c.totalCalls}</div>
                </div>
              ))
            }
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', padding: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 14, color: '#111827' }}>Top Calling States</div>
          {topStates.length > 0
            ? <MiniBars data={topStates} valueKey="calls" labelKey="label" color="#0f766e" />
            : <div style={{ color: '#9ca3af', fontSize: 13 }}>No geo data yet.</div>
          }
        </div>
      </div>
    </div>
  );
}

function RequestsTab({ companies, loading, onApprove, onReject, onActivate, onRegenerate }) {
  const pending = companies.filter(c => c.status === 'PENDING');
  const reactivation = companies.filter(c => c.reactivationRequested);
  const total = pending.length + reactivation.length;

  if (loading) return <Placeholder>Loading requests…</Placeholder>;
  if (total === 0) return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', padding: '36px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 36, marginBottom: 10 }}>✅</div>
      <div style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>All clear</div>
      <div style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>No pending requests right now.</div>
    </div>
  );

  return (
    <div style={{ display: 'grid', gap: 20 }}>
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
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
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
                    <td style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6', fontSize: 13 }}>{c.adminPhone || '—'}</td>
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
      )}
    </div>
  );
}

function CompaniesTab({ companies, loading, onToggle, onRegenerate }) {
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
    <div style={{ display: 'grid', gridTemplateColumns: selectedId ? 'minmax(0,1.3fr) minmax(320px,0.8fr)' : '1fr', gap: 18, alignItems: 'start' }}>
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
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['Company', 'Status', 'Team', 'Calls', 'Revenue', 'Actions'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '11px 16px', fontSize: 11, color: '#6b7280', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 24, color: '#9ca3af', fontSize: 13 }}>No companies match your filter.</td></tr>
              )}
              {filtered.map((c, i) => (
                <tr key={c.id}
                  onClick={() => setSelectedId(prev => prev === c.id ? null : c.id)}
                  style={{ background: selectedId === c.id ? '#f0f9ff' : i % 2 === 0 ? '#fff' : '#fafafa', cursor: 'pointer', transition: 'background 0.15s' }}>
                  <td style={{ padding: '13px 16px', borderBottom: '1px solid #f3f4f6' }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>{c.adminEmail || 'No admin'}</div>
                  </td>
                  <td style={{ padding: '13px 16px', borderBottom: '1px solid #f3f4f6' }}><StatusBadge status={c.status} /></td>
                  <td style={{ padding: '13px 16px', borderBottom: '1px solid #f3f4f6', fontSize: 13 }}>
                    {c.agentCount} agents
                    <div style={{ fontSize: 12, color: '#6b7280' }}>{c.leadCount} leads</div>
                  </td>
                  <td style={{ padding: '13px 16px', borderBottom: '1px solid #f3f4f6', fontSize: 13 }}>
                    {c.totalCalls}
                    <div style={{ fontSize: 12, color: '#6b7280' }}>{c.totalMinutes} min</div>
                  </td>
                  <td style={{ padding: '13px 16px', borderBottom: '1px solid #f3f4f6', fontSize: 13, fontWeight: 700 }}>
                    ${Math.round(c.revenue || 0).toLocaleString()}
                  </td>
                  <td style={{ padding: '11px 16px', borderBottom: '1px solid #f3f4f6' }} onClick={e => e.stopPropagation()}>
                    {c.status !== 'PENDING' && (
                      <button onClick={() => onToggle(c)}
                        style={{ ...btnPrimary(c.status === 'ACTIVE' ? '#ef4444' : '#10b981'), padding: '7px 12px', fontSize: 12 }}>
                        {c.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedId && (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', padding: 20, display: 'grid', gap: 18 }}>
          {detailLoading
            ? <Placeholder>Loading details…</Placeholder>
            : detail
            ? <CompanyDetail detail={detail} onRegenerate={onRegenerate} onRefresh={() => loadDetail(selectedId)} />
            : null
          }
        </div>
      )}
    </div>
  );
}

function CompanyDetail({ detail, onRegenerate, onRefresh }) {
  const [unassigning, setUnassigning] = useState(null);
  const [showAssignPicker, setShowAssignPicker] = useState(false);
  const [availableNumbers, setAvailableNumbers] = useState([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [selectedToAssign, setSelectedToAssign] = useState([]);
  const [assigning, setAssigning] = useState(false);

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
            <div style={{ fontSize: 13, color: '#6b7280', marginTop: 3 }}>
              {detail.agents.length} agents · {detail.lists.length} lists · {assignedNumbers.length} numbers
            </div>
          </div>
          <StatusBadge status={detail.status} />
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
        <StatCard label="Calls"     value={detail.stats.totalCalls}    sub={`${detail.stats.inboundCalls} in / ${detail.stats.outboundCalls} out`} />
        <StatCard label="Revenue"   value={`$${Math.round(detail.stats.revenue || 0).toLocaleString()}`} sub={`${detail.stats.recordings} recordings`} />
        <StatCard label="Minutes"   value={detail.stats.totalMinutes}  sub={`${detail.stats.avgDuration}s avg`} />
        <StatCard label="Connected" value={detail.stats.connectedCalls} sub={`${detail.campaigns.length} campaigns`} />
      </div>

      {detail.topStates?.length > 0 && (
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#374151', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Top States</div>
          <MiniBars data={detail.topStates.slice(0, 7).map(s => ({ ...s, label: s.state }))} valueKey="calls" labelKey="label" color="#6366f1" />
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

function NumbersTab() {
  const [numbers, setNumbers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try { const d = await fetchJson(`${API_URL}/superadmin/numbers`); setNumbers(Array.isArray(d) ? d : []); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const free = numbers.filter(n => !n.assigned);
  const assigned = numbers.filter(n => n.assigned);

  return (
    <div style={{ display: 'grid', gap: 18, maxWidth: 800 }}>
      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: '#1d4ed8', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 18 }}>ℹ️</span>
        Numbers are pulled directly from your <strong>Telnyx account</strong>. Purchase numbers on Telnyx and they'll appear here automatically.
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
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['Number', 'Country', 'Status'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, color: '#6b7280', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {numbers.map((n, i) => {
                const countryName = COUNTRY_NAMES[n.countryCode] || 'Unknown';
                return (
                  <tr key={n.number} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa', opacity: n.assigned ? 0.6 : 1 }}>
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
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function AnalyticsTab({ analytics, loading }) {
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
      <div style={{ display: 'flex', gap: 8 }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 16 }}>
            {cards.map(c => (
              <div key={c.name} style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>{c.name}</div>
                    <div style={{ color: '#6b7280', fontSize: 12, marginTop: 2 }}>{c.calls} calls · {c.minutes} min</div>
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

function SectionHeader({ icon, title, count, countBg, countColor }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 18 }}>{icon}</span>
      <span style={{ fontWeight: 800, fontSize: 16, color: '#111827' }}>{title}</span>
      {count > 0 && <Badge bg={countBg} color={countColor}>{count}</Badge>}
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export default function SuperAdmin() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('dashboard');
  const [companies, setCompanies] = useState([]);
  const [overview, setOverview] = useState(null);
  const [analytics, setAnalytics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [approveModal, setApproveModal] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);

  const loadCompanies = useCallback(async () => {
    setLoading(true);
    try { const d = await fetchJson(`${API_URL}/superadmin/companies`); setCompanies(Array.isArray(d) ? d : []); }
    finally { setLoading(false); }
  }, []);

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    try { const d = await fetchJson(`${API_URL}/superadmin/overview`); setOverview(d); }
    finally { setOverviewLoading(false); }
  }, []);

  const loadAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try { const d = await fetchJson(`${API_URL}/superadmin/analytics`); setAnalytics(Array.isArray(d) ? d : []); }
    finally { setAnalyticsLoading(false); }
  }, []);

  useEffect(() => { loadCompanies(); loadOverview(); }, [loadCompanies, loadOverview]);
  useEffect(() => { if (tab === 'analytics') loadAnalytics(); }, [tab, loadAnalytics]);

  const handleToggle = async (company) => {
    const ep = company.status === 'ACTIVE' ? 'deactivate' : 'activate';
    await fetchJson(`${API_URL}/superadmin/companies/${company.id}/${ep}`, { method: 'POST' });
    await Promise.all([loadCompanies(), loadOverview()]);
  };

  const handleRegenerate = async (companyId) => {
    const result = await fetchJson(`${API_URL}/superadmin/companies/${companyId}/access-code/regenerate`, { method: 'POST' });
    alert(`New access code: ${result.accessCode}`);
    await Promise.all([loadCompanies(), loadOverview()]);
  };

  const pendingCount = companies.filter(c => c.status === 'PENDING').length;
  const reactivationCount = companies.filter(c => c.reactivationRequested).length;
  const openRequests = pendingCount + reactivationCount;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f3f4f6', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* Sidebar */}
      <aside style={{ width: 220, background: '#111827', color: '#fff', display: 'flex', flexDirection: 'column', flexShrink: 0, position: 'sticky', top: 0, height: '100vh' }}>
        <div style={{ padding: '22px 20px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <img src="/logo.png" alt="Voxiq" style={{ height: 30, marginBottom: 10 }} />
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Super Admin</div>
        </div>

        <nav style={{ flex: 1, padding: '12px 10px' }}>
          {NAV_ITEMS.map(item => {
            const isActive = tab === item.key;
            const badge = item.key === 'requests' ? openRequests : 0;
            return (
              <button key={item.key} onClick={() => setTab(item.key)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', marginBottom: 4, textAlign: 'left',
                  background: isActive ? 'rgba(255,255,255,0.12)' : 'transparent',
                  color: isActive ? '#fff' : '#9ca3af', fontWeight: isActive ? 700 : 500, fontSize: 14, transition: 'all 0.15s' }}>
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {badge > 0 && (
                  <span style={{ background: '#ef4444', color: '#fff', borderRadius: 999, fontSize: 10, fontWeight: 800, padding: '1px 6px', minWidth: 18, textAlign: 'center' }}>{badge}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div style={{ padding: '14px 12px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button onClick={() => { clearToken(); navigate('/login'); }}
            style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.08)', color: '#d1d5db', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>↩</span> Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <header style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '18px 28px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 20, color: '#111827' }}>
              {NAV_ITEMS.find(n => n.key === tab)?.label}
            </div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 1 }}>
              {tab === 'dashboard' && 'Platform-wide overview and stats'}
              {tab === 'requests' && 'Pending signups and reactivation requests'}
              {tab === 'companies' && 'Manage all company accounts'}
              {tab === 'numbers'   && 'Manage your Telnyx number pool for assignment'}
              {tab === 'analytics' && 'Per-company call analytics'}
            </div>
          </div>
          {openRequests > 0 && (
            <button onClick={() => setTab('requests')}
              style={{ marginLeft: 'auto', background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: 999, padding: '6px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              {openRequests} open request{openRequests > 1 ? 's' : ''}
            </button>
          )}
        </header>

        <div style={{ padding: 28, flex: 1 }}>
          {tab === 'dashboard' && (
            <DashboardTab overview={overview} overviewLoading={overviewLoading} />
          )}
          {tab === 'requests' && (
            <RequestsTab
              companies={companies} loading={loading}
              onApprove={setApproveModal}
              onReject={setRejectModal}
              onActivate={handleToggle}
              onRegenerate={handleRegenerate}
            />
          )}
          {tab === 'companies' && (
            <CompaniesTab companies={companies} loading={loading} onToggle={handleToggle} onRegenerate={handleRegenerate} />
          )}
          {tab === 'numbers' && <NumbersTab />}
          {tab === 'analytics' && (
            <AnalyticsTab analytics={analytics} loading={analyticsLoading} />
          )}
        </div>
      </main>

      {approveModal && (
        <ApproveModal company={approveModal} onClose={() => setApproveModal(null)}
          onApproved={async () => { setApproveModal(null); await Promise.all([loadCompanies(), loadOverview()]); }} />
      )}
      {rejectModal && (
        <RejectModal company={rejectModal} onClose={() => setRejectModal(null)}
          onRejected={async () => { setRejectModal(null); await Promise.all([loadCompanies(), loadOverview()]); }} />
      )}
    </div>
  );
}

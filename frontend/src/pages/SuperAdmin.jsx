import { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../config/env';
import { fetchJson } from '../lib/api';

const STATUS_COLORS = {
  PENDING: { bg: '#fef3c7', color: '#92400e', label: 'Pending' },
  ACTIVE: { bg: '#d1fae5', color: '#065f46', label: 'Active' },
  INACTIVE: { bg: '#fee2e2', color: '#991b1b', label: 'Inactive' },
};

function StatusBadge({ status }) {
  const s = STATUS_COLORS[status] || STATUS_COLORS.INACTIVE;
  return (
    <span style={{ background: s.bg, color: s.color, padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
      {s.label}
    </span>
  );
}

function ApproveModal({ company, onClose, onApproved }) {
  const [agentLimit, setAgentLimit] = useState(company.requestedAgentLimit || 1);
  const [numbersText, setNumbersText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleApprove = async () => {
    setLoading(true);
    setError(null);
    try {
      const lines = numbersText.trim().split('\n').map(l => l.trim()).filter(Boolean);
      const numberPool = lines.map(l => {
        const parts = l.split(',').map(p => p.trim());
        return { number: parts[0] || l, callerName: parts[1] || 'Voxiq', areaCode: parts[2] || '' };
      });
      await fetchJson(`${API_URL}/superadmin/companies/${company.id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ agentLimit: Number(agentLimit), numberPool }),
      });
      onApproved();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 32, width: 480, maxWidth: '90vw' }}>
        <h3 style={{ margin: '0 0 4px' }}>Approve — {company.name}</h3>
        <p style={{ color: '#6b7280', margin: '0 0 20px', fontSize: 14 }}>
          Requested: {company.requestedAgentLimit} agents, {company.requestedNumbers} numbers
        </p>
        {error && <div style={{ background: '#fee2e2', color: '#991b1b', padding: '8px 12px', borderRadius: 6, marginBottom: 16 }}>{error}</div>}
        <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Agent Limit</label>
        <input type="number" min="1" value={agentLimit} onChange={e => setAgentLimit(e.target.value)}
          style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, marginBottom: 16, boxSizing: 'border-box' }} />
        <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Phone Numbers</label>
        <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 6px' }}>One per line. Format: +1XXXXXXXXXX, Caller Name, AreaCode</p>
        <textarea rows={5} value={numbersText} onChange={e => setNumbersText(e.target.value)}
          placeholder={'+14422039259, Voxiq Sales, 442\n+14422039260, Voxiq Support, 442'}
          style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, marginBottom: 20, boxSizing: 'border-box', fontFamily: 'monospace', fontSize: 13 }} />
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 20px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleApprove} disabled={loading}
            style={{ padding: '8px 20px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
            {loading ? 'Approving…' : 'Approve & Activate'}
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
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      onRejected();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 32, width: 400 }}>
        <h3 style={{ margin: '0 0 16px' }}>Reject — {company.name}</h3>
        <label style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Reason</label>
        <textarea rows={3} value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason for rejection..."
          style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, marginBottom: 20, boxSizing: 'border-box' }} />
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 20px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleReject} disabled={loading || !reason.trim()}
            style={{ padding: '8px 20px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
            {loading ? 'Rejecting…' : 'Reject'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SuperAdmin() {
  const [tab, setTab] = useState('pending');
  const [companies, setCompanies] = useState([]);
  const [analytics, setAnalytics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [approveModal, setApproveModal] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [analyticsPeriod, setAnalyticsPeriod] = useState('daily');

  const loadCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchJson(`${API_URL}/superadmin/companies`);
      setCompanies(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const data = await fetchJson(`${API_URL}/superadmin/analytics`);
      setAnalytics(data);
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  useEffect(() => { loadCompanies(); }, [loadCompanies]);

  useEffect(() => {
    if (tab === 'analytics') loadAnalytics();
  }, [tab, loadAnalytics]);

  const handleToggle = async (company) => {
    const endpoint = company.status === 'ACTIVE' ? 'deactivate' : 'activate';
    try {
      await fetchJson(`${API_URL}/superadmin/companies/${company.id}/${endpoint}`, { method: 'POST' });
      loadCompanies();
    } catch (err) {
      alert(err.message);
    }
  };

  const pending = companies.filter(c => c.status === 'PENDING');
  const all = companies;

  const tabStyle = (t) => ({
    padding: '10px 24px', border: 'none', background: tab === t ? '#111827' : 'transparent',
    color: tab === t ? '#fff' : '#6b7280', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14,
  });

  const thStyle = { padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e5e7eb' };
  const tdStyle = { padding: '14px 16px', borderBottom: '1px solid #f3f4f6', fontSize: 14 };

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ background: '#111827', color: '#fff', padding: '20px 32px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <img src="/logo.png" alt="Voxiq" style={{ height: 32 }} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 18 }}>Super Admin</div>
          <div style={{ fontSize: 12, color: '#9ca3af' }}>Platform Control Center</div>
        </div>
        {pending.length > 0 && (
          <div style={{ marginLeft: 'auto', background: '#ef4444', borderRadius: 20, padding: '4px 12px', fontSize: 13, fontWeight: 700 }}>
            {pending.length} pending
          </div>
        )}
      </div>

      <div style={{ padding: '16px 32px', background: '#fff', borderBottom: '1px solid #e5e7eb', display: 'flex', gap: 8 }}>
        <button style={tabStyle('pending')} onClick={() => setTab('pending')}>
          Pending Requests {pending.length > 0 && `(${pending.length})`}
        </button>
        <button style={tabStyle('companies')} onClick={() => setTab('companies')}>All Companies</button>
        <button style={tabStyle('analytics')} onClick={() => setTab('analytics')}>Analytics</button>
      </div>

      <div style={{ padding: 32 }}>
        {loading && tab !== 'analytics' && (
          <div style={{ textAlign: 'center', color: '#6b7280', padding: 48 }}>Loading…</div>
        )}

        {!loading && tab === 'pending' && (
          <>
            {pending.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#6b7280', padding: 48 }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
                No pending requests
              </div>
            ) : (
              <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Company</th>
                      <th style={thStyle}>Admin</th>
                      <th style={thStyle}>Phone</th>
                      <th style={thStyle}>Requested</th>
                      <th style={thStyle}>Date</th>
                      <th style={thStyle}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pending.map(c => (
                      <tr key={c.id}>
                        <td style={tdStyle}><strong>{c.name}</strong></td>
                        <td style={tdStyle}>
                          <div>{c.adminName}</div>
                          <div style={{ color: '#6b7280', fontSize: 12 }}>{c.adminEmail}</div>
                        </td>
                        <td style={tdStyle}>{c.adminPhone || '—'}</td>
                        <td style={tdStyle}>
                          <div>{c.requestedAgentLimit} agents</div>
                          <div style={{ color: '#6b7280', fontSize: 12 }}>{c.requestedNumbers} numbers</div>
                        </td>
                        <td style={tdStyle}>{new Date(c.createdAt).toLocaleDateString()}</td>
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => setApproveModal(c)}
                              style={{ padding: '6px 14px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                              Approve
                            </button>
                            <button onClick={() => setRejectModal(c)}
                              style={{ padding: '6px 14px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {!loading && tab === 'companies' && (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Company</th>
                  <th style={thStyle}>Admin</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Agents</th>
                  <th style={thStyle}>Joined</th>
                  <th style={thStyle}>Action</th>
                </tr>
              </thead>
              <tbody>
                {all.map(c => (
                  <tr key={c.id}>
                    <td style={tdStyle}><strong>{c.name}</strong></td>
                    <td style={tdStyle}>
                      <div>{c.adminName}</div>
                      <div style={{ color: '#6b7280', fontSize: 12 }}>{c.adminEmail}</div>
                    </td>
                    <td style={tdStyle}><StatusBadge status={c.status} /></td>
                    <td style={tdStyle}>{c.userCount} / {c.agentLimit ?? '—'}</td>
                    <td style={tdStyle}>{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td style={tdStyle}>
                      {c.status !== 'PENDING' && (
                        <button onClick={() => handleToggle(c)}
                          style={{
                            padding: '6px 14px', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13,
                            background: c.status === 'ACTIVE' ? '#fee2e2' : '#d1fae5',
                            color: c.status === 'ACTIVE' ? '#991b1b' : '#065f46',
                          }}>
                          {c.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'analytics' && (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
              {['daily', 'weekly', 'monthly'].map(p => (
                <button key={p} onClick={() => setAnalyticsPeriod(p)}
                  style={{
                    padding: '8px 20px', border: analyticsPeriod === p ? 'none' : '1px solid #e5e7eb',
                    borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13,
                    background: analyticsPeriod === p ? '#111827' : '#fff',
                    color: analyticsPeriod === p ? '#fff' : '#6b7280',
                  }}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
            {analyticsLoading ? (
              <div style={{ textAlign: 'center', color: '#6b7280', padding: 48 }}>Loading analytics…</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                {analytics.map(a => {
                  const stats = a[analyticsPeriod];
                  return (
                    <div key={a.accountId} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20 }}>
                      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>{a.companyName}</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        {[
                          { label: 'Total Calls', value: stats.calls },
                          { label: 'Connected', value: stats.connectedCalls },
                          { label: 'Total Minutes', value: stats.totalMinutes },
                          { label: 'Avg Duration', value: `${stats.avgDuration}s` },
                        ].map(({ label, value }) => (
                          <div key={label} style={{ background: '#f9fafb', borderRadius: 8, padding: '12px 16px' }}>
                            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>{label}</div>
                            <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {analytics.length === 0 && !analyticsLoading && (
                  <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#6b7280', padding: 48 }}>
                    No active companies yet
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {approveModal && (
        <ApproveModal
          company={approveModal}
          onClose={() => setApproveModal(null)}
          onApproved={() => { setApproveModal(null); loadCompanies(); }}
        />
      )}
      {rejectModal && (
        <RejectModal
          company={rejectModal}
          onClose={() => setRejectModal(null)}
          onRejected={() => { setRejectModal(null); loadCompanies(); }}
        />
      )}
    </div>
  );
}

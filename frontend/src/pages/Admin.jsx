import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { API_URL } from '../config/env';
import { fetchJson } from '../lib/api';
import { getToken, setToken, clearToken } from '../lib/auth';
import StateMap from '../components/StateMap';

// ─── Tiny pure-CSS bar chart ──────────────────────────────────────────────────
function BarChart({ data = [], labelKey = 'label', valueKey = 'value', max, color = 'var(--vx-accent)' }) {
  const m = max || Math.max(...data.map(d => d[valueKey] || 0), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '80px' }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
          <div style={{ width: '100%', background: color, borderRadius: '3px 3px 0 0', height: `${Math.round(((d[valueKey] || 0) / m) * 100)}%`, minHeight: d[valueKey] ? '4px' : '0', transition: 'height 0.4s' }} />
          <span style={{ fontSize: '9px', color: 'var(--text-soft)', transform: 'rotate(-40deg)', transformOrigin: 'top left', whiteSpace: 'nowrap', marginTop: '4px' }}>{d[labelKey]}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Tiny pie (SVG) ───────────────────────────────────────────────────────────
function PieChart({ data = [] }) {
  const total = data.reduce((s, d) => s + (d.value || 0), 0) || 1;
  const colors = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
  let cumulative = 0;
  const slices = data.map((d, i) => {
    const pct = (d.value || 0) / total;
    const start = cumulative * 2 * Math.PI;
    cumulative += pct;
    const end = cumulative * 2 * Math.PI;
    const x1 = 50 + 40 * Math.cos(start - Math.PI / 2);
    const y1 = 50 + 40 * Math.sin(start - Math.PI / 2);
    const x2 = 50 + 40 * Math.cos(end - Math.PI / 2);
    const y2 = 50 + 40 * Math.sin(end - Math.PI / 2);
    const large = pct > 0.5 ? 1 : 0;
    return { d: `M50,50 L${x1},${y1} A40,40 0 ${large},1 ${x2},${y2} Z`, color: colors[i % colors.length], label: d.label, value: d.value };
  });
  return (
    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
      <svg width="100" height="100" viewBox="0 0 100 100">
        {slices.map((s, i) => <path key={i} d={s.d} fill={s.color} stroke="white" strokeWidth="1" />)}
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {slices.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
            {s.label}: <b>{s.value}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Channel Splitter Player ─────────────────────────────────────────────────
// Uses Web Audio API to play only one channel of a dual-channel MP3
// channel: 0 = Agent (TX/outbound), 1 = Customer (RX/inbound)
function ChannelPlayer({ url, channel, label, icon }) {
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState(null);
  const ctxRef = useRef(null);
  const sourceRef = useRef(null);

  const stop = () => {
    try { sourceRef.current?.stop(); } catch (_) { }
    try { ctxRef.current?.close(); } catch (_) { }
    ctxRef.current = null;
    sourceRef.current = null;
    setPlaying(false);
  };

  const play = async () => {
    if (playing) { stop(); return; }
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('Fetch failed');
      const buf = await resp.arrayBuffer();
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      ctxRef.current = ctx;
      const decoded = await ctx.decodeAudioData(buf);

      // Only proceed if the recording actually has 2 channels
      const numChannels = decoded.numberOfChannels;
      const ch = Math.min(channel, numChannels - 1);

      const source = ctx.createBufferSource();
      sourceRef.current = source;

      if (numChannels >= 2) {
        // Split channels — connect only the requested channel to output
        const splitter = ctx.createChannelSplitter(numChannels);
        const merger = ctx.createChannelMerger(2);
        source.buffer = decoded;
        source.connect(splitter);
        splitter.connect(merger, ch, 0);
        splitter.connect(merger, ch, 1);
        merger.connect(ctx.destination);
      } else {
        // Mono recording — play as-is for both channels
        source.buffer = decoded;
        source.connect(ctx.destination);
      }

      source.onended = () => { setPlaying(false); ctxRef.current = null; };
      source.start();
      setPlaying(true);
    } catch (e) {
      setError('Failed to load audio');
    } finally {
      setLoading(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => () => stop(), []);

  return (
    <button
      onClick={play}
      title={label}
      style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '6px 12px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 600,
        border: '1px solid',
        cursor: loading ? 'wait' : 'pointer',
        background: playing ? (channel === 0 ? '#ede9fe' : '#dcfce7') : 'white',
        borderColor: playing ? (channel === 0 ? '#7c3aed' : '#16a34a') : '#e2e8f0',
        color: playing ? (channel === 0 ? '#5b21b6' : '#15803d') : '#475569',
        transition: 'all 0.2s',
        minWidth: 110,
      }}
    >
      <span>{loading ? '⌛' : playing ? '⏹' : '▶'}</span>
      <span>{icon} {label}</span>
      {error && <span style={{ color: '#ef4444', fontSize: '0.68rem' }}>⚠️</span>}
    </button>
  );
}

// ─── Disposition badge ────────────────────────────────────────────────────────
function DispBadge({ disp }) {
  if (!disp) return null;
  const d = disp.toLowerCase();
  const color =
    d === 'interested' || d === 'booked' ? { bg: '#dcfce7', fg: '#15803d' }
      : d === 'callback' ? { bg: '#fef9c3', fg: '#854d0e' }
        : d === 'no answer' || d === 'no_answer' ? { bg: '#f1f5f9', fg: '#475569' }
          : d === 'dnc' ? { bg: '#fee2e2', fg: '#b91c1c' }
            : d === 'voicemail' ? { bg: '#ede9fe', fg: '#5b21b6' }
              : { bg: '#f1f5f9', fg: '#475569' };
  return (
    <span style={{ background: color.bg, color: color.fg, borderRadius: '6px', padding: '2px 8px', fontSize: '0.7rem', fontWeight: 700 }}>
      {disp}
    </span>
  );
}

// ─── Single Recording Card ────────────────────────────────────────────────────
function RecordingCard({ r }) {
  const [showFull, setShowFull] = useState(false);
  const dur = r.durationSeconds;
  const durStr = dur != null
    ? dur >= 60 ? `${Math.floor(dur / 60)}m ${dur % 60}s` : `${dur}s`
    : null;

  return (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      border: '1px solid #e2e8f0',
      padding: '1rem 1.25rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem', gap: '0.5rem', flexWrap: 'wrap' }}>
        <div>
          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>
            {r.lead ? `${r.lead.firstName} ${r.lead.lastName}` : 'Unknown Lead'}
          </span>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '1px' }}>
            {r.agent?.name && <><b>{r.agent.name}</b> &nbsp;•&nbsp;</>}
            {r.startedAt ? new Date(r.startedAt).toLocaleString() : ''}
            {durStr && <>&nbsp;•&nbsp;⏱ {durStr}</>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          <DispBadge disp={r.disposition} />
          {r.vmRecordingUrl && (
            <span style={{ background: '#ede9fe', color: '#5b21b6', borderRadius: '6px', padding: '2px 8px', fontSize: '0.7rem', fontWeight: 700 }}>
              📬 VM Left
            </span>
          )}
          {r.recordingUrl && (
            <span style={{ background: '#dcfce7', color: '#15803d', borderRadius: '6px', padding: '2px 8px', fontSize: '0.7rem', fontWeight: 700 }}>
              🎙️ Recorded
            </span>
          )}
        </div>
      </div>

      {/* Main call recording */}
      {r.recordingUrl && (
        <div style={{ marginBottom: '0.75rem' }}>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: '4px', fontWeight: 600 }}>CALL RECORDING</div>
          {/* Standard full player */}
          <audio controls src={r.recordingUrl} style={{ width: '100%', height: '34px', marginBottom: '8px' }} />
          {/* Channel split buttons */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <ChannelPlayer url={r.recordingUrl} channel={0} label="Agent Voice" icon="🎧" />
            <ChannelPlayer url={r.recordingUrl} channel={1} label="Customer Voice" icon="📞" />
            <a
              href={r.recordingUrl}
              download
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '6px 12px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 600,
                border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569',
                textDecoration: 'none', transition: 'all 0.2s',
              }}
            >
              ⬇️ Download Full
            </a>
          </div>
        </div>
      )}

      {/* Voicemail recording */}
      {r.vmRecordingUrl && (
        <div style={{
          background: '#faf5ff',
          border: '1px solid #e9d5ff',
          borderRadius: '8px',
          padding: '0.6rem 0.75rem',
        }}>
          <div style={{ fontSize: '0.72rem', color: '#7c3aed', marginBottom: '4px', fontWeight: 700 }}>📬 VOICEMAIL LEFT</div>
          <audio controls src={r.vmRecordingUrl} style={{ width: '100%', height: '34px', marginBottom: '6px' }} />
          <a
            href={r.vmRecordingUrl}
            download
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              padding: '4px 10px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600,
              border: '1px solid #d8b4fe', background: 'white', color: '#7c3aed', textDecoration: 'none',
            }}
          >
            ⬇️ Download Voicemail
          </a>
        </div>
      )}

      {/* Notes */}
      {r.notes && (
        <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: '#64748b', borderTop: '1px solid #f1f5f9', paddingTop: '0.4rem' }}>
          📝 {r.notes}
        </div>
      )}
    </div>
  );
}

// ─── Recordings Tab ──────────────────────────────────────────────────────────
function RecordingsTab({ recordings, users, onFetch, apiUrl, getToken }) {
  const [search, setSearch] = useState('');
  const [filterAgent, setFilterAgent] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [localRecs, setLocalRecs] = useState(recordings);
  const [loading, setLoading] = useState(false);

  // Sync prop updates (initial load)
  useEffect(() => { setLocalRecs(recordings); }, [recordings]);

  const doFetch = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('phone', search);
      if (filterAgent) params.set('agentId', filterAgent);
      if (filterDateFrom) params.set('dateFrom', filterDateFrom);
      if (filterDateTo) params.set('dateTo', filterDateTo);
      params.set('limit', '200');

      const res = await fetch(`${apiUrl}/analytics/recordings?${params}`, {
        headers: { Authorization: `Bearer ${getToken() || ''}` },
      });
      const data = await res.json();
      setLocalRecs(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Recordings fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  // Group recordings by phone number
  const grouped = localRecs.reduce((acc, r) => {
    const phone = r.lead?.phone || 'Unknown';
    if (!acc[phone]) acc[phone] = { phone, lead: r.lead, records: [] };
    acc[phone].records.push(r);
    return acc;
  }, {});
  const groups = Object.values(grouped);

  // Client-side name search
  const filteredGroups = search
    ? groups.filter(g => {
      const q = search.toLowerCase();
      return (
        (g.phone || '').includes(q) ||
        (g.lead?.firstName || '').toLowerCase().includes(q) ||
        (g.lead?.lastName || '').toLowerCase().includes(q)
      );
    })
    : groups;

  const totalRecs = localRecs.length;
  const withVm = localRecs.filter(r => r.vmRecordingUrl).length;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="font-head" style={{ marginBottom: 0 }}>📼 Call Recordings</h1>
          <p className="text-dim" style={{ fontSize: '0.8rem', marginTop: '2px' }}>
            {totalRecs} recording{totalRecs !== 1 ? 's' : ''}{withVm > 0 ? ` • ${withVm} voicemail${withVm !== 1 ? 's' : ''}` : ''}
          </p>
        </div>
        <button
          className="btn"
          style={{ fontSize: '0.8rem' }}
          onClick={doFetch}
          disabled={loading}
        >
          {loading ? '⌛ Loading...' : '🔄 Refresh'}
        </button>
      </div>

      {/* Filters */}
      <div style={{
        background: 'var(--vx-accent-soft)',
        border: '1px solid #e0e7ff',
        borderRadius: '12px',
        padding: '1rem 1.25rem',
        marginBottom: '1.5rem',
        display: 'flex',
        gap: '0.75rem',
        flexWrap: 'wrap',
        alignItems: 'flex-end',
      }}>
        <div style={{ flex: '1 1 180px' }}>
          <label style={{ fontSize: '0.7rem', color: '#6366f1', fontWeight: 700, display: 'block', marginBottom: '4px' }}>🔍 SEARCH PHONE / NAME</label>
          <input
            className="input-field"
            placeholder="e.g. 262 or John"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>
        <div style={{ flex: '1 1 160px' }}>
          <label style={{ fontSize: '0.7rem', color: '#6366f1', fontWeight: 700, display: 'block', marginBottom: '4px' }}>👤 FILTER BY AGENT</label>
          <select className="input-field" style={{ width: '100%' }} value={filterAgent} onChange={e => setFilterAgent(e.target.value)}>
            <option value="">All Agents</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <div style={{ flex: '1 1 140px' }}>
          <label style={{ fontSize: '0.7rem', color: '#6366f1', fontWeight: 700, display: 'block', marginBottom: '4px' }}>📅 FROM</label>
          <input type="date" className="input-field" style={{ width: '100%' }} value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} />
        </div>
        <div style={{ flex: '1 1 140px' }}>
          <label style={{ fontSize: '0.7rem', color: '#6366f1', fontWeight: 700, display: 'block', marginBottom: '4px' }}>📅 TO</label>
          <input type="date" className="input-field" style={{ width: '100%' }} value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} />
        </div>
        <button
          className="btn btn-primary"
          style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}
          onClick={doFetch}
          disabled={loading}
        >
          Apply Filters
        </button>
        <button
          className="btn"
          style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}
          onClick={() => {
            setSearch(''); setFilterAgent(''); setFilterDateFrom(''); setFilterDateTo('');
            onFetch();
          }}
        >
          Clear
        </button>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {[
          { icon: '🎧', label: 'Agent Voice — plays outbound (TX) channel only', color: '#ede9fe', border: '#7c3aed' },
          { icon: '📞', label: 'Customer Voice — plays inbound (RX) channel only', color: '#dcfce7', border: '#16a34a' },
          { icon: '📬', label: 'Voicemail Left — separate voicemail audio', color: '#faf5ff', border: '#d8b4fe' },
        ].map(({ icon, label, color, border }) => (
          <div key={icon} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.73rem', color: '#64748b' }}>
            <span style={{ background: color, border: `1px solid ${border}`, borderRadius: '5px', padding: '2px 6px', fontWeight: 600 }}>{icon}</span>
            {label}
          </div>
        ))}
      </div>

      {/* Content */}
      {filteredGroups.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '4rem 2rem',
          background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎙️</div>
          <h3 style={{ color: '#0f172a', marginBottom: '0.5rem' }}>No recordings found</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.88rem' }}>
            Recordings appear here after calls end. Make sure recording is enabled on your Telnyx Call Control App.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {filteredGroups.map(group => (
            <div key={group.phone}>
              {/* Phone group header */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                marginBottom: '0.6rem', paddingBottom: '0.4rem',
                borderBottom: '2px solid #e0e7ff',
              }}>
                <div style={{
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: 'white', borderRadius: '10px', padding: '5px 12px',
                  fontFamily: 'monospace', fontWeight: 800, fontSize: '0.9rem',
                }}>
                  📱 {group.phone}
                </div>
                {group.lead && (
                  <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.9rem' }}>
                    {group.lead.firstName} {group.lead.lastName}
                  </span>
                )}
                <span style={{
                  background: '#e0e7ff', color: '#3730a3',
                  borderRadius: '999px', padding: '2px 10px', fontSize: '0.72rem', fontWeight: 700, marginLeft: 'auto',
                }}>
                  {group.records.length} call{group.records.length !== 1 ? 's' : ''}
                  {group.records.filter(r => r.vmRecordingUrl).length > 0
                    ? ` • ${group.records.filter(r => r.vmRecordingUrl).length} VM`
                    : ''}
                </span>
              </div>

              {/* Call cards for this phone */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', paddingLeft: '0.5rem' }}>
                {group.records.map(r => <RecordingCard key={r.id} r={r} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Admin() {
  const navigate = useNavigate();
  const { socket, isConnected, reconnect } = useSocket();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [campaigns, setCampaigns] = useState([]);
  const [users, setUsers] = useState([]);
  const [metrics, setMetrics] = useState({});
  const [isLoading, setIsLoading] = useState(!!getToken());
  const [error, setError] = useState(null);
  const [importForm, setImportForm] = useState({ listId: '', accountId: '', newListName: '' });
  const [availableLists, setAvailableLists] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [leads, setLeads] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [roles, setRoles] = useState([]);

  // Analytics
  const [overview, setOverview] = useState(null);
  const [hourly, setHourly] = useState([]);
  const [scorecards, setScorecards] = useState([]);
  const [recordings, setRecordings] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);

  // Integrations
  const [webhooks, setWebhooks] = useState([]);
  const [leadsPage, setLeadsPage] = useState(1);
  const LEADS_PER_PAGE = 20;;
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [newWebhookLabel, setNewWebhookLabel] = useState('');
  const [ghlKey, setGhlKey] = useState('');
  const [ghlStatus, setGhlStatus] = useState('');
  const [smsTemplates, setSmsTemplates] = useState([]);
  const [newSmsName, setNewSmsName] = useState('');
  const [newSmsMsg, setNewSmsMsg] = useState('');
  const [vmTemplates, setVmTemplates] = useState([]);

  // Modals
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showListModal, setShowListModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);

  // Forms
  const [accountForm, setAccountForm] = useState({ name: '' });
  const [listForm, setListForm] = useState({ name: '', accountId: '', description: '' });
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', roleId: '', accountId: '' });
  const [campaignForm, setCampaignForm] = useState({ id: null, name: '', accountId: '', mode: 'PREDICTIVE', pacing: 3, localPresence: false, record: false, numberPool: [] });
  const [manageAccount, setManageAccount] = useState(null); // For account edit modal
  const [confirmModal, setConfirmModal] = useState({ show: false, title: '', message: '', onConfirm: null });
  const [selectedLists, setSelectedLists] = useState([]);
  const [selectedListId, setSelectedListId] = useState('');

  const [authState, setAuthState] = useState({
    email: 'admin@example.com',
    password: 'Admin123!',
    token: getToken(),
    user: null,
    loginError: null,
  });

  useEffect(() => {
    if (authState.token) {
      if (!authState.user) fetchProfile();
      fetchInitialData();
      fetchRoles();
    } else {
      setIsLoading(false);
    }
  }, [authState.token, !!authState.user]);

  useEffect(() => {
    if (importForm.accountId) fetchLists(importForm.accountId);
    else setAvailableLists([]);
  }, [importForm.accountId]);

  useEffect(() => {
    // Force a fresh reconnect on mount with latest token
    if (reconnect) reconnect();
  }, [reconnect]);

  // Load analytics when that tab is active
  useEffect(() => {
    if (activeTab === 'analytics') {
      fetchOverview();
      fetchHourly();
      fetchScorecards();
      fetchHeatmap();
    }
    if (activeTab === 'recordings') fetchRecordings();
    if (activeTab === 'integrations') {
      fetchWebhooks();
      fetchSmsTemplates();
      fetchVmTemplates();
    }
  }, [activeTab]);

  const fetchProfile = async () => {
    try {
      const user = await fetchJson(`${API_URL}/auth/profile`);
      setAuthState(s => ({ ...s, user }));
    } catch (err) {
      if (err.message.includes('401')) handleLogout();
    }
  };

  const handleLogin = async () => {
    try {
      const data = await fetchJson(`${API_URL}/auth/login`, {
        method: 'POST',
        body: JSON.stringify({ email: authState.email, password: authState.password }),
      });
      setToken(data.access_token);
      setAuthState(s => ({ ...s, token: data.access_token, user: data.user, loginError: null }));
    } catch (err) {
      setAuthState(s => ({ ...s, loginError: err.message }));
    }
  };

  const handleLogout = () => {
    console.log('Logging out...');
    clearToken();
    navigate('/login');
  };

  const fetchInitialData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await Promise.allSettled([fetchCampaigns(), fetchUsers(), fetchLeads(), fetchAccounts()]);
    } catch (err) {
      setError('Failed to load dashboard. Please refresh.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const data = await fetchJson(`${API_URL}/leads/accounts`);
      const sanitized = Array.isArray(data) ? data : [];
      setAccounts(sanitized);
      if (sanitized.length > 0 && !importForm.accountId) {
        setImportForm(prev => ({ ...prev, accountId: sanitized[0].id }));
      }
    } catch (e) { console.error('accounts:', e); }
  };

  const fetchLists = async (accountId) => {
    try {
      const data = await fetchJson(`${API_URL}/leads/lists?accountId=${accountId}`);
      const sanitized = Array.isArray(data) ? data : [];
      setAvailableLists(sanitized);
      if (sanitized.length > 0) setImportForm(prev => ({ ...prev, listId: sanitized[0].id }));
    } catch (e) { console.error('lists:', e); }
  };

  const fetchCampaigns = async () => {
    try {
      const data = await fetchJson(`${API_URL}/campaigns`);
      const sanitized = Array.isArray(data) ? data : [];
      setCampaigns(sanitized);
      sanitized.forEach(c => fetchMetrics(c.id));
    } catch (e) { console.error('campaigns:', e); }
  };

  const fetchMetrics = async (id) => {
    try {
      const data = await fetchJson(`${API_URL}/campaigns/${id}/metrics`);
      setMetrics(prev => ({ ...prev, [id]: data }));
    } catch (e) { }
  };

  const fetchUsers = async () => {
    try {
      const data = await fetchJson(`${API_URL}/users`);
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) { console.error('users:', e); }
  };

  const fetchRoles = async () => {
    try {
      const data = await fetchJson(`${API_URL}/users/roles`);
      setRoles(Array.isArray(data) ? data : []);
    } catch (e) { }
  };

  const fetchLeads = async (accountId, listId) => {
    try {
      const accId = accountId || importForm.accountId;
      const lstId = listId !== undefined ? listId : selectedListId;
      let query = `?limit=200`;
      if (accId) query += `&accountId=${accId}`;
      if (lstId) query += `&listId=${lstId}`;

      const data = await fetchJson(`${API_URL}/leads${query}`);
      setLeads(Array.isArray(data) ? data : []);
    } catch (e) { }
  };

  // ─── Analytics fetchers ──────────────────────────────────────────────────
  const fetchOverview = async () => {
    try {
      const data = await fetch(`${API_URL}/analytics/overview`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      }).then(r => r.json());

      setOverview(data);
    } catch (e) { console.error('overview error', e); }
  };

  const fetchHourly = async () => {
    try {
      const data = await fetch(`${API_URL}/analytics/hourly`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      }).then(r => r.json());

      if (data && data.length > 0) {
        setHourly(data.map(h => ({ label: `${h.hour}h`, value: h.calls, connected: h.connected })));
      } else {
        setHourly([]);
      }
    } catch (e) { console.error('hourly error', e); }
  };

  const fetchHeatmap = async () => {
    try {
      const data = await fetchJson(`${API_URL}/analytics/heatmap`);
      if (!data || data.length === 0) {
        setHeatmapData([]);
      } else {
        setHeatmapData(data);
      }
    } catch (e) { }
  };

  const fetchScorecards = async () => {
    try {
      const data = await fetch(`${API_URL}/analytics/agents/scores`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      }).then(r => r.json());
      setScorecards(Array.isArray(data) ? data : []);
    } catch (e) { console.error('scorecards error', e); }
  };

  const fetchRecordings = async () => {
    try {
      const data = await fetch(`${API_URL}/analytics/recordings`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      }).then(r => r.json());
      setRecordings(Array.isArray(data) ? data : []);
    } catch (e) { console.error('recordings error', e); }
  };

  const handleExportCsv = () => {
    window.open(`${API_URL}/analytics/export`, '_blank');
  };

  const formatCallerOption = (entry) => {
    if (!entry) return '';
    const name = (entry.callerName || '').trim();
    const number = entry.number || '';
    const area = entry.areaCode ? ` (${entry.areaCode})` : '';
    return `${name ? `${name} - ` : ''}${number}${area}`;
  };

  // ─── Integrations fetchers ───────────────────────────────────────────────
  const fetchWebhooks = async () => {
    try {
      const data = await fetch(`${API_URL}/integrations/webhooks`).then(r => r.json());
      setWebhooks(Array.isArray(data) ? data : []);
    } catch (e) { }
  };

  const addWebhook = async () => {
    if (!newWebhookUrl) return;
    try {
      await fetch(`${API_URL}/integrations/webhooks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: newWebhookUrl, label: newWebhookLabel }),
      });
      setNewWebhookUrl('');
      setNewWebhookLabel('');
      fetchWebhooks();
    } catch (e) { alert('Failed: ' + e.message); }
  };

  const deleteWebhook = async (id) => {
    await fetch(`${API_URL}/integrations/webhooks/${id}`, { method: 'DELETE' });
    fetchWebhooks();
  };

  const saveGhlKey = async () => {
    try {
      await fetch(`${API_URL}/integrations/ghl/save-key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: ghlKey }),
      });
      setGhlStatus('✅ Key saved');
    } catch (e) { setGhlStatus('❌ Failed: ' + e.message); }
  };

  const fetchSmsTemplates = async () => {
    try {
      const data = await fetch(`${API_URL}/integrations/sms-templates`).then(r => r.json());
      setSmsTemplates(Array.isArray(data) ? data : []);
    } catch (e) { }
  };

  const addSmsTemplate = async () => {
    if (!newSmsName || !newSmsMsg) return;
    await fetch(`${API_URL}/integrations/sms-templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newSmsName, message: newSmsMsg }),
    });
    setNewSmsName('');
    setNewSmsMsg('');
    fetchSmsTemplates();
  };

  const fetchVmTemplates = async () => {
    try {
      const data = await fetch(`${API_URL}/voicemail`).then(r => r.json());
      setVmTemplates(Array.isArray(data) ? data : []);
    } catch (e) { }
  };

  // ─── CRUD handlers ───────────────────────────────────────────────────────
  const handleStartCampaign = async (id) => {
    try { await fetchJson(`${API_URL}/dialer/campaign/${id}/start`, { method: 'POST' }); }
    catch (e) { console.error(e); }
  };

  const handlePauseCampaign = async (id) => {
    try { await fetchJson(`${API_URL}/dialer/campaign/${id}/pause`, { method: 'POST' }); }
    catch (e) { console.error(e); }
  };

  const handleFileSelect = (e) => { if (e.target.files[0]) setSelectedFile(e.target.files[0]); };

  const handleCsvUpload = async () => {
    if (!selectedFile || (!importForm.listId && !importForm.newListName) || !importForm.accountId) {
      return alert('Required: Account, either Existing List or New List Name, and a CSV file.');
    }
    setIsImporting(true);
    const fd = new FormData();
    fd.append('file', selectedFile);
    if (importForm.newListName) fd.append('newListName', importForm.newListName);
    else if (importForm.listId) fd.append('listId', importForm.listId);
    else return alert('Select an existing list or enter a name for a new list.');

    fd.append('accountId', importForm.accountId);
    try {
      const res = await fetch(`${API_URL}/leads/import`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: fd,
      });
      const r = await res.json();
      if (res.ok) {
        alert(`Import done\n✅ ${r.imported || 0} imported\n⏭️ ${r.duplicates || 0} dupes\n❌ ${r.errors || 0} errors`);
        setSelectedFile(null);
        setImportForm(p => ({ ...p, newListName: '' }));
        fetchLeads(importForm.accountId);
        fetchLists(importForm.accountId);
      } else {
        alert(`Import failed: ${r.message}`);
      }
    } catch (e) { alert('Network error.'); }
    finally { setIsImporting(false); }
  };

  const handleCreateAccount = async () => {
    if (!accountForm.name) return alert('Name required');
    try {
      await fetchJson(`${API_URL}/leads/accounts`, { method: 'POST', body: JSON.stringify(accountForm) });
      setShowAccountModal(false);
      setAccountForm({ name: '' });
      fetchInitialData();
    } catch (e) { alert(`Failed: ${e.message}`); }
  };

  const handleCreateList = async () => {
    if (!listForm.name || !listForm.accountId) return alert('Name and account required');
    try {
      await fetchJson(`${API_URL}/leads/lists`, { method: 'POST', body: JSON.stringify(listForm) });
      setShowListModal(false);
      setListForm({ name: '', accountId: '', description: '' });
      fetchLists(importForm.accountId);
    } catch (e) { alert(`Failed: ${e.message}`); }
  };

  const handleCreateUser = async () => {
    if (!userForm.email || !userForm.password || !userForm.roleId || !userForm.accountId) return alert('All fields required');
    try {
      await fetchJson(`${API_URL}/users`, {
        method: 'POST',
        body: JSON.stringify({ name: userForm.name, email: userForm.email, password: userForm.password, roleId: userForm.roleId, accountId: userForm.accountId }),
      });
      setShowUserModal(false);
      setUserForm({ name: '', email: '', password: '', roleId: '', accountId: '' });
      fetchUsers();
    } catch (e) { alert(`Failed: ${e.message}`); }
  };

  const handleDeleteUser = async (id) => {
    setConfirmModal({
      show: true,
      title: 'Delete Agent',
      message: 'Are you sure you want to delete this agent? This action cannot be undone.',
      onConfirm: async () => {
        try {
          await fetch(`${API_URL}/users/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${getToken()}` },
          });
          fetchUsers();
        } catch (e) { alert('Failed to delete user'); }
      }
    });
  };

  const handleDeleteAccount = async (id) => {
    setConfirmModal({
      show: true,
      title: 'Delete Account',
      message: 'Are you sure you want to delete this account? All associated leads, lists, and campaigns will be permanently removed!',
      onConfirm: async () => {
        try {
          await fetch(`${API_URL}/leads/accounts/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${getToken()}` },
          });
          fetchAccounts();
        } catch (e) { alert('Failed to delete account'); }
      }
    });
  };

  const handleDeleteList = async (id) => {
    setConfirmModal({
      show: true,
      title: 'Delete List',
      message: 'Are you sure you want to delete this list and all its leads?',
      onConfirm: async () => {
        try {
          await fetch(`${API_URL}/leads/lists/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${getToken()}` },
          });
          fetchLists(importForm.accountId);
          fetchLeads();
        } catch (e) { alert('Failed to delete list'); }
      }
    });
  };

  const handleUpdateAccount = async () => {
    if (!manageAccount?.name) return alert('Name required');
    try {
      const { id, ...data } = manageAccount;
      await fetchJson(`${API_URL}/leads/accounts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      setManageAccount(null);
      fetchAccounts();
    } catch (e) { alert(`Failed: ${e.message}`); }
  };

  const handleDeleteLead = async (id) => {
    setConfirmModal({
      show: true,
      title: 'Delete Lead',
      message: 'Are you sure you want to delete this lead record?',
      onConfirm: async () => {
        try {
          await fetch(`${API_URL}/leads/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${getToken()}` },
          });
          setLeads(prev => prev.filter(l => l.id !== id));
        } catch (e) { alert('Failed to delete lead'); }
      }
    });
  };

  const handleSaveCampaign = async () => {
    if (!campaignForm.name || !campaignForm.accountId) return alert('Name and account required');

    const payload = { ...campaignForm };
    if (!payload.localPresence) payload.numberPool = []; // Format to empty array if not used

    // Remove fields that the backend ValidationPipe will reject for PATCH/POST
    const { id, createdAt, updatedAt, ...cleanPayload } = payload;

    try {
      if (id) {
        // Update existing
        await fetchJson(`${API_URL}/campaigns/${id}`, { method: 'PATCH', body: JSON.stringify(cleanPayload) });
      } else {
        // Create new
        await fetchJson(`${API_URL}/campaigns`, { method: 'POST', body: JSON.stringify(cleanPayload) });
      }
      setShowCampaignModal(false);
      setCampaignForm({ id: null, name: '', accountId: '', mode: 'PREDICTIVE', pacing: 3, localPresence: false, record: false, numberPool: [] });
      fetchCampaigns();
    } catch (e) { alert(`Failed: ${e.message}`); }
  };

  const openCampaignModal = (campaign = null) => {
    if (campaign) {
      setCampaignForm({ ...campaign, numberPool: campaign.numberPool || [] });
    } else {
      setCampaignForm({ id: null, name: '', accountId: '', mode: 'PREDICTIVE', pacing: 3, localPresence: false, record: false, numberPool: [] });
    }
    setShowCampaignModal(true);
  };

  const TABS = [
    { id: 'dashboard', label: '📊 Dashboard' },
    { id: 'analytics', label: '📈 Analytics' },
    { id: 'recordings', label: '🎙️ Recordings' },
    { id: 'scorecards', label: '🏆 Scorecards' },
    { id: 'leads', label: '📋 Leads' },
    { id: 'agents', label: '👥 Agents' },
    { id: 'campaigns', label: '🚀 Campaigns' },
    { id: 'integrations', label: '🔗 Integrations' },
    { id: 'accounts', label: '🏢 Accounts' },
    { id: 'compliance', label: '⚖️ Compliance' },
  ];

  const ConfirmModal = () => {
    if (!confirmModal.show) return null;
    return (
      <div className="modal-overlay" style={{ zIndex: 9999 }}>
        <div className="modal-card" style={{ maxWidth: '400px', textAlign: 'center', padding: '2.5rem', boxShadow: 'var(--shadow-float)', border: '1px solid var(--border-light)' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '1.5rem' }}>⚠️</div>
          <h2 className="font-head" style={{ marginBottom: '1rem', color: '#0b1021' }}>{confirmModal.title}</h2>
          <p className="text-dim" style={{ marginBottom: '2.5rem', lineHeight: '1.6', fontSize: '1.05rem' }}>{confirmModal.message}</p>
          <div className="flex gap-4">
            <button className="btn flex-1" style={{ background: '#f1f5f9', color: '#475569' }} onClick={() => setConfirmModal({ ...confirmModal, show: false })}>Cancel</button>
            <button className="btn flex-1" style={{ background: '#f43f5e', color: 'white', fontWeight: '800' }} onClick={() => {
              confirmModal.onConfirm();
              setConfirmModal({ ...confirmModal, show: false });
            }}>Confirm Delete</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="admin-layout">
      <aside className="sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <img src="/logo.png" alt="Voxiq" style={{ height: '26px', filter: 'brightness(0) invert(1)', opacity: 0.9 }} />
          <span>Voxiq Admin</span>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          {TABS.map(t => (
            <a key={t.id} href={`#${t.id}`} className={activeTab === t.id ? 'active' : ''} onClick={e => { e.preventDefault(); setActiveTab(t.id); }}>
              {t.label}
            </a>
          ))}
        </nav>

        {/* Quick Actions */}
        <div className="sidebar-tools">
          <div className="sidebar-section-label">Quick Create</div>
          <button className="sidebar-btn" onClick={() => { setAccountForm({ name: '' }); setShowAccountModal(true); }}>➕ New Account</button>
          <button className="sidebar-btn" onClick={() => { setListForm({ name: '', accountId: '', description: '' }); fetchAccounts(); setShowListModal(true); }}>➕ New List</button>
          <button className="sidebar-btn" onClick={() => { setUserForm({ name: '', email: '', password: '', roleId: '', accountId: '' }); fetchAccounts(); fetchRoles(); setShowUserModal(true); }}>➕ New Agent</button>
        </div>

        {/* System health + sign out */}
        <div className="sidebar-health">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.3)' }}>System</span>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: isConnected ? '#4ade80' : '#f87171' }}>{isConnected ? '● LIVE' : '● OFFLINE'}</span>
          </div>
          {authState.user && (
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', marginBottom: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {authState.user.name || authState.user.email}
            </div>
          )}
          <button className="sidebar-signout" onClick={handleLogout}>🚪 Sign Out</button>
        </div>
      </aside>

      <main className="admin-content">
        {isLoading && !authState.user && (
          <div className="flex justify-center items-center py-20"><div className="spinner">Configuring Admin Workspace...</div></div>
        )}

        {overview?.isDummy && (
          <div className="pill-status" style={{ background: '#fffbeb', color: '#d97706', marginBottom: '1rem', display: 'inline-block' }}>
            ✨ Viewing Preview Data (Systems Operational)
          </div>
        )}
        {authState.user && (
          <div className="container">
            {/* ── DASHBOARD ──────────────────────────────────────────────── */}
            {activeTab === 'dashboard' && (
              <>
                <header className="card flex justify-between items-center mb-6">
                  <div>
                    <h1 className="font-head">Operations Control</h1>
                    <p className="text-dim">Supervise teams, manage lists, monitor compliance.</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span className={`pill-status ${isConnected ? 'pill-success' : 'pill-error'}`} style={{ fontSize: '0.7rem' }}>{isConnected ? '● Live' : '● Offline'}</span>
                    <button className="btn btn-primary" style={{ fontSize: '0.8rem' }} onClick={() => setActiveTab('leads')}>
                      🚀 Import Leads
                    </button>
                  </div>
                </header>

                <div className="dynamic-grid mb-8">
                  <div className="card stat-card">
                    <span className="stat-label">Active Campaigns</span>
                    <span className="stat-val">{campaigns.filter(c => c.status === 'ACTIVE').length}<span style={{ fontSize: '0.9rem', color: 'var(--text-soft)', fontWeight: 400 }}>/{campaigns.length}</span></span>
                  </div>
                  <div className="card stat-card">
                    <span className="stat-label">Fleet Connect Rate</span>
                    <span className="stat-val" style={{ color: 'var(--emerald-500)' }}>
                      {Object.values(metrics).length > 0
                        ? (Object.values(metrics).reduce((acc, m) => acc + parseFloat(m?.connectionRate || 0), 0) / Object.values(metrics).length).toFixed(1)
                        : '0.0'}%
                    </span>
                  </div>
                  <div className="card stat-card">
                    <span className="stat-label">Live Agents</span>
                    <span className="stat-val">{users.filter(u => u.status === 'ACTIVE').length}</span>
                  </div>
                  <div className="card stat-card">
                    <span className="stat-label">Total Revenue</span>
                    <span className="stat-val" style={{ color: 'var(--emerald-500)' }}>${(overview?.revenue || 0).toLocaleString()}</span>
                  </div>
                </div>

                <div className="dynamic-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))' }}>
                  <section className="card" id="agents">
                    <h2 className="font-head mb-4">Agent Roster</h2>
                    <div className="table-container">
                      <table>
                        <thead><tr><th>Name</th><th>Email</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
                        <tbody>
                          {users.length > 0 ? users.map(u => (
                            <tr key={u.id}>
                              <td style={{ fontWeight: 600 }}>{u.name}</td>
                              <td className="text-dim">{u.email}</td>
                              <td><span className={`pill-status ${u.status === 'ACTIVE' ? 'pill-success' : 'pill-error'}`}>{u.status}</span></td>
                              <td style={{ textAlign: 'right' }}>
                                <button className="btn" style={{ padding: '0.2rem 0.5rem', color: '#f43f5e', fontSize: '0.7rem' }} onClick={() => handleDeleteUser(u.id)}>🗑️</button>
                              </td>
                            </tr>
                          )) : <tr><td colSpan="4" className="text-center py-4 text-dim">No agents found.</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <section className="card" id="campaigns-list">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="font-head">Campaigns</h2>
                      <button className="btn" style={{ fontSize: '0.7rem' }} onClick={fetchCampaigns}>Refresh</button>
                    </div>
                    <div className="flex flex-col gap-3">
                      {campaigns.length > 0 ? campaigns.map(c => (
                        <div className="card" key={c.id} style={{ padding: '1rem', background: 'var(--vx-gray-50)' }}>
                          <div className="flex justify-between items-center mb-2">
                            <div>
                              <h4>{c.name}</h4>
                              <span className="text-soft" style={{ fontSize: '0.72rem' }}>{c.mode} • {c.pacing}s pacing</span>
                            </div>
                            <div className="flex gap-2">
                              {c.status === 'PAUSED'
                                ? <button className="btn btn-primary" style={{ padding: '0.35rem 0.7rem', fontSize: '0.72rem' }} onClick={() => handleStartCampaign(c.id)}>▶ Resume</button>
                                : <button className="btn" style={{ padding: '0.35rem 0.7rem', fontSize: '0.72rem' }} onClick={() => handlePauseCampaign(c.id)}>⏸ Pause</button>
                              }
                            </div>
                          </div>
                          <div className="flex gap-6">
                            <div><span className="stat-label" style={{ fontSize: '0.6rem' }}>Calls</span><p style={{ fontWeight: 700 }}>{metrics[c.id]?.totalCalls || 0}</p></div>
                            <div><span className="stat-label" style={{ fontSize: '0.6rem' }}>Connect%</span><p style={{ fontWeight: 700, color: 'var(--emerald-500)' }}>{metrics[c.id]?.connectionRate || 0}%</p></div>
                            <span className={`pill-status ${c.status === 'ACTIVE' ? 'pill-success' : 'pill-error'}`} style={{ marginLeft: 'auto' }}>{c.status}</span>
                          </div>
                        </div>
                      )) : <div className="text-center py-4 text-dim">No campaigns yet.</div>}
                    </div>
                  </section>
                </div>
              </>
            )}

            {/* ── ANALYTICS ──────────────────────────────────────────────── */}
            {activeTab === 'analytics' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h1 className="font-head">Analytics Dashboard</h1>
                  <button className="btn btn-primary" style={{ fontSize: '0.8rem' }} onClick={handleExportCsv}>⬇️ Export CSV</button>
                </div>

                {overview && (
                  <div className="dynamic-grid mb-6">
                    {[
                      { label: 'Total Calls', val: overview.totalCalls, color: 'var(--vx-accent)' },
                      { label: "Today's Calls", val: overview.todayCalls, color: '#6366f1' },
                      { label: 'Connected', val: overview.connected, color: 'var(--emerald-500)' },
                      { label: 'Connection Rate', val: `${overview.connectionRate}%`, color: 'var(--emerald-500)' },
                      { label: 'Appointments', val: overview.appointments, color: '#f59e0b' },
                      { label: 'Appt Rate', val: `${overview.appointmentRate}%`, color: '#f59e0b' },
                      { label: 'Total Revenue', val: `$${(overview.revenue || 0).toLocaleString()}`, color: 'var(--emerald-500)' },
                      { label: 'Recordings', val: overview.recordings, color: '#8b5cf6' },
                    ].map((s, i) => (
                      <div key={i} className="card stat-card">
                        <span className="stat-label">{s.label}</span>
                        <span className="stat-val" style={{ color: s.color }}>{s.val}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* State Heatmap section */}
                <section className="card mb-6">
                  <h2 className="font-head mb-4 text-center">Geographic Density</h2>
                  <StateMap data={heatmapData} />
                  <p className="text-center text-dim mt-2" style={{ fontSize: '0.75rem' }}>Call density by Area Code mapping</p>
                </section>

                <div className="dynamic-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1.5rem' }}>
                  <div className="card">
                    <h3 className="font-head mb-4" style={{ fontSize: '1rem' }}>Calls Per Hour (Today)</h3>
                    <BarChart data={hourly.filter(h => h.value > 0 || hourly.indexOf(h) > 6 && hourly.indexOf(h) < 22)} labelKey="label" valueKey="value" color="var(--vx-accent)" />
                  </div>

                  {overview && (
                    <div className="card">
                      <h3 className="font-head mb-4" style={{ fontSize: '1rem' }}>Call Outcomes</h3>
                      <PieChart data={[
                        { label: 'Connected', value: overview.connected },
                        { label: 'No Answer', value: Math.max(0, overview.totalCalls - overview.connected) },
                        { label: 'Appointments', value: overview.appointments },
                      ].filter(d => d.value > 0)} />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── RECORDINGS ──────────────────────────────────────────────── */}
            {activeTab === 'recordings' && (
              <RecordingsTab recordings={recordings} users={users} onFetch={fetchRecordings} apiUrl={API_URL} getToken={getToken} />
            )}

            {/* ── SCORECARDS ──────────────────────────────────────────────── */}
            {activeTab === 'scorecards' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h1 className="font-head">Agent Scorecards</h1>
                  <button className="btn" style={{ fontSize: '0.8rem' }} onClick={fetchScorecards}>🔄 Refresh</button>
                </div>
                <div className="table-container card">
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Agent</th>
                        <th>Calls</th>
                        <th>Connected</th>
                        <th>Appointments</th>
                        <th>Conv%</th>
                        <th>Talk Time</th>
                        <th>Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scorecards.length > 0 ? scorecards.map((a, i) => (
                        <tr key={a.id}>
                          <td style={{ fontWeight: 700, color: i === 0 ? '#f59e0b' : 'inherit' }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</td>
                          <td style={{ fontWeight: 600 }}>{a.name}</td>
                          <td>{a.totalCalls}</td>
                          <td style={{ color: 'var(--emerald-500)' }}>{a.connected}</td>
                          <td style={{ color: '#f59e0b' }}>{a.appointments}</td>
                          <td>{a.conversionRate}%</td>
                          <td>{Math.round(a.totalTalkTime / 60)}min</td>
                          <td>
                            <span style={{ fontWeight: 700, background: 'var(--vx-accent-soft)', padding: '2px 8px', borderRadius: '999px', color: 'var(--vx-accent)' }}>{a.score}</span>
                          </td>
                        </tr>
                      )) : (
                        <tr><td colSpan="8" className="text-center py-8 text-dim">No call data yet. Scorecards appear after first calls.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── LEADS ──────────────────────────────────────────────────── */}
            {activeTab === 'leads' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h1 className="font-head">Lead Library <span className="text-dim" style={{ fontSize: '1rem', fontWeight: 400 }}>({leads.length} total)</span></h1>
                  <div className="flex gap-2">
                    <select className="input-field" style={{ width: '160px', padding: '0.5rem' }} value={importForm.accountId} onChange={e => {
                      setImportForm(p => ({ ...p, accountId: e.target.value }));
                      fetchLists(e.target.value);
                    }}>
                      <option value="">Account</option>
                      {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                    <select className="input-field" style={{ width: '160px', padding: '0.5rem' }} value={selectedListId} onChange={e => {
                      setSelectedListId(e.target.value);
                      fetchLeads(importForm.accountId, e.target.value);
                    }}>
                      <option value="">All Lists</option>
                      {availableLists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                    <button className="btn" style={{ fontSize: '0.8rem' }} onClick={() => fetchLeads(importForm.accountId, selectedListId)}>🔄 Refresh</button>
                  </div>
                </div>

                <div className="card mb-6" style={{ background: 'var(--vx-accent-soft)', border: '1px solid var(--vx-gray-200)', padding: '1.25rem' }}>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-head" style={{ fontSize: '1.1rem', color: 'var(--vx-accent)' }}>🚀 Fast Import Leads</h3>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-soft)' }}>Assign to list or create new one on the fly.</div>
                  </div>

                  <div className="flex gap-4 items-end">
                    <div style={{ flex: 1 }}>
                      <label className="stat-label">Select Existing List</label>
                      <select className="input-field" value={importForm.listId} onChange={e => setImportForm(p => ({ ...p, listId: e.target.value, newListName: '' }))}>
                        <option value="">-- Choose Existing --</option>
                        {availableLists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                      </select>
                    </div>

                    <div style={{ textAlign: 'center', padding: '0 0.5rem', fontWeight: 700, color: 'var(--vx-gray-400)' }}>OR</div>

                    <div style={{ flex: 1 }}>
                      <label className="stat-label">Create New List Name</label>
                      <input className="input-field" placeholder="e.g. Feb 25 Leads" value={importForm.newListName} onChange={e => setImportForm(p => ({ ...p, newListName: e.target.value, listId: '' }))} />
                    </div>

                    <div style={{ flex: 1 }}>
                      <label className="stat-label">Upload CSV</label>
                      <div className="flex gap-2">
                        <input type="file" onChange={handleFileSelect} style={{ fontSize: '0.8rem' }} />
                        <button className="btn btn-primary" style={{ whiteSpace: 'nowrap' }} onClick={handleCsvUpload} disabled={isImporting || (!importForm.listId && !importForm.newListName)}>
                          {isImporting ? '⌛ Importing...' : '⬆️ Start Import'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card mb-6" style={{ background: 'var(--vx-gray-50)', border: '1px dashed var(--vx-gray-300)' }}>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-head" style={{ fontSize: '1rem' }}>Active Lists</h3>
                    {selectedLists.length > 0 && (
                      <button className="btn" style={{ background: '#f43f5e', color: 'white', fontSize: '0.72rem', padding: '0.3rem 0.6rem' }} onClick={() => {
                        setConfirmModal({
                          show: true,
                          title: 'Bulk Delete Lists',
                          message: `Are you sure you want to delete ${selectedLists.length} selected lists and all their leads? This cannot be undone.`,
                          onConfirm: async () => {
                            try {
                              for (const listId of selectedLists) {
                                await fetch(`${API_URL}/leads/lists/${listId}`, {
                                  method: 'DELETE',
                                  headers: { Authorization: `Bearer ${getToken()}` },
                                });
                              }
                              setSelectedLists([]);
                              fetchLists(importForm.accountId);
                              fetchLeads();
                            } catch (e) { alert('Failed some deletions'); }
                          }
                        });
                      }}>🗑️ Delete Selected ({selectedLists.length})</button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {availableLists.length > 0 ? availableLists.map(l => (
                      <div key={l.id} className="pill-status" style={{
                        background: selectedLists.includes(l.id) ? '#fff1f2' : 'white',
                        border: selectedLists.includes(l.id) ? '1px solid #f43f5e' : '1px solid var(--border-light)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        transition: 'all 0.2s'
                      }}>
                        <input type="checkbox" style={{ cursor: 'pointer' }} checked={selectedLists.includes(l.id)} onChange={(e) => {
                          if (e.target.checked) setSelectedLists(p => [...p, l.id]);
                          else setSelectedLists(p => p.filter(id => id !== l.id));
                        }} />
                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{l.name}</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-soft)', background: 'var(--vx-gray-100)', padding: '1px 5px', borderRadius: '4px' }}>{l._count?.leads || 0}</span>
                        <button style={{ border: 'none', background: 'none', color: '#f43f5e', cursor: 'pointer', fontWeight: 800, padding: '0 0.2rem' }} onClick={() => handleDeleteList(l.id)}>✕</button>
                      </div>
                    )) : <p className="text-dim" style={{ fontSize: '0.8rem' }}>No lists for this account.</p>}
                  </div>
                </div>
                {(() => {
                  const sorted = [...leads].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                  const totalPages = Math.ceil(sorted.length / LEADS_PER_PAGE);
                  const pageLeads = sorted.slice((leadsPage - 1) * LEADS_PER_PAGE, leadsPage * LEADS_PER_PAGE);
                  return (
                    <>
                      <div className="card table-container">
                        <table>
                          <thead><tr><th>#</th><th>Name</th><th>Phone</th><th>List</th><th>State</th><th>Status</th><th>Uploaded</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
                          <tbody>
                            {pageLeads.length > 0 ? pageLeads.map((l, i) => (
                              <tr key={l.id}>
                                <td className="text-dim" style={{ fontSize: '0.75rem' }}>{(leadsPage - 1) * LEADS_PER_PAGE + i + 1}</td>
                                <td style={{ fontWeight: 600 }}>{l.firstName} {l.lastName}</td>
                                <td style={{ fontFamily: 'monospace' }}>{l.phone}</td>
                                <td><span className="pill-status" style={{ fontSize: '0.65rem', background: 'var(--vx-accent-soft)' }}>{l.list?.name || '—'}</span></td>
                                <td className="text-dim">{l.state || '—'}</td>
                                <td><span className={`pill-status ${l.status === 'NEW' ? 'pill-success' : 'pill-dim'}`} style={{ fontSize: '0.7rem' }}>{l.status}</span></td>
                                <td className="text-dim" style={{ fontSize: '0.78rem' }}>{new Date(l.createdAt).toLocaleDateString()}</td>
                                <td style={{ textAlign: 'right' }}>
                                  <button className="btn" style={{ padding: '0.2rem 0.5rem', color: '#f43f5e', fontSize: '0.7rem' }} onClick={() => handleDeleteLead(l.id)}>🗑️</button>
                                </td>
                              </tr>
                            )) : <tr><td colSpan="8" className="text-center py-8 text-dim">No leads. Upload a CSV to get started.</td></tr>}
                          </tbody>
                        </table>
                      </div>
                      {totalPages > 1 && (
                        <div className="flex justify-center items-center gap-2 mt-4" style={{ flexWrap: 'wrap' }}>
                          <button className="btn" style={{ fontSize: '0.78rem', padding: '0.35rem 0.7rem' }} disabled={leadsPage === 1} onClick={() => setLeadsPage(p => p - 1)}>← Prev</button>
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                            <button key={p} className={`btn ${p === leadsPage ? 'btn-primary' : ''}`} style={{ fontSize: '0.78rem', padding: '0.35rem 0.65rem', minWidth: '36px' }} onClick={() => setLeadsPage(p)}>{p}</button>
                          ))}
                          <button className="btn" style={{ fontSize: '0.78rem', padding: '0.35rem 0.7rem' }} disabled={leadsPage === totalPages} onClick={() => setLeadsPage(p => p + 1)}>Next →</button>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}

            {/* ── AGENTS ─────────────────────────────────────────────────── */}
            {activeTab === 'agents' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h1 className="font-head">Agent Management</h1>
                  <div className="flex gap-2">
                    <button className="btn" style={{ background: 'white', border: '1px solid var(--vx-gray-200)' }} onClick={fetchUsers}>🔄 Refresh Agents</button>
                    <button className="btn btn-primary" onClick={() => { setUserForm({ name: '', email: '', password: '', roleId: '', accountId: '' }); fetchAccounts(); fetchRoles(); setShowUserModal(true); }}>➕ Add Agent</button>
                  </div>
                </div>

                <div className="card table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Agent</th>
                        <th>Account</th>
                        <th>Outbound Number</th>
                        <th>Assigned Lists</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(u => {
                        const account = accounts.find(a => a.id === u.accountId);
                        const numberPool = account?.numberPool || [];
                        const assignedListIds = u.AgentList?.map(al => al.listId) || [];

                        return (
                          <tr key={u.id}>
                            <td>
                              <div style={{ fontWeight: 700 }}>{u.name}</div>
                              <div className="text-dim" style={{ fontSize: '0.75rem' }}>{u.email}</div>
                            </td>
                            <td>{account?.name || '---'}</td>
                            <td>
                              <div className="text-dim mb-1" style={{ fontSize: '0.65rem' }}>Pool Size: {numberPool.length}</div>
                              <select
                                className="input-field"
                                style={{ padding: '0.3rem 0.5rem', fontSize: '0.8rem' }}
                                value={u.callerNumber || ''}
                                onChange={async (e) => {
                                  const val = e.target.value || null;
                                  await fetchJson(`${API_URL}/users/${u.id}/caller-number`, {
                                    method: 'PATCH',
                                    body: JSON.stringify({ callerNumber: val })
                                  });
                                  fetchUsers();
                                }}
                              >
                                <option value="">--- Auto ---</option>
                                {numberPool.map((n, i) => {
                                  const isUsed = users.some(other => other.id !== u.id && other.callerNumber === n.number);
                                  return (
                                    <option key={i} value={n.number} disabled={isUsed}>
                                      {formatCallerOption(n)}{isUsed ? ' [Used]' : ''}
                                    </option>
                                  );
                                })}
                              </select>
                            </td>
                            <td>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '350px', marginBottom: '8px' }}>
                                {u.AgentList?.map(al => (
                                  <div
                                    key={al.listId}
                                    className="badge"
                                    style={{
                                      background: 'var(--vx-accent)',
                                      color: 'white',
                                      fontSize: '0.65rem',
                                      padding: '2px 8px',
                                      borderRadius: '4px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                    }}
                                  >
                                    {al.list?.name}
                                    <button
                                      style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 0, fontSize: '0.8rem', fontWeight: 700 }}
                                      onClick={async () => {
                                        const newListIds = assignedListIds.filter(id => id !== al.listId);
                                        await fetchJson(`${API_URL}/users/${u.id}/lists`, {
                                          method: 'PUT',
                                          body: JSON.stringify({ listIds: newListIds })
                                        });
                                        fetchUsers();
                                      }}
                                    >
                                      ×
                                    </button>
                                  </div>
                                ))}
                              </div>
                              <select
                                className="input-field"
                                style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', width: '100%' }}
                                value=""
                                onChange={async (e) => {
                                  const listId = e.target.value;
                                  if (!listId) return;
                                  const newListIds = [...assignedListIds, listId];
                                  await fetchJson(`${API_URL}/users/${u.id}/lists`, {
                                    method: 'PUT',
                                    body: JSON.stringify({ listIds: newListIds })
                                  });
                                  fetchUsers();
                                }}
                              >
                                <option value="">+ Assign List</option>
                                {availableLists
                                  .filter(l => l.accountId === u.accountId && !assignedListIds.includes(l.id))
                                  .map(list => (
                                    <option key={list.id} value={list.id}>
                                      {list.name}
                                    </option>
                                  ))}
                              </select>
                            </td>
                            <td>
                              <span className={`badge ${u.status === 'ACTIVE' ? 'badge-success' : 'badge-warning'}`}>{u.status}</span>
                            </td>
                            <td>
                              <button className="btn" style={{ padding: '0.4rem', color: '#f43f5e' }} onClick={() => setConfirmModal({
                                show: true,
                                title: 'Remove User?',
                                message: `Are you sure you want to remove ${u.name}?`,
                                onConfirm: async () => {
                                  await fetch(`${API_URL}/users/${u.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` } });
                                  fetchUsers();
                                }
                              })}>🗑</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── CAMPAIGNS ──────────────────────────────────────────────── */}
            {activeTab === 'campaigns' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h1 className="font-head">Campaign Management</h1>
                  <div className="flex gap-2">
                    <button className="btn btn-primary" onClick={() => openCampaignModal()}>+ New Campaign</button>
                    <button className="btn" onClick={fetchCampaigns}>🔄 Refresh</button>
                  </div>
                </div>
                <div className="flex flex-col gap-4">
                  {campaigns.map(c => (
                    <div key={c.id} className="card" style={{ padding: '1.25rem' }}>
                      <div className="flex justify-between items-center mb-4">
                        <div>
                          <h3 style={{ fontWeight: 700 }}>{c.name}</h3>
                          <span className="text-dim" style={{ fontSize: '0.8rem' }}>{c.mode} mode • {c.pacing}s pacing</span>
                        </div>
                        <div className="flex gap-2 items-center">
                          <span className={`pill-status ${c.status === 'ACTIVE' ? 'pill-success' : 'pill-error'}`}>{c.status}</span>
                          {c.status === 'PAUSED'
                            ? <button className="btn btn-primary" style={{ fontSize: '0.8rem' }} onClick={() => handleStartCampaign(c.id)}>▶ Start</button>
                            : <button className="btn" style={{ fontSize: '0.8rem' }} onClick={() => handlePauseCampaign(c.id)}>⏸ Pause</button>
                          }
                          <button className="btn" style={{ fontSize: '0.8rem', marginLeft: '0.5rem', background: 'var(--vx-gray-100)' }} onClick={() => openCampaignModal(c)}>⚙️ Edit</button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {campaigns.length === 0 && <div className="card text-center py-12 text-dim">No campaigns found.</div>}
                </div>
              </div>
            )}

            {/* ── ACCOUNTS ───────────────────────────────────────────────── */}
            {activeTab === 'accounts' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h1 className="font-head">Accounts & Numbers</h1>
                  <button className="btn btn-primary" onClick={() => { setAccountForm({ name: '' }); setShowAccountModal(true); }}>+ New Account</button>
                </div>
                <div className="flex flex-col gap-4">
                  {accounts.map(a => (
                    <div key={a.id} className="card" style={{ padding: '1.25rem' }}>
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 style={{ fontWeight: 700, fontSize: '1.1rem' }}>{a.name}</h3>
                          <p className="text-dim" style={{ fontSize: '0.8rem' }}>
                            {users.filter(u => u.accountId === a.id).length} Agents •
                            {availableLists.filter(l => l.accountId === a.id).length} Lists •
                            {a.numberPool?.length || 0} Numbers
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button className="btn" style={{ background: 'var(--vx-gray-100)' }} onClick={() => setManageAccount({ ...a, numberPool: a.numberPool || [] })}>⚙️ Manage</button>
                          <button className="btn" style={{ background: '#fee2e2', color: '#b91c1c' }} onClick={() => handleDeleteAccount(a.id)}>🗑️ Delete</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── INTEGRATIONS ──────────────────────────────────────────── */}
            {activeTab === 'integrations' && (
              <div>
                <h1 className="font-head mb-6">Integrations</h1>
                <div className="dynamic-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1.5rem' }}>
                  <section className="card">
                    <h2 className="font-head mb-4" style={{ fontSize: '1.05rem' }}>⚡ Zapier / Outbound Webhooks</h2>
                    <div className="flex flex-col gap-2 mb-4">
                      <input className="input-field" placeholder="Webhook URL" value={newWebhookUrl} onChange={e => setNewWebhookUrl(e.target.value)} />
                      <button className="btn btn-primary" onClick={addWebhook}>Add Webhook</button>
                    </div>
                    {webhooks.map(w => (
                      <div key={w.id} className="flex justify-between items-center mb-2 p-2 bg-slate-50 rounded">
                        <span style={{ fontSize: '0.8rem' }}>{w.url}</span>
                        <button className="btn" style={{ color: '#f43f5e' }} onClick={() => deleteWebhook(w.id)}>✕</button>
                      </div>
                    ))}
                  </section>

                  <section className="card">
                    <h2 className="font-head mb-4" style={{ fontSize: '1.05rem' }}>🔗 GoHighLevel</h2>
                    <input className="input-field mb-2" type="password" placeholder="API Key" value={ghlKey} onChange={e => setGhlKey(e.target.value)} />
                    <button className="btn btn-primary" onClick={saveGhlKey}>Save</button>
                  </section>

                  <section className="card">
                    <h2 className="font-head mb-4" style={{ fontSize: '1.05rem' }}>💬 SMS Templates</h2>
                    <div className="flex flex-col gap-2">
                      <input className="input-field" placeholder="Name" value={newSmsName} onChange={e => setNewSmsName(e.target.value)} />
                      <textarea className="input-field" placeholder="Message" value={newSmsMsg} onChange={e => setNewSmsMsg(e.target.value)} />
                      <button className="btn btn-primary" onClick={addSmsTemplate}>Add</button>
                    </div>
                  </section>

                  <section className="card">
                    <h2 className="font-head mb-4" style={{ fontSize: '1.05rem' }}>📬 Voicemail Library</h2>
                    <p className="text-dim mb-4" style={{ fontSize: '0.82rem' }}>Upload MP3 voicemails.</p>
                    {accounts.length > 0 && (
                      <form onSubmit={async (e) => {
                        e.preventDefault();
                        const fd = new FormData(e.target);
                        await fetch(`${API_URL}/voicemail`, { method: 'POST', body: fd });
                        fetchVmTemplates();
                      }} className="flex flex-col gap-2">
                        <input name="name" className="input-field" placeholder="Name" required />
                        <select name="accountId" className="input-field" required>
                          {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                        <input name="file" type="file" accept="audio/*" required />
                        <button className="btn btn-primary">Upload</button>
                      </form>
                    )}
                  </section>
                </div>
              </div>
            )}

            {/* ── COMPLIANCE ─────────────────────────────────────────────── */}
            {activeTab === 'compliance' && (
              <div>
                <h1 className="font-head mb-6">Compliance Guard</h1>
                <div className="dynamic-grid">
                  {[
                    { label: 'DNC SCRUBBING', value: 'SYSTEM ACTIVE', color: 'var(--vx-accent)' },
                    { label: 'QUIET HOURS', value: 'ENFORCED', color: 'var(--vx-accent)' },
                    { label: 'AUDIT TRAIL', value: '100% COMPLIANT', color: 'var(--emerald-500)' },
                  ].map((item, i) => (
                    <div key={i} className="card">
                      <span className="stat-label">{item.label}</span>
                      <p className="mt-2" style={{ fontWeight: 700, color: item.color }}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {showAccountModal && (
        <div className="flex-center" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000 }}>
          <div className="card" style={{ width: '400px' }}>
            <h2 className="font-head mb-4">Create New Account</h2>
            <input className="input-field mb-4" placeholder="Account Name" autoFocus value={accountForm.name} onChange={e => setAccountForm({ name: e.target.value })} onKeyDown={e => e.key === 'Enter' && handleCreateAccount()} />
            <div className="flex gap-2">
              <button className="btn btn-primary flex-1" onClick={handleCreateAccount}>Create</button>
              <button className="btn flex-1" style={{ background: 'var(--vx-gray-100)' }} onClick={() => setShowAccountModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showListModal && (
        <div className="flex-center" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000 }}>
          <div className="card" style={{ width: '400px' }}>
            <h2 className="font-head mb-4">Create New List</h2>
            <select className="input-field mb-2" value={listForm.accountId} onChange={e => setListForm(p => ({ ...p, accountId: e.target.value }))}>
              <option value="">Select Account</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <input className="input-field mb-2" placeholder="List Name" autoFocus value={listForm.name} onChange={e => setListForm(p => ({ ...p, name: e.target.value }))} onKeyDown={e => e.key === 'Enter' && handleCreateList()} />
            <input className="input-field mb-4" placeholder="Description (optional)" value={listForm.description} onChange={e => setListForm(p => ({ ...p, description: e.target.value }))} />
            <div className="flex gap-2">
              <button className="btn btn-primary flex-1" onClick={handleCreateList}>Create</button>
              <button className="btn flex-1" style={{ background: 'var(--vx-gray-100)' }} onClick={() => setShowListModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showUserModal && (
        <div className="flex-center" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, padding: '1rem' }}>
          <div className="card" style={{ width: '450px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 className="font-head mb-4">Add New Agent</h2>
            <div className="flex flex-col gap-3">
              <input className="input-field" placeholder="Full Name" autoFocus value={userForm.name} onChange={e => setUserForm(p => ({ ...p, name: e.target.value }))} />
              <input className="input-field" placeholder="Email" type="email" value={userForm.email} onChange={e => setUserForm(p => ({ ...p, email: e.target.value }))} />
              <input className="input-field" placeholder="Password (min 8 chars)" type="password" value={userForm.password} onChange={e => setUserForm(p => ({ ...p, password: e.target.value }))} />
              <select className="input-field" value={userForm.accountId} onChange={e => setUserForm(p => ({ ...p, accountId: e.target.value }))}>
                <option value="">Assign Account</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <select className="input-field" value={userForm.roleId} onChange={e => setUserForm(p => ({ ...p, roleId: e.target.value }))}>
                <option value="">Select Role</option>
                {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              <div className="flex gap-2 mt-2">
                <button className="btn btn-primary flex-1" onClick={handleCreateUser}>Create Agent</button>
                <button className="btn flex-1" style={{ background: 'var(--vx-gray-100)' }} onClick={() => setShowUserModal(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {manageAccount && (
        <div className="flex-center" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, padding: '1rem' }}>
          <div className="card" style={{ width: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 className="font-head mb-4 text-primary">Manage Account</h2>
            <div className="flex flex-col gap-4">
              <div>
                <label className="stat-label">Account Name</label>
                <input className="input-field" value={manageAccount.name} onChange={e => setManageAccount({ ...manageAccount, name: e.target.value })} />
              </div>

              <div style={{ background: 'var(--vx-gray-50)', padding: '1rem', borderRadius: '12px' }}>
                <h4 className="font-head mb-2" style={{ fontSize: '0.9rem' }}>Account-Wide Phone Pool</h4>
                <p className="text-dim mb-3" style={{ fontSize: '0.75rem' }}>These numbers will be shared across all campaigns assigned to this account if campaign-level pools are empty. `Caller Name` is what we send to Telnyx as outbound display name.</p>

                <div className="flex flex-col gap-2 mb-3">
                  {manageAccount.numberPool.map((entry, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input className="input-field" style={{ flex: 1, padding: '0.5rem' }} placeholder="Area Code" value={entry.areaCode} onChange={e => {
                        const newPool = [...manageAccount.numberPool];
                        newPool[idx].areaCode = e.target.value;
                        setManageAccount({ ...manageAccount, numberPool: newPool });
                      }} />
                      <input className="input-field" style={{ flex: 2, padding: '0.5rem' }} placeholder="Caller ID (+1...)" value={entry.number} onChange={e => {
                        const newPool = [...manageAccount.numberPool];
                        newPool[idx].number = e.target.value;
                        setManageAccount({ ...manageAccount, numberPool: newPool });
                      }} />
                      <input className="input-field" style={{ flex: 2, padding: '0.5rem' }} placeholder="Caller Name (e.g. RMESSAGES LLC)" value={entry.callerName || ''} onChange={e => {
                        const newPool = [...manageAccount.numberPool];
                        newPool[idx].callerName = e.target.value;
                        setManageAccount({ ...manageAccount, numberPool: newPool });
                      }} />
                      <button className="btn" style={{ color: '#f43f5e', background: 'white' }} onClick={() => {
                        setManageAccount({ ...manageAccount, numberPool: manageAccount.numberPool.filter((_, i) => i !== idx) });
                      }}>✕</button>
                    </div>
                  ))}
                </div>
                <button className="btn w-full font-bold mb-4" style={{ background: 'var(--vx-accent)', color: 'white' }} onClick={() => {
                  const raw = prompt("Paste numbers (one per line, e.g. +12125551234):");
                  if (raw) {
                    const lines = raw.split(/[\n,]/).map(l => l.trim()).filter(l => l.length > 5);
                    const newEntries = lines.map(num => {
                      const areaCode = num.replace(/\D/g, '').substring(1, 4); // Basic US area code extraction
                      return { number: num, areaCode: areaCode, callerName: '' };
                    });
                    setManageAccount({ ...manageAccount, numberPool: [...(manageAccount.numberPool || []), ...newEntries] });
                  }
                }}>⚡ Bulk Add Numbers (Paste List)</button>

                <button className="btn w-full" style={{ background: 'white', border: '1px dashed var(--vx-gray-300)', fontSize: '0.8rem' }} onClick={() => {
                  setManageAccount({ ...manageAccount, numberPool: [...(manageAccount.numberPool || []), { areaCode: '', number: '', callerName: '' }] });
                }}>+ Add Individual Number</button>
              </div>

              <div className="flex gap-2 mt-2">
                <button className="btn btn-primary flex-1" onClick={handleUpdateAccount}>Update Account</button>
                <button className="btn flex-1" style={{ background: 'var(--vx-gray-100)' }} onClick={() => setManageAccount(null)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCampaignModal && (
        <div className="flex-center" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, padding: '1rem' }}>
          <div className="card" style={{ width: '550px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 className="font-head mb-4">{campaignForm.id ? 'Edit Campaign' : 'Create Campaign'}</h2>
            <div className="flex flex-col gap-3">
              <input className="input-field" placeholder="Campaign Name" value={campaignForm.name} onChange={e => setCampaignForm(p => ({ ...p, name: e.target.value }))} />

              <select className="input-field" value={campaignForm.accountId} onChange={e => setCampaignForm(p => ({ ...p, accountId: e.target.value }))} disabled={!!campaignForm.id}>
                <option value="">Assign Account</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-dim" style={{ fontSize: '0.8rem', marginBottom: '0.2rem', display: 'block' }}>Dialing Mode</label>
                  <select className="input-field" value={campaignForm.mode} onChange={e => setCampaignForm(p => ({ ...p, mode: e.target.value }))}>
                    <option value="PREDICTIVE">Predictive</option>
                    <option value="POWER">Power</option>
                    <option value="PREVIEW">Preview</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-dim" style={{ fontSize: '0.8rem', marginBottom: '0.2rem', display: 'block' }}>Pacing (seconds)</label>
                  <input className="input-field" type="number" min="1" max="60" value={campaignForm.pacing} onChange={e => setCampaignForm(p => ({ ...p, pacing: parseInt(e.target.value) || 3 }))} />
                </div>
              </div>

              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2" style={{ fontSize: '0.9rem' }}>
                  <input type="checkbox" checked={campaignForm.record} onChange={e => setCampaignForm(p => ({ ...p, record: e.target.checked }))} />
                  Record Calls
                </label>
                <label className="flex items-center gap-2" style={{ fontSize: '0.9rem' }}>
                  <input type="checkbox" checked={campaignForm.localPresence} onChange={e => setCampaignForm(p => ({ ...p, localPresence: e.target.checked }))} />
                  Enable Local Presence
                </label>
              </div>

              {campaignForm.localPresence && (
                <div style={{ background: 'var(--vx-gray-50)', padding: '1rem', borderRadius: '8px', marginTop: '0.5rem' }}>
                  <h4 className="font-head mb-2" style={{ fontSize: '0.9rem' }}>Local Presence Number Pool</h4>
                  <p className="text-dim mb-3" style={{ fontSize: '0.75rem' }}>Add outbound caller IDs assigned to specific area codes. `Caller Name` is sent as the outbound display name.</p>

                  <div className="flex flex-col gap-2 mb-3">
                    {campaignForm.numberPool.map((entry, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input className="input-field flex-1" style={{ padding: '0.4rem', fontSize: '0.8rem' }} placeholder="Area Code (e.g. 212)" value={entry.areaCode} onChange={e => {
                          const newPool = [...campaignForm.numberPool];
                          newPool[idx].areaCode = e.target.value;
                          setCampaignForm(p => ({ ...p, numberPool: newPool }));
                        }} />
                        <input className="input-field flex-2" style={{ padding: '0.4rem', fontSize: '0.8rem' }} placeholder="Caller ID (e.g. +12125551234)" value={entry.number} onChange={e => {
                          const newPool = [...campaignForm.numberPool];
                          newPool[idx].number = e.target.value;
                          setCampaignForm(p => ({ ...p, numberPool: newPool }));
                        }} />
                        <input className="input-field flex-2" style={{ padding: '0.4rem', fontSize: '0.8rem' }} placeholder="Caller Name (e.g. RMESSAGES LLC)" value={entry.callerName || ''} onChange={e => {
                          const newPool = [...campaignForm.numberPool];
                          newPool[idx].callerName = e.target.value;
                          setCampaignForm(p => ({ ...p, numberPool: newPool }));
                        }} />
                        <button className="btn" style={{ padding: '0.4rem 0.6rem', background: '#f43f5e', color: 'white' }} onClick={() => {
                          const newPool = campaignForm.numberPool.filter((_, i) => i !== idx);
                          setCampaignForm(p => ({ ...p, numberPool: newPool }));
                        }}>✕</button>
                      </div>
                    ))}
                  </div>

                  <button className="btn" style={{ fontSize: '0.75rem', background: 'white', border: '1px solid var(--vx-gray-200)' }} onClick={() => {
                    setCampaignForm(p => ({ ...p, numberPool: [...p.numberPool, { areaCode: '', number: '', state: '', callerName: '' }] }));
                  }}>+ Add Number to Pool</button>
                </div>
              )}

              <div className="flex gap-2 mt-4">
                <button className="btn btn-primary flex-1" onClick={handleSaveCampaign}>Save Campaign</button>
                <button className="btn flex-1" style={{ background: 'var(--vx-gray-100)' }} onClick={() => setShowCampaignModal(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal />
    </div>
  );
}

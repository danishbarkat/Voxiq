import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  BarChart3,
  Mic,
  Trophy,
  Users,
  Rocket,
  Settings,
  ShieldCheck,
  LogOut,
  Plus,
  RefreshCcw,
  Building2,
  ListTodo,
  Webhook,
  Zap,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Menu,
  MessageSquare
} from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { API_URL } from '../config/env';
import { fetchJson } from '../lib/api';
import { getToken, setToken, clearToken } from '../lib/auth';
import ProWorldMap from '../components/ProWorldMap';
import PricingCards from '../components/PricingCards';

const COUNTRY_LABELS = {
  US: 'United States', GB: 'United Kingdom', PK: 'Pakistan', IN: 'India', CN: 'China',
  AU: 'Australia', CA: 'Canada', DE: 'Germany', FR: 'France', JP: 'Japan', BR: 'Brazil',
  MX: 'Mexico', SA: 'Saudi Arabia', AE: 'UAE', NG: 'Nigeria', ZA: 'South Africa',
  RU: 'Russia', TR: 'Turkey', IT: 'Italy', ES: 'Spain', KR: 'South Korea', ID: 'Indonesia',
  PH: 'Philippines', BD: 'Bangladesh', EG: 'Egypt', MY: 'Malaysia', TH: 'Thailand',
  VN: 'Vietnam', NL: 'Netherlands', SE: 'Sweden', NO: 'Norway', DK: 'Denmark',
  FI: 'Finland', PL: 'Poland', UA: 'Ukraine', PT: 'Portugal', IL: 'Israel', NZ: 'New Zealand',
  AR: 'Argentina', CO: 'Colombia', PE: 'Peru', AF: 'Afghanistan', LK: 'Sri Lanka',
  MA: 'Morocco', DZ: 'Algeria', TN: 'Tunisia', KE: 'Kenya', ET: 'Ethiopia',
};

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
  const [agentPickerExpanded, setAgentPickerExpanded] = useState(false);

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
  const sortedUsers = [...users].sort((a, b) => (a?.name || '').localeCompare(b?.name || ''));
  const selectedAgentName = sortedUsers.find(u => u.id === filterAgent)?.name || 'All Agents';

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
        <div style={{ flex: '1 1 360px' }}>
          <label style={{ fontSize: '0.7rem', color: '#6366f1', fontWeight: 700, display: 'block', marginBottom: '4px' }}>👤 FILTER BY AGENT</label>
          <button
            type="button"
            className="input-field"
            onClick={() => setAgentPickerExpanded(prev => !prev)}
            style={{
              width: '100%',
              background: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
              cursor: 'pointer',
              marginBottom: agentPickerExpanded ? '0.55rem' : 0,
            }}
          >
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0.36rem 0.78rem',
              borderRadius: '999px',
              background: filterAgent ? 'linear-gradient(135deg, #6366f1, #7c3aed)' : '#eef2ff',
              color: filterAgent ? '#fff' : '#4338ca',
              fontSize: '0.76rem',
              fontWeight: 700,
              maxWidth: 'calc(100% - 28px)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {selectedAgentName}
            </span>
            <span style={{ color: '#6366f1', fontSize: '0.95rem', fontWeight: 700 }}>
              {agentPickerExpanded ? '▴' : '▾'}
            </span>
          </button>
          <div
            className="input-field"
            style={{
              width: '100%',
              background: '#fff',
              padding: '0.65rem',
              display: agentPickerExpanded ? 'flex' : 'none',
              flexWrap: 'wrap',
              alignItems: 'flex-start',
              gap: '0.55rem',
              maxHeight: '112px',
              overflowY: 'auto',
            }}
          >
            {[
              { id: '', name: 'All Agents' },
              ...sortedUsers.map(user => ({ id: user.id, name: user.name || 'Unnamed Agent' })),
            ].map(agent => {
              const isActive = filterAgent === agent.id;
              return (
                <button
                  key={agent.id || 'all-agents'}
                  type="button"
                  onClick={() => {
                    setFilterAgent(agent.id);
                    setAgentPickerExpanded(false);
                  }}
                  style={{
                    border: `1px solid ${isActive ? '#4338ca' : '#dbe4ff'}`,
                    background: isActive ? 'linear-gradient(135deg, #6366f1, #7c3aed)' : '#f8faff',
                    color: isActive ? '#fff' : '#334155',
                    borderRadius: '999px',
                    padding: '0.5rem 0.8rem',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    lineHeight: 1,
                    whiteSpace: 'nowrap',
                    boxShadow: isActive ? '0 8px 18px rgba(99, 102, 241, 0.24)' : 'none',
                  }}
                >
                  {agent.name}
                </button>
              );
            })}
          </div>
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
            setSearch(''); setFilterAgent(''); setFilterDateFrom(''); setFilterDateTo(''); setAgentPickerExpanded(false);
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

function HistoryBadge({ item }) {
  const key = `${item.type}:${item.category}`;
  const palette = {
    'call:missed': { bg: '#fee2e2', fg: '#b91c1c', label: 'Missed Call' },
    'call:received': { bg: '#dcfce7', fg: '#15803d', label: 'Received Call' },
    'call:dialed': { bg: '#dbeafe', fg: '#1d4ed8', label: 'Dialed Call' },
    'sms:received': { bg: '#ecfeff', fg: '#0f766e', label: 'Received SMS' },
    'sms:dialed': { bg: '#ede9fe', fg: '#6d28d9', label: 'Sent SMS' },
  };
  const style = palette[key] || { bg: '#f1f5f9', fg: '#475569', label: item.type };
  return (
    <span style={{ background: style.bg, color: style.fg, borderRadius: 999, padding: '4px 10px', fontSize: '0.72rem', fontWeight: 700 }}>
      {style.label}
    </span>
  );
}

function HistoryTab({ historyFeed, historyStats, onRefresh, loading }) {
  const formatDuration = (seconds) => {
    if (seconds == null || Number.isNaN(seconds)) return '—';
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-head" style={{ marginBottom: 0 }}>Activity History</h1>
          <p className="text-dim" style={{ fontSize: '0.8rem', marginTop: 4 }}>
            Refresh-safe 30 day company history for calls and messages.
          </p>
        </div>
        <button className="btn" style={{ fontSize: '0.8rem' }} onClick={onRefresh} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      <div className="dynamic-grid mb-6">
        {[
          { label: 'Missed Calls', value: historyStats?.missedCalls ?? 0, color: '#dc2626' },
          { label: 'Received Calls', value: historyStats?.receivedCalls ?? 0, color: '#16a34a' },
          { label: 'Dialed Calls', value: historyStats?.dialedCalls ?? 0, color: '#2563eb' },
          { label: 'Messages', value: historyStats?.totalMessages ?? 0, color: '#7c3aed' },
          { label: 'Inbound SMS', value: historyStats?.inboundMessages ?? 0, color: '#0f766e' },
          { label: 'Outbound SMS', value: historyStats?.outboundMessages ?? 0, color: '#6d28d9' },
        ].map((card) => (
          <div key={card.label} className="card stat-card">
            <span className="stat-label">{card.label}</span>
            <span className="stat-val" style={{ color: card.color }}>{card.value}</span>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Contact</th>
                <th>Agent</th>
                <th>Status</th>
                <th>Time</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {historyFeed.length > 0 ? historyFeed.map((item) => {
                const name = item.lead ? `${item.lead.firstName || ''} ${item.lead.lastName || ''}`.trim() : '';
                const contact = item.toNumber || item.fromNumber || item.lead?.phone || 'Unknown';
                const time = item.startedAt || item.createdAt;
                return (
                  <tr key={`${item.type}-${item.id}`}>
                    <td><HistoryBadge item={item} /></td>
                    <td>
                      <div style={{ fontWeight: 700 }}>{name || contact}</div>
                      {name && <div className="text-dim" style={{ fontSize: '0.75rem' }}>{contact}</div>}
                    </td>
                    <td>{item.agent?.name || 'System'}</td>
                    <td>
                      <span className="pill-status" style={{ fontSize: '0.68rem' }}>
                        {item.status || (item.direction === 'inbound' ? 'received' : 'sent')}
                      </span>
                    </td>
                    <td>{time ? new Date(time).toLocaleString() : '—'}</td>
                    <td style={{ maxWidth: 320 }}>
                      {item.type === 'call' ? (
                        <div style={{ fontSize: '0.78rem', color: '#475569' }}>
                          <div>Duration: <strong>{formatDuration(item.durationSeconds)}</strong></div>
                          {item.disposition && <div>Disposition: {item.disposition}</div>}
                          {item.recordingUrl && <a href={item.recordingUrl} target="_blank" rel="noreferrer">Recording</a>}
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.78rem', color: '#475569', whiteSpace: 'pre-wrap' }}>
                          {item.body}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-dim">No history found yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function DashboardPlanBanner({ token }) {
  const [plan, setPlan] = useState(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradePkg, setUpgradePkg] = useState('');
  const [upgradeBilling, setUpgradeBilling] = useState('monthly');
  const [upgradeSeats, setUpgradeSeats] = useState(1);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/auth/my-plan`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null).then(setPlan).catch(() => {});
  }, [token]);

  if (!plan?.packageName) return null;

  const COLORS = { Trial: '#6366f1', Basic: '#3b82f6', Pro: '#8b5cf6', Business: '#f59e0b', Enterprise: '#10b981' };
  const color = COLORS[plan.packageName] || '#6366f1';
  const seats = plan.seatCount || plan.agentLimit || 1;
  const FEATURES = [
    { key: 'canOutboundCall', label: 'Outbound' },
    { key: 'canInboundCall', label: 'Inbound' },
    { key: 'canSendSms', label: 'SMS' },
    { key: 'canRecord', label: 'Recording' },
    { key: 'canSendWhatsapp', label: 'WhatsApp' },
    { key: 'canAiInsights', label: 'AI Insights' },
  ];

  const daysLeft = plan.isTrial && plan.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(plan.trialEndsAt) - Date.now()) / 86400000))
    : null;

  return (
    <>
      <div style={{
        background: '#fff',
        border: '1px solid #e8ecf4',
        borderRadius: 16,
        marginBottom: 20,
        overflow: 'hidden',
        boxShadow: '0 1px 4px rgba(15,23,42,0.05)',
      }}>
        {/* Color bar */}
        <div style={{ height: 4, background: `linear-gradient(90deg, ${color}, ${color}88)` }} />
        <div style={{ padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          {/* Icon + plan name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
            <div style={{ width: 46, height: 46, borderRadius: 13, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
              {plan.packageName === 'Trial' ? '🎯' : plan.packageName === 'Basic' ? '📞' : plan.packageName === 'Pro' ? '⚡' : plan.packageName === 'Business' ? '💼' : '🏢'}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>{plan.packageName} Plan</span>
                {plan.isTrial && (
                  <span style={{ background: '#fef2f2', color: '#ef4444', fontSize: '0.62rem', fontWeight: 800, padding: '2px 8px', borderRadius: 6 }}>
                    {daysLeft != null ? `${daysLeft}d left` : 'TRIAL'}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <span style={{ background: `${color}15`, color, padding: '2px 9px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700 }}>
                  {seats} seat{seats !== 1 ? 's' : ''}
                </span>
                {plan.billingCycle && (
                  <span style={{ background: '#f1f5f9', color: '#64748b', padding: '2px 9px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 600, textTransform: 'capitalize' }}>
                    {plan.billingCycle}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Feature chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, flex: 1 }}>
            {FEATURES.map(({ key, label }) => (
              <span key={key} style={{
                padding: '5px 11px', borderRadius: 8, fontSize: '0.72rem', fontWeight: 600,
                background: plan[key] ? '#f0fdf4' : '#f8fafc',
                color: plan[key] ? '#16a34a' : '#cbd5e1',
                border: `1px solid ${plan[key] ? '#bbf7d0' : '#e2e8f0'}`,
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <span style={{ fontSize: 11 }}>{plan[key] ? '✓' : '✗'}</span>
                {label}
              </span>
            ))}
          </div>

          {/* Upgrade button */}
          <button
            onClick={() => { setUpgradePkg(plan.packageName); setUpgradeBilling(plan.billingCycle || 'monthly'); setShowUpgrade(true); }}
            style={{ background: color, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem', whiteSpace: 'nowrap', flexShrink: 0, boxShadow: `0 4px 14px ${color}40` }}
          >
            Upgrade Plan →
          </button>
        </div>
      </div>

      {showUpgrade && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, overflow: 'auto', padding: '32px 16px' }}>
          <div style={{ background: '#f8fafc', borderRadius: '24px', maxWidth: '1150px', margin: '0 auto', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Upgrade Your Plan</h2>
              <button onClick={() => setShowUpgrade(false)} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#64748b' }}>✕</button>
            </div>
            <PricingCards
              selectedPackage={upgradePkg || plan.packageName}
              selectedBilling={upgradeBilling}
              onBillingChange={setUpgradeBilling}
              onSelect={(pkgId, s) => { setUpgradePkg(pkgId); setUpgradeSeats(s); }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => setShowUpgrade(false)} style={{ padding: '9px 18px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
              <button
                onClick={() => { setErrorModal(`Upgrade request submitted: ${upgradePkg} — ${upgradeSeats} seat${upgradeSeats > 1 ? 's' : ''}, ${upgradeBilling}. Your Voxiq account manager will apply this shortly.`); setShowUpgrade(false); }}
                style={{ padding: '9px 20px', borderRadius: '10px', background: color, color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}
              >
                Request Upgrade →
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SidebarPlanWidget({ token, collapsed }) {
  const [plan, setPlan] = useState(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradePkg, setUpgradePkg] = useState('');
  const [upgradeBilling, setUpgradeBilling] = useState('monthly');
  const [upgradeSeats, setUpgradeSeats] = useState(1);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/auth/my-plan`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null).then(setPlan).catch(() => {});
  }, [token]);

  if (!plan?.packageName) return null;

  const COLORS = { Trial: '#6366f1', Basic: '#3b82f6', Pro: '#8b5cf6', Business: '#f59e0b', Enterprise: '#10b981' };
  const color = COLORS[plan.packageName] || '#6366f1';
  const seats = plan.seatCount || plan.agentLimit || 1;

  return (
    <>
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: collapsed ? '10px 0' : '10px 0', marginBottom: 4 }}>
        {collapsed ? (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div
              title={`${plan.packageName} · ${seats} seat${seats !== 1 ? 's' : ''}`}
              onClick={() => { setUpgradePkg(plan.packageName); setShowUpgrade(true); }}
              style={{ width: 10, height: 10, borderRadius: '50%', background: color, cursor: 'pointer', boxShadow: `0 0 6px ${color}80` }}
            />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.3)' }}>Current Plan</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{plan.packageName}</span>
                {plan.isTrial && <span style={{ fontSize: '0.6rem', color: '#f87171', fontWeight: 800, flexShrink: 0 }}>TRIAL</span>}
              </div>
              <span style={{ background: `${color}28`, color, fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: 6, flexShrink: 0 }}>
                {seats} seat{seats !== 1 ? 's' : ''}
              </span>
            </div>
            {plan.isTrial && plan.trialEndsAt && (
              <div style={{ fontSize: '0.68rem', color: '#fca5a5', fontWeight: 500 }}>
                Ends {new Date(plan.trialEndsAt).toLocaleDateString()}
              </div>
            )}
            <button
              onClick={() => { setUpgradePkg(plan.packageName); setUpgradeBilling(plan.billingCycle || 'monthly'); setShowUpgrade(true); }}
              style={{ marginTop: 2, width: '100%', padding: '6px 0', borderRadius: 8, border: `1px solid ${color}55`, background: `${color}18`, color, fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer', transition: 'background 0.2s' }}
            >
              Upgrade Plan
            </button>
          </div>
        )}
      </div>

      {showUpgrade && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, overflow: 'auto', padding: '32px 16px' }}>
          <div style={{ background: '#f8fafc', borderRadius: '24px', maxWidth: '1150px', margin: '0 auto', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Upgrade Your Plan</h2>
              <button onClick={() => setShowUpgrade(false)} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#64748b' }}>✕</button>
            </div>
            <PricingCards
              selectedPackage={upgradePkg || plan.packageName}
              selectedBilling={upgradeBilling}
              onBillingChange={setUpgradeBilling}
              onSelect={(pkgId, s) => { setUpgradePkg(pkgId); setUpgradeSeats(s); }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => setShowUpgrade(false)} style={{ padding: '9px 18px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
              <button
                onClick={() => { setErrorModal(`Upgrade request submitted: ${upgradePkg} — ${upgradeSeats} seat${upgradeSeats > 1 ? 's' : ''}, ${upgradeBilling}. Your Voxiq account manager will apply this shortly.`); setShowUpgrade(false); }}
                style={{ padding: '9px 20px', borderRadius: '10px', background: color, color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}
              >
                Request Upgrade →
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function PlanCard({ token }) {
  const [plan, setPlan] = useState(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradePackage, setUpgradePackage] = useState(null);
  const [upgradeBilling, setUpgradeBilling] = useState('monthly');
  const [upgradeSeats, setUpgradeSeats] = useState(1);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/auth/my-plan`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null).then(setPlan).catch(() => {});
  }, [token]);

  if (!plan || !plan.packageName) return null;

  const FEATURE_LABELS = [
    { key: 'canOutboundCall', label: 'Outbound Calls' },
    { key: 'canInboundCall', label: 'Inbound Calls' },
    { key: 'canSendSms', label: 'SMS' },
    { key: 'canRecord', label: 'Recordings' },
    { key: 'canSendWhatsapp', label: 'WhatsApp' },
    { key: 'canAiInsights', label: 'AI Insights' },
  ];

  const PACKAGE_COLORS = { Trial: '#6366f1', Basic: '#3b82f6', Pro: '#8b5cf6', Business: '#f59e0b', Enterprise: '#10b981' };
  const pkgColor = PACKAGE_COLORS[plan.packageName] || '#6366f1';

  return (
    <>
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem', borderLeft: `4px solid ${pkgColor}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>Current Plan</span>
              <span style={{ background: `${pkgColor}20`, color: pkgColor, padding: '3px 12px', borderRadius: '999px', fontWeight: 700, fontSize: '0.82rem' }}>
                {plan.packageName}
              </span>
              {plan.isTrial && plan.trialEndsAt && (
                <span style={{ color: '#ef4444', fontSize: '0.78rem', fontWeight: 600 }}>
                  Trial ends {new Date(plan.trialEndsAt).toLocaleDateString()}
                </span>
              )}
              {plan.billingCycle && (
                <span style={{ background: '#f1f5f9', color: '#64748b', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>
                  {plan.billingCycle}
                </span>
              )}
              {(plan.seatCount > 1 || plan.agentLimit > 1) && (
                <span style={{ background: '#fef3c7', color: '#d97706', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>
                  {plan.seatCount || plan.agentLimit} seats
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' }}>
              {FEATURE_LABELS.map(({ key, label }) => (
                <span key={key} style={{
                  padding: '3px 9px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600,
                  background: plan[key] ? '#dcfce7' : '#f1f5f9',
                  color: plan[key] ? '#16a34a' : '#94a3b8',
                }}>
                  {plan[key] ? '✓' : '✗'} {label}
                </span>
              ))}
            </div>
          </div>
          <button
            onClick={() => { setUpgradePackage(plan.packageName); setUpgradeBilling(plan.billingCycle || 'monthly'); setShowUpgrade(true); }}
            style={{ background: pkgColor, color: '#fff', border: 'none', borderRadius: '10px', padding: '9px 18px', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem', whiteSpace: 'nowrap' }}
          >
            Upgrade Plan
          </button>
        </div>
      </div>

      {showUpgrade && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, overflow: 'auto', padding: '32px 16px' }}>
          <div style={{ background: '#f8fafc', borderRadius: '24px', maxWidth: '1150px', margin: '0 auto', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Upgrade Your Plan</h2>
              <button onClick={() => setShowUpgrade(false)} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#64748b' }}>✕</button>
            </div>
            <PricingCards
              selectedPackage={upgradePackage || plan.packageName}
              selectedBilling={upgradeBilling}
              onBillingChange={setUpgradeBilling}
              onSelect={(pkgId, seats) => { setUpgradePackage(pkgId); setUpgradeSeats(seats); }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => setShowUpgrade(false)} style={{ padding: '9px 18px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
              <button
                onClick={() => { setErrorModal(`Upgrade request submitted: ${upgradePackage} — ${upgradeSeats} seat${upgradeSeats > 1 ? 's' : ''}, ${upgradeBilling}. Your Voxiq account manager will apply this shortly.`); setShowUpgrade(false); }}
                style={{ padding: '9px 20px', borderRadius: '10px', background: pkgColor, color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}
              >
                Request Upgrade →
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const PLAN_PRICES = { Basic: 24.99, Pro: 39.99, Business: 69.99, Enterprise: 0 };

function TrialBanner({ token }) {
  const navigate = useNavigate();
  const [plan, setPlan] = useState(null);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/auth/my-plan`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null).then(setPlan).catch(() => {});
  }, [token]);

  if (!plan || !plan.packageName) return null;

  // Case 2: Subscription overdue — account is INACTIVE but not a trial
  if (plan.status === 'INACTIVE' && !plan.isTrial) {
    const seats = plan.seatCount || plan.agentLimit || 1;
    const pricePerSeat = PLAN_PRICES[plan.packageName] || 0;
    const totalDue = (seats * pricePerSeat).toFixed(2);
    const checkoutUrl = `/checkout?plan=${plan.packageName}&seats=${seats}&billing=${plan.billingCycle || 'monthly'}&source=upgrade`;
    return (
      <div style={{ background: 'linear-gradient(135deg, #fff7ed, #ffedd5)', border: '1.5px solid #fb923c', borderRadius: 12, padding: '14px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14, color: '#c2410c' }}>⚠️ Subscription payment overdue</div>
          <div style={{ fontSize: 12, color: '#9a3412', marginTop: 3 }}>
            Your account is paused. Amount due: <strong>${totalDue}</strong> ({seats} seat{seats > 1 ? 's' : ''} × ${pricePerSeat}/seat · {plan.packageName} plan)
          </div>
        </div>
        <button
          onClick={() => navigate(checkoutUrl)}
          style={{ background: '#f97316', color: '#fff', borderRadius: 8, padding: '8px 16px', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          Pay Now →
        </button>
      </div>
    );
  }

  // Case 1: Trial expired — show upgrade to paid plan
  if (plan.trialExpired) {
    return (
      <div style={{ background: 'linear-gradient(135deg, #fef2f2, #fee2e2)', border: '1.5px solid #fca5a5', borderRadius: 12, padding: '14px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14, color: '#991b1b' }}>⚠️ Your free trial has expired</div>
          <div style={{ fontSize: 12, color: '#b91c1c', marginTop: 3 }}>Calls and SMS are paused. Choose a plan to continue.</div>
        </div>
        <button
          onClick={() => navigate('/checkout?source=upgrade')}
          style={{ background: '#ef4444', color: '#fff', borderRadius: 8, padding: '8px 16px', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          Upgrade Now →
        </button>
      </div>
    );
  }

  // Trial still active — show days remaining
  if (plan.isTrial) {
    const urgent = plan.trialDaysLeft <= 2;
    return (
      <div style={{ background: urgent ? 'linear-gradient(135deg, #fff7ed, #ffedd5)' : 'linear-gradient(135deg, #eff6ff, #dbeafe)', border: `1.5px solid ${urgent ? '#fb923c' : '#93c5fd'}`, borderRadius: 12, padding: '14px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14, color: urgent ? '#c2410c' : '#1d4ed8' }}>
            {urgent ? '⏰' : '🎯'} Free Trial — {plan.trialDaysLeft} day{plan.trialDaysLeft !== 1 ? 's' : ''} remaining
          </div>
          <div style={{ fontSize: 12, color: urgent ? '#9a3412' : '#1e40af', marginTop: 3 }}>
            Outbound calls only · Upgrade anytime to unlock full features
          </div>
        </div>
        <button
          onClick={() => navigate('/checkout?source=upgrade')}
          style={{ background: urgent ? '#f97316' : '#3b82f6', color: '#fff', borderRadius: 8, padding: '8px 16px', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          Upgrade Plan →
        </button>
      </div>
    );
  }

  return null;
}

export default function Admin() {
  const navigate = useNavigate();
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1440,
  );
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem('voxiq_sidebar_collapsed') === 'true'; } catch { return false; }
  });

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem('voxiq_sidebar_collapsed', String(next)); } catch {}
      return next;
    });
  };
  const { socket, isConnected, disconnectForLogout } = useSocket();
  const [activeTab, setActiveTab] = useState(() => {
    try { return localStorage.getItem('voxiq_active_tab') || 'dashboard'; } catch { return 'dashboard'; }
  });

  const switchTab = (tab) => {
    setActiveTab(tab);
    try { localStorage.setItem('voxiq_active_tab', tab); } catch {}
  };
  const [campaigns, setCampaigns] = useState([]);
  const [users, setUsers] = useState([]);
  const [resetRequests, setResetRequests] = useState([]);
  const [metrics, setMetrics] = useState({});
  const [isLoading, setIsLoading] = useState(!!getToken());
  const [error, setError] = useState(null);
  const [errorModal, setErrorModal] = useState(null);
  const [importForm, setImportForm] = useState({ listId: '', accountId: '', newListName: '' });
  const [availableLists, setAvailableLists] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [companyNumberInventory, setCompanyNumberInventory] = useState({ assignedNumbers: [], availableNumbers: [] });
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
  const [historyFeed, setHistoryFeed] = useState([]);
  const [historyStats, setHistoryStats] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [heatmapData, setHeatmapData] = useState([]);

  // SMS Messaging tab
  const [smsConversations, setSmsConversations] = useState([]);
  const [smsActiveThread, setSmsActiveThread] = useState(null);
  const [smsMessages, setSmsMessages] = useState([]);
  const [smsInput, setSmsInput] = useState('');
  const [smsSendingMsg, setSmsSendingMsg] = useState(false);
  const [smsAgentFilter, setSmsAgentFilter] = useState('all');

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
  const [importResult, setImportResult] = useState(null);
  const [editAgentModal, setEditAgentModal] = useState(null);
  const [editAgentForm, setEditAgentForm] = useState({ name: '', email: '', password: '' });
  const [selectedLists, setSelectedLists] = useState([]);
  const [selectedListId, setSelectedListId] = useState('');

  const [authState, setAuthState] = useState({
    email: 'admin@example.com',
    password: 'Admin123!',
    token: getToken(),
    user: null,
    loginError: null,
  });
  const currentRole = authState.user?.role?.toLowerCase() || '';
  const isSuperAdmin = currentRole === 'superadmin';
  const isAdmin = currentRole === 'admin';
  const companyAccountId = authState.user?.accountId || accounts[0]?.id || '';
  const isInactiveAccount = authState.user?.accountStatus === 'INACTIVE';
  const companyName = accounts.find(a => a.id === companyAccountId)?.name || '';
  const [activationMessage, setActivationMessage] = useState('');
  const [activationLoading, setActivationLoading] = useState(false);

  useEffect(() => {
    if (authState.token) {
      if (!authState.user) {
        fetchProfile();
      } else if (!isInactiveAccount) {
        fetchInitialData();
        fetchRoles();
      } else {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, [authState.token, !!authState.user, isInactiveAccount]);

  useEffect(() => {
    if (importForm.accountId) fetchLists(importForm.accountId);
    else setAvailableLists([]);
  }, [importForm.accountId]);

  useEffect(() => {
    if (activeTab === 'analytics') {
      fetchOverview();
      fetchHourly();
      fetchScorecards();
      fetchHeatmap();
    }
    if (activeTab === 'history') fetchHistory();
    if (activeTab === 'recordings') fetchRecordings();
    if (activeTab === 'integrations') {
      fetchWebhooks();
      fetchSmsTemplates();
      fetchVmTemplates();
    }
    if (activeTab === 'agents') {
      fetchUsers();
      fetchResetRequests();
    }
    if (activeTab === 'sms') fetchAdminSmsConversations();
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
    disconnectForLogout();
    clearToken();
    navigate('/login');
  };

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isTablet = viewportWidth <= 1100;
  const isMobile = viewportWidth <= 768;

  const handleRequestActivation = async () => {
    try {
      setActivationLoading(true);
      await fetchJson(`${API_URL}/auth/reactivation-request`, {
        method: 'POST',
        body: JSON.stringify({ message: activationMessage }),
      });
      setErrorModal('Activation request sent to the Voxiq support team.');
    } catch (e) {
      setErrorModal(e.message || 'Something went wrong.');
    } finally {
      setActivationLoading(false);
    }
  };

  const fetchInitialData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await Promise.allSettled([fetchCampaigns(), fetchUsers(), fetchLeads(), fetchAccounts(), fetchResetRequests(), fetchCompanyNumberInventory()]);
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
      const defaultAccountId = authState.user?.accountId || sanitized[0]?.id || '';
      if (defaultAccountId && !importForm.accountId) {
        setImportForm(prev => ({ ...prev, accountId: defaultAccountId }));
      }
      if (defaultAccountId) {
        setListForm(prev => ({ ...prev, accountId: prev.accountId || defaultAccountId }));
        setUserForm(prev => ({ ...prev, accountId: prev.accountId || defaultAccountId }));
        setCampaignForm(prev => ({ ...prev, accountId: prev.accountId || defaultAccountId }));
      }
    } catch (e) { console.error('accounts:', e); }
  };

  const fetchCompanyNumberInventory = async () => {
    if (currentRole !== 'admin' && currentRole !== 'manager') {
      setCompanyNumberInventory({ assignedNumbers: [], availableNumbers: [] });
      return;
    }
    try {
      const data = await fetchJson(`${API_URL}/users/company-number-inventory`);
      setCompanyNumberInventory({
        assignedNumbers: Array.isArray(data?.assignedNumbers) ? data.assignedNumbers : [],
        availableNumbers: Array.isArray(data?.availableNumbers) ? data.availableNumbers : [],
      });
    } catch (e) {
      console.error('company-number-inventory:', e);
      setCompanyNumberInventory({ assignedNumbers: [], availableNumbers: [] });
    }
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

  const fetchResetRequests = async () => {
    try {
      const data = await fetchJson(`${API_URL}/auth/reset-requests`);
      setResetRequests(Array.isArray(data) ? data : []);
    } catch (e) { setResetRequests([]); }
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
      const data = await fetchJson(`${API_URL}/analytics/country-heatmap`);
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

  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      const data = await fetchJson(`${API_URL}/analytics/history?limit=150`);
      setHistoryFeed(Array.isArray(data?.items) ? data.items : []);
      setHistoryStats(data?.stats || null);
    } catch (e) {
      console.error('history error', e);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleExportCsv = () => {
    window.open(`${API_URL}/analytics/export`, '_blank');
  };

  const formatCallerOption = (entry) => {
    if (!entry) return '';
    const number = entry.number || '';
    const area = entry.areaCode ? ` ${entry.areaCode}` : '';
    return `${number}${area}`;
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
    } catch (e) { setErrorModal(e.message || 'Something went wrong.'); }
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
      const accountId = companyAccountId;
      const query = accountId ? `?accountId=${encodeURIComponent(accountId)}` : '';
      const data = await fetch(`${API_URL}/voicemail/templates${query}`, {
        headers: { Authorization: `Bearer ${getToken() || ''}` },
      }).then(r => r.ok ? r.json() : []);
      setVmTemplates(Array.isArray(data) ? data : []);
    } catch (e) { }
  };

  const fetchAdminSmsConversations = async () => {
    try {
      const data = await fetchJson(`${API_URL}/sms/conversations`);
      setSmsConversations(Array.isArray(data) ? data : []);
    } catch (e) { console.error('fetchAdminSmsConversations:', e); }
  };

  const fetchAdminSmsThread = async (contactNumber) => {
    try {
      const encoded = encodeURIComponent(contactNumber);
      const data = await fetchJson(`${API_URL}/sms/conversations/${encoded}`);
      setSmsMessages(Array.isArray(data) ? data : []);
    } catch (e) { console.error('fetchAdminSmsThread:', e); }
  };

  const sendAdminSmsMessage = async () => {
    if (!smsInput.trim() || !smsActiveThread) return;
    setSmsSendingMsg(true);
    try {
      await fetchJson(`${API_URL}/sms/send`, {
        method: 'POST',
        body: JSON.stringify({ to: smsActiveThread, body: smsInput.trim() }),
      });
      setSmsInput('');
      await fetchAdminSmsThread(smsActiveThread);
    } catch (e) { setErrorModal('SMS failed: ' + (e.message || 'Unknown error')); }
    finally { setSmsSendingMsg(false); }
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
      return setErrorModal('Required: Account, either Existing List or New List Name, and a CSV file.');
    }
    setIsImporting(true);
    const fd = new FormData();
    fd.append('file', selectedFile);
    if (importForm.newListName) fd.append('newListName', importForm.newListName);
    else if (importForm.listId) fd.append('listId', importForm.listId);
    else return setErrorModal('Select an existing list or enter a name for a new list.');

    fd.append('accountId', importForm.accountId);
    try {
      const res = await fetch(`${API_URL}/leads/import`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: fd,
      });
      const r = await res.json();
      if (res.ok) {
        setImportResult({ imported: r.imported || 0, duplicates: r.duplicates || 0, errors: r.errors || 0 });
        setSelectedFile(null);
        setImportForm(p => ({ ...p, newListName: '' }));
        fetchLeads(importForm.accountId);
        fetchLists(importForm.accountId);
      } else {
        setImportResult({ error: r.message || 'Import failed' });
      }
    } catch (e) { setErrorModal('Network error. Please try again.'); }
    finally { setIsImporting(false); }
  };

  const handleCreateAccount = async () => {
    if (!accountForm.name) return setErrorModal('Name required.');
    try {
      await fetchJson(`${API_URL}/leads/accounts`, { method: 'POST', body: JSON.stringify(accountForm) });
      setShowAccountModal(false);
      setAccountForm({ name: '' });
      fetchInitialData();
    } catch (e) { setErrorModal(e.message || 'Something went wrong.'); }
  };

  const handleCreateList = async () => {
    if (!listForm.name || !listForm.accountId) return setErrorModal('List name and account are required.');
    try {
      await fetchJson(`${API_URL}/leads/lists`, { method: 'POST', body: JSON.stringify(listForm) });
      setShowListModal(false);
      setListForm({ name: '', accountId: companyAccountId, description: '' });
      fetchLists(importForm.accountId);
    } catch (e) { setErrorModal(e.message || 'Something went wrong.'); }
  };

  const [createdAgentCreds, setCreatedAgentCreds] = useState(null);

  const handleCreateUser = async () => {
    if (!userForm.email || !userForm.password || !userForm.accountId) return setErrorModal('Email, password and account are required.');
    if (userForm.password.length < 8) return setErrorModal('Password must be at least 8 characters.');
    // auto-pick Agent role if not superadmin
    let roleId = userForm.roleId;
    if (!roleId) {
      const agentRole = roles.find(r => r.name.toLowerCase() === 'agent');
      if (!agentRole) return setErrorModal('Agent role not found. Contact Voxiq support.');
      roleId = agentRole.id;
    }
    try {
      await fetchJson(`${API_URL}/users`, {
        method: 'POST',
        body: JSON.stringify({ name: userForm.name, email: userForm.email, password: userForm.password, roleId, accountId: userForm.accountId }),
      });
      setShowUserModal(false);
      setCreatedAgentCreds({ name: userForm.name, email: userForm.email, password: userForm.password });
      setUserForm({ name: '', email: '', password: '', roleId: '', accountId: companyAccountId });
      fetchUsers();
    } catch (e) { setErrorModal(e.message || 'Something went wrong.'); }
  };

  const handleEditAgent = async () => {
    if (!editAgentModal) return;
    const payload = {};
    if (editAgentForm.name.trim())  payload.name = editAgentForm.name.trim();
    if (editAgentForm.email.trim()) payload.email = editAgentForm.email.trim();
    if (editAgentForm.password.trim()) {
      if (editAgentForm.password.length < 8) return setErrorModal('Password must be at least 8 characters.');
      payload.password = editAgentForm.password.trim();
    }
    if (!Object.keys(payload).length) return setErrorModal('No changes made.');
    try {
      // If password is being reset and there's a reset request, use the dedicated endpoint
      if (payload.password && resetRequests.some(r => r.id === editAgentModal.id)) {
        await fetchJson(`${API_URL}/users/${editAgentModal.id}/admin-reset-password`, {
          method: 'POST',
          body: JSON.stringify({ newPassword: payload.password }),
        });
        delete payload.password;
      }
      if (Object.keys(payload).length) {
        await fetchJson(`${API_URL}/users/${editAgentModal.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      }
      setEditAgentModal(null);
      fetchUsers();
      fetchResetRequests();
    } catch (e) { setErrorModal(e.message || 'Something went wrong.'); }
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
        } catch (e) { setErrorModal('Failed to delete user.'); }
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
        } catch (e) { setErrorModal('Failed to delete account.'); }
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
        } catch (e) { setErrorModal('Failed to delete list.'); }
      }
    });
  };

  const handleUpdateAccount = async () => {
    if (!manageAccount?.name) return setErrorModal('Account name is required.');
    try {
      const { id, ...data } = manageAccount;
      await fetchJson(`${API_URL}/leads/accounts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      setManageAccount(null);
      fetchAccounts();
    } catch (e) { setErrorModal(e.message || 'Something went wrong.'); }
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
        } catch (e) { setErrorModal('Failed to delete lead.'); }
      }
    });
  };

  const handleSaveCampaign = async () => {
    if (!campaignForm.name || !campaignForm.accountId) return setErrorModal('Campaign name and account are required.');

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
    } catch (e) { setErrorModal(e.message || 'Something went wrong.'); }
  };

  const openCampaignModal = (campaign = null) => {
    if (campaign) {
      setCampaignForm({ ...campaign, numberPool: campaign.numberPool || [] });
    } else {
      setCampaignForm({ id: null, name: '', accountId: '', mode: 'PREDICTIVE', pacing: 3, localPresence: false, record: false, numberPool: [] });
    }
    setShowCampaignModal(true);
  };

  const generateAgentId = (companyName, adminEmail, existingUsers) => {
    // prefix: first word of company name, lowercase, alphanumeric only, max 8 chars
    const prefix = (companyName || 'agent').split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) || 'agent';
    // count existing agents + 1
    const agentCount = existingUsers.filter(u => u.role?.name?.toLowerCase() === 'agent').length + 1;
    const num = String(agentCount).padStart(3, '0');
    // domain from admin email
    const domain = (adminEmail || '').split('@')[1] || 'voxiq.internal';
    return { username: `${prefix}${num}`, email: `${prefix}${num}@${domain}` };
  };

  const TABS = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={18} /> },
    { id: 'history', label: 'History', icon: <RefreshCcw size={18} /> },
    { id: 'recordings', label: 'Recordings', icon: <Mic size={18} /> },
    { id: 'scorecards', label: 'Scorecards', icon: <Trophy size={18} /> },
    { id: 'leads', label: 'Leads', icon: <ListTodo size={18} /> },
    { id: 'agents', label: 'Agents', icon: <Users size={18} /> },
    { id: 'campaigns', label: 'Campaigns', icon: <Rocket size={18} /> },
    { id: 'integrations', label: 'Integrations', icon: <Webhook size={18} /> },
    { id: 'accounts', label: 'Accounts', icon: <Building2 size={18} /> },
    { id: 'compliance', label: 'Compliance', icon: <ShieldCheck size={18} /> },
    { id: 'sms', label: 'SMS', icon: <MessageSquare size={18} /> },
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
    <div className={`admin-layout ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>

      {/* Error Modal */}
      {errorModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: '36px 32px 28px', maxWidth: 420, width: '100%', textAlign: 'center', boxShadow: '0 8px 40px rgba(0,0,0,0.18)' }}>
            <div style={{ background: '#f8fafc', borderRadius: 12, padding: '10px 14px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
              <img src="/logo.png" alt="Voxiq" style={{ height: 32 }} />
            </div>
            <div style={{ fontSize: '1rem', color: '#0f172a', fontWeight: 600, marginBottom: 8, lineHeight: 1.5 }}>{errorModal}</div>
            <button
              onClick={() => setErrorModal(null)}
              style={{ marginTop: 16, background: '#6366f1', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 32px', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' }}
            >OK</button>
          </div>
        </div>
      )}

      <aside className="sidebar">
        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: isSidebarCollapsed ? 'center' : 'flex-start', gap: 8, padding: '4px 2px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 12 }}>
          <div style={{ background: '#fff', borderRadius: 10, padding: '6px 8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src="/logo.png" alt="Voxiq" style={{ height: isSidebarCollapsed ? 22 : 28, display: 'block' }} />
          </div>
          {!isSidebarCollapsed && (
            <div style={{ paddingLeft: 2 }}>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#fff', lineHeight: 1.2 }}>{companyName || 'Voxiq'}</div>
              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)', fontWeight: 600, marginTop: 2 }}>Admin Dashboard</div>
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minHeight: 0, scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
          <nav className="sidebar-nav" style={{ flex: 'none' }}>
            {TABS.map(t => (
              <a
                key={t.id}
                href={`#${t.id}`}
                title={isSidebarCollapsed ? t.label : ''}
                className={activeTab === t.id ? 'active' : ''}
                onClick={e => { e.preventDefault(); switchTab(t.id); }}
              >
                {t.icon}
                {!isSidebarCollapsed && t.label}
              </a>
            ))}
          </nav>

          {/* Status + Plan — inside scroll area, below tabs */}
          {!isSidebarCollapsed && (
            <div style={{ marginTop: 12, padding: '0 2px' }}>
              {/* Status row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', marginBottom: 4 }}>
                <span style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.3)' }}>Status</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: isConnected ? '#4ade80' : '#f87171', boxShadow: isConnected ? '0 0 8px #4ade80' : 'none' }} />
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, color: isConnected ? '#4ade80' : '#f87171' }}>{isConnected ? 'LIVE' : 'OFFLINE'}</span>
                </div>
              </div>
              {/* Plan widget */}
              {!isSuperAdmin && (
                <div style={{ padding: '0 2px' }}>
                  <SidebarPlanWidget token={authState.token} collapsed={false} />
                </div>
              )}
            </div>
          )}
          {isSidebarCollapsed && !isSuperAdmin && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 10 }}>
              <SidebarPlanWidget token={authState.token} collapsed={true} />
            </div>
          )}
        </div>

        {/* Sign out only */}
        <div style={{ padding: '10px 0 0', borderTop: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
          {authState.user && !isSidebarCollapsed && (
            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500, padding: '0 4px' }}>
              {authState.user.name || authState.user.email}
            </div>
          )}
          <button className="sidebar-signout" onClick={handleLogout} title={isSidebarCollapsed ? 'Sign Out' : ''}>
            <LogOut size={14} style={{ marginRight: isSidebarCollapsed ? '0' : '8px' }} />
            {!isSidebarCollapsed && 'Sign Out'}
          </button>
        </div>
      </aside>

      {/* Sidebar toggle — fixed so it's always visible regardless of overflow */}
      {!isMobile && (
        <button
          onClick={toggleSidebar}
          title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            position: 'fixed',
            top: '50%',
            transform: 'translateY(-50%)',
            left: isSidebarCollapsed ? 58 : 246,
            zIndex: 300,
            width: 28, height: 28, borderRadius: '50%',
            background: '#6366f1', border: '2.5px solid #fff',
            boxShadow: '0 2px 10px rgba(99,102,241,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#fff',
            transition: 'left 0.25s ease',
          }}
        >
          {isSidebarCollapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>
      )}

      <main className="admin-content">
        {isLoading && !authState.user && (
          <div style={{ position: 'fixed', inset: 0, background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
            <img src="/logo.png" alt="Voxiq" style={{ height: 48, marginBottom: 28, opacity: 0.9 }} />
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              border: '4px solid #e0e7ff',
              borderTopColor: '#6366f1',
              animation: 'vx-spin 0.75s linear infinite',
            }} />
            <style>{`@keyframes vx-spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {overview?.isDummy && (
          <div className="pill-status" style={{ background: '#fffbeb', color: '#d97706', marginBottom: '1rem', display: 'inline-block' }}>
            ✨ Viewing Preview Data (Systems Operational)
          </div>
        )}
        {authState.user && isInactiveAccount && (
          <div className="container">
            <div className="card" style={{ maxWidth: '760px', margin: '2rem auto', borderLeft: '4px solid #f59e0b' }}>
              <h1 className="font-head" style={{ fontSize: '1.8rem', marginBottom: '0.75rem' }}>Company Access Paused</h1>
              <p className="text-dim" style={{ marginBottom: '1rem', lineHeight: 1.7 }}>
                Your company workspace is currently inactive. Agents and managers cannot log in or use dialing, SMS, leads, or campaigns until the Voxiq super admin reactivates your account.
              </p>
              <p className="text-dim" style={{ marginBottom: '1rem', lineHeight: 1.7 }}>
                As company admin, you can still sign in here to request reactivation.
              </p>
              <textarea
                className="input-field"
                rows={4}
                placeholder="Optional note for the super admin team"
                value={activationMessage}
                onChange={(e) => setActivationMessage(e.target.value)}
                style={{ marginBottom: '1rem' }}
              />
              <div className="flex gap-2">
                <button className="btn btn-primary" onClick={handleRequestActivation} disabled={activationLoading}>
                  {activationLoading ? 'Sending Request...' : 'Request Activation'}
                </button>
                <button className="btn" style={{ background: 'var(--vx-gray-100)' }} onClick={handleLogout}>
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}
        {authState.user && !isInactiveAccount && (
          <div className="container">
            <TrialBanner token={authState.token} />
            {/* ── DASHBOARD ──────────────────────────────────────────────── */}
            {activeTab === 'dashboard' && (
              <>
                {/* ── Hero header ── */}
                <div style={{
                  background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
                  borderRadius: 20, padding: '28px 32px', marginBottom: 24,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  flexWrap: 'wrap', gap: 16, position: 'relative', overflow: 'hidden',
                }}>
                  <div style={{ position: 'absolute', top: -60, right: -60, width: 220, height: 220, borderRadius: '50%', background: 'rgba(99,102,241,0.12)', pointerEvents: 'none' }} />
                  <div style={{ position: 'absolute', bottom: -40, left: 200, width: 160, height: 160, borderRadius: '50%', background: 'rgba(139,92,246,0.08)', pointerEvents: 'none' }} />
                  <div style={{ position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: isConnected ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', padding: '4px 10px', borderRadius: 20, border: `1px solid ${isConnected ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: isConnected ? '#10b981' : '#ef4444' }} />
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: isConnected ? '#6ee7b7' : '#fca5a5' }}>{isConnected ? 'System Live' : 'Offline'}</span>
                      </div>
                      <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                    </div>
                    <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 900, color: '#fff', fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.02em' }}>
                      {companyName || 'Operations Control'}
                    </h1>
                    <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)' }}>Real-time oversight and system management</p>
                  </div>
                  <button
                    onClick={() => switchTab('leads')}
                    style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8, background: '#6366f1', color: '#fff', border: 'none', borderRadius: 12, padding: '11px 22px', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', boxShadow: '0 4px 20px rgba(99,102,241,0.4)', flexShrink: 0 }}
                  >
                    <Rocket size={16} /> Import Leads
                  </button>
                </div>

                {/* ── 4-col stats row ── */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: 16, marginBottom: 20 }}>
                  {[
                    {
                      label: 'Active Campaigns', icon: <Rocket size={18} />,
                      value: campaigns.filter(c => c.status === 'ACTIVE').length,
                      sub: `of ${campaigns.length} total`,
                      color: '#6366f1', bg: 'rgba(99,102,241,0.08)',
                    },
                    {
                      label: 'Connect Rate', icon: <Zap size={18} />,
                      value: (Object.values(metrics).length > 0
                        ? (Object.values(metrics).reduce((acc, m) => acc + parseFloat(m?.connectionRate || 0), 0) / Object.values(metrics).length).toFixed(1)
                        : '0.0') + '%',
                      sub: 'fleet average',
                      color: '#10b981', bg: 'rgba(16,185,129,0.08)',
                    },
                    {
                      label: 'Live Agents', icon: <Users size={18} />,
                      value: users.filter(u => u.status === 'ACTIVE').length,
                      sub: `of ${users.length} total`,
                      color: '#3b82f6', bg: 'rgba(59,130,246,0.08)',
                    },
                    {
                      label: 'Total Revenue', icon: <DollarSign size={18} />,
                      value: `$${(overview?.revenue || 0).toLocaleString()}`,
                      sub: 'all time',
                      color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',
                    },
                  ].map(({ label, icon, value, sub, color, bg }) => (
                    <div key={label} style={{ background: '#fff', borderRadius: 16, padding: '18px 20px', border: '1px solid #e8ecf4', boxShadow: '0 1px 4px rgba(15,23,42,0.05)', borderTop: `3px solid ${color}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <span style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' }}>{label}</span>
                        <div style={{ background: bg, color, padding: '6px', borderRadius: 9, display: 'flex' }}>{icon}</div>
                      </div>
                      <div style={{ fontSize: '2rem', fontWeight: 900, color, fontFamily: 'Outfit, sans-serif', lineHeight: 1.1 }}>{value}</div>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 4, fontWeight: 500 }}>{sub}</div>
                    </div>
                  ))}
                </div>

                {resetRequests.length > 0 && (
                  <div onClick={() => switchTab('agents')} style={{ background: '#fffbeb', border: '1.5px solid #fcd34d', borderRadius: 14, padding: '12px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                    <span style={{ fontSize: 20 }}>🔑</span>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#92400e' }}>{resetRequests.length} Password Reset Request{resetRequests.length > 1 ? 's' : ''}</span>
                      <span style={{ fontSize: '0.75rem', color: '#b45309', marginLeft: 8 }}>Click to review</span>
                    </div>
                    <span style={{ color: '#b45309', fontSize: '1rem' }}>→</span>
                  </div>
                )}

                {!isSuperAdmin && <DashboardPlanBanner token={authState.token} />}

                <div className="dynamic-grid" style={{ gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(320px, 1fr))' }}>
                  <section className="card" id="agents">
                    <h2 className="font-head mb-4">Agent Roster</h2>
                    <div className="table-container">
                      <table>
                        <thead><tr><th>Name</th><th>Email</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
                        <tbody>
                          {users.filter(u => u.role?.name?.toLowerCase() === 'agent').length > 0
                            ? users.filter(u => u.role?.name?.toLowerCase() === 'agent').map(u => (
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.02em' }}>Analytics</h1>
                    <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>Performance insights across all campaigns</p>
                  </div>
                  <button style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#0f172a', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 18px', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }} onClick={handleExportCsv}>
                    ⬇ Export CSV
                  </button>
                </div>

                {overview && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: 14, marginBottom: 14 }}>
                      {[
                        { label: 'Total Calls', val: overview.totalCalls, color: '#6366f1', sub: 'all time' },
                        { label: "Today's Calls", val: overview.todayCalls, color: '#3b82f6', sub: 'since midnight' },
                        { label: 'Connected', val: overview.connected, color: '#10b981', sub: 'live answers' },
                        { label: 'Connection Rate', val: `${overview.connectionRate}%`, color: '#10b981', sub: 'of total calls' },
                      ].map(({ label, val, color, sub }) => (
                        <div key={label} style={{ background: '#fff', borderRadius: 14, padding: '16px 18px', border: '1px solid #e8ecf4', borderTop: `3px solid ${color}`, boxShadow: '0 1px 3px rgba(15,23,42,0.05)' }}>
                          <div style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: 10 }}>{label}</div>
                          <div style={{ fontSize: '1.8rem', fontWeight: 900, color, fontFamily: 'Outfit, sans-serif', lineHeight: 1 }}>{val}</div>
                          <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: 5 }}>{sub}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
                      {[
                        { label: 'Appointments', val: overview.appointments, color: '#f59e0b', sub: 'booked' },
                        { label: 'Appt Rate', val: `${overview.appointmentRate}%`, color: '#f59e0b', sub: 'of connected' },
                        { label: 'Total Revenue', val: `$${(overview.revenue || 0).toLocaleString()}`, color: '#10b981', sub: 'all time' },
                        { label: 'Recordings', val: overview.recordings, color: '#8b5cf6', sub: 'stored' },
                      ].map(({ label, val, color, sub }) => (
                        <div key={label} style={{ background: '#fff', borderRadius: 14, padding: '16px 18px', border: '1px solid #e8ecf4', borderTop: `3px solid ${color}`, boxShadow: '0 1px 3px rgba(15,23,42,0.05)' }}>
                          <div style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: 10 }}>{label}</div>
                          <div style={{ fontSize: '1.8rem', fontWeight: 900, color, fontFamily: 'Outfit, sans-serif', lineHeight: 1 }}>{val}</div>
                          <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: 5 }}>{sub}</div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {(() => {
                  const sortedCountries = [...heatmapData].sort((a, b) => (b?.value || 0) - (a?.value || 0));
                  const topCountryStats = sortedCountries.slice(0, 5);
                  const mappedCalls = sortedCountries.reduce((sum, item) => sum + (item?.value || 0), 0);
                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 2fr', gap: 14, marginBottom: 16 }}>
                      <div style={{ background: '#fff', borderRadius: 14, padding: '16px 18px', border: '1px solid #e8ecf4', borderTop: '3px solid #2563eb' }}>
                        <div style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: 8 }}>Active Countries</div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#2563eb', fontFamily: 'Outfit, sans-serif' }}>{sortedCountries.length}</div>
                      </div>
                      <div style={{ background: '#fff', borderRadius: 14, padding: '16px 18px', border: '1px solid #e8ecf4', borderTop: '3px solid #0f766e' }}>
                        <div style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: 8 }}>Mapped Calls</div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0f766e', fontFamily: 'Outfit, sans-serif' }}>{mappedCalls}</div>
                      </div>
                      <div style={{ background: '#fff', borderRadius: 14, padding: '16px 18px', border: '1px solid #e8ecf4' }}>
                        <div style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: 8 }}>Top Countries</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {topCountryStats.length > 0 ? topCountryStats.map(country => (
                            <span key={country.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, background: '#eff6ff', color: '#1d4ed8', fontSize: '0.72rem', fontWeight: 700 }}>
                              {COUNTRY_LABELS[country.id] || country.id} <b>{country.value}</b>
                            </span>
                          )) : <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>No country data yet</span>}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e8ecf4', padding: '20px 22px', marginBottom: 16 }}>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a', marginBottom: 14 }}>Geographic Call Density</div>
                  <ProWorldMap data={heatmapData} />
                  <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.72rem', marginTop: 8 }}>Call density by country</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
                  <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e8ecf4', padding: '20px 22px' }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a', marginBottom: 14 }}>Calls Per Hour (Today)</div>
                    <BarChart data={hourly.filter(h => h.value > 0 || hourly.indexOf(h) > 6 && hourly.indexOf(h) < 22)} labelKey="label" valueKey="value" color="#6366f1" />
                  </div>
                  {overview && (
                    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e8ecf4', padding: '20px 22px' }}>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a', marginBottom: 14 }}>Call Outcomes</div>
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
            {activeTab === 'history' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.02em' }}>Call History</h1>
                    <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>Browse and search all past calls</p>
                  </div>
                </div>
                <HistoryTab historyFeed={historyFeed} historyStats={historyStats} onRefresh={fetchHistory} loading={historyLoading} />
              </div>
            )}

            {activeTab === 'recordings' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.02em' }}>Call Recordings</h1>
                    <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>Listen to and review recorded calls</p>
                  </div>
                </div>
                <RecordingsTab recordings={recordings} users={users} onFetch={fetchRecordings} apiUrl={API_URL} getToken={getToken} />
              </div>
            )}

            {/* ── SCORECARDS ──────────────────────────────────────────────── */}
            {activeTab === 'scorecards' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.02em' }}>Agent Scorecards</h1>
                    <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>Ranked by overall performance score</p>
                  </div>
                  <button onClick={fetchScorecards} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '8px 16px', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', color: '#475569' }}>
                    ↻ Refresh
                  </button>
                </div>

                {scorecards.length === 0 ? (
                  <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e8ecf4', padding: '60px 24px', textAlign: 'center' }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>🏆</div>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a', marginBottom: 6 }}>No scorecards yet</div>
                    <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Scorecards appear after agents make their first calls</div>
                  </div>
                ) : (
                  <>
                    {/* Top 3 podium */}
                    {scorecards.length >= 1 && (
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : `repeat(${Math.min(scorecards.length, 3)}, 1fr)`, gap: 14, marginBottom: 16 }}>
                        {scorecards.slice(0, 3).map((a, i) => {
                          const medals = ['🥇', '🥈', '🥉'];
                          const colors = ['#f59e0b', '#94a3b8', '#cd7c3a'];
                          const bgs = ['#fffbeb', '#f8fafc', '#fdf6ec'];
                          return (
                            <div key={a.id} style={{ background: bgs[i], border: `1.5px solid ${colors[i]}40`, borderRadius: 16, padding: '20px 22px', boxShadow: i === 0 ? `0 4px 20px ${colors[i]}25` : 'none' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <span style={{ fontSize: 28 }}>{medals[i]}</span>
                                <span style={{ background: `${colors[i]}20`, color: colors[i], fontWeight: 800, fontSize: '1rem', padding: '4px 12px', borderRadius: 8 }}>{a.score}</span>
                              </div>
                              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a', marginBottom: 3 }}>{a.name}</div>
                              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                                <span style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.7rem', fontWeight: 600, padding: '3px 9px', borderRadius: 6 }}>{a.totalCalls} calls</span>
                                <span style={{ background: '#dcfce7', color: '#16a34a', fontSize: '0.7rem', fontWeight: 600, padding: '3px 9px', borderRadius: 6 }}>{a.conversionRate}% conv</span>
                                <span style={{ background: '#fef3c7', color: '#d97706', fontSize: '0.7rem', fontWeight: 600, padding: '3px 9px', borderRadius: 6 }}>{a.appointments} appts</span>
                                <span style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.7rem', fontWeight: 600, padding: '3px 9px', borderRadius: 6 }}>{Math.round(a.totalTalkTime / 60)}min</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {/* Rest */}
                    {scorecards.length > 3 && (
                      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e8ecf4', overflow: 'hidden' }}>
                        {scorecards.slice(3).map((a, i) => (
                          <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: i < scorecards.length - 4 ? '1px solid #f1f5f9' : 'none', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#94a3b8', minWidth: 28 }}>#{i + 4}</span>
                            <div style={{ flex: 1, minWidth: 120 }}>
                              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>{a.name}</div>
                            </div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              <span style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.7rem', fontWeight: 600, padding: '3px 9px', borderRadius: 6 }}>{a.totalCalls} calls</span>
                              <span style={{ background: '#dcfce7', color: '#16a34a', fontSize: '0.7rem', fontWeight: 600, padding: '3px 9px', borderRadius: 6 }}>{a.conversionRate}% conv</span>
                              <span style={{ background: '#ede9fe', color: '#6366f1', fontSize: '0.7rem', fontWeight: 800, padding: '3px 9px', borderRadius: 6 }}>Score: {a.score}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── LEADS ──────────────────────────────────────────────────── */}
            {activeTab === 'leads' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.02em' }}>
                      Lead Library <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#94a3b8', background: '#f1f5f9', padding: '2px 10px', borderRadius: 8, marginLeft: 8 }}>{leads.length}</span>
                    </h1>
                    <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>Manage and import your prospect lists</p>
                  </div>
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

                <div className="card mb-6" style={{ padding: '1.5rem', border: '1.5px solid #e0e7ff', background: '#fafbff' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.25rem' }}>
                    <span style={{ fontSize: 22 }}>🚀</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#1e1b4b' }}>Import Leads</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-soft)', marginTop: 2 }}>Upload a CSV and assign to an existing list or create a new one.</div>
                    </div>
                    <a
                      href={`${API_URL}/leads/import/template`}
                      download="voxiq-leads-template.csv"
                      onClick={e => {
                        e.preventDefault();
                        fetch(`${API_URL}/leads/import/template`, {
                          headers: { Authorization: `Bearer ${getToken() || ''}` }
                        })
                          .then(r => r.blob())
                          .then(blob => {
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = 'voxiq-leads-template.csv';
                            a.click();
                            URL.revokeObjectURL(url);
                          });
                      }}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        background: '#f0fdf4', color: '#16a34a', border: '1.5px solid #bbf7d0',
                        borderRadius: 10, padding: '7px 14px', fontSize: '0.8rem', fontWeight: 700,
                        textDecoration: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                      }}
                    >
                      ⬇ Download CSV Template
                    </a>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '1fr auto 1fr', gap: '1rem', alignItems: 'start', marginBottom: '1rem' }}>
                    <div>
                      <label className="stat-label" style={{ marginBottom: 6, display: 'block' }}>Select Existing List</label>
                      <select className="input-field" style={{ width: '100%' }} value={importForm.listId}
                        onChange={e => setImportForm(p => ({ ...p, listId: e.target.value, newListName: '' }))}>
                        <option value="">-- Choose list --</option>
                        {availableLists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                      </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 28 }}>
                      <span style={{ fontWeight: 700, fontSize: '0.8rem', color: '#94a3b8', background: '#f1f5f9', borderRadius: 20, padding: '4px 10px' }}>OR</span>
                    </div>

                    <div>
                      <label className="stat-label" style={{ marginBottom: 6, display: 'block' }}>Create New List</label>
                      <input className="input-field" style={{ width: '100%' }} placeholder="e.g. June 2026 Leads"
                        value={importForm.newListName}
                        onChange={e => setImportForm(p => ({ ...p, newListName: e.target.value, listId: '' }))} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #e5e7eb' }}>
                    <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '1.5px dashed #c7d2fe', borderRadius: 10, padding: '0.6rem 1rem', cursor: 'pointer' }}>
                      <span style={{ fontSize: 18 }}>📂</span>
                      <span style={{ fontSize: '0.85rem', color: selectedFile ? '#4f46e5' : '#94a3b8', fontWeight: selectedFile ? 700 : 400 }}>
                        {selectedFile ? selectedFile.name : 'Choose CSV file…'}
                      </span>
                      <input type="file" accept=".csv" onChange={handleFileSelect} style={{ display: 'none' }} />
                    </label>
                    <button className="btn btn-primary" style={{ whiteSpace: 'nowrap', padding: '0.7rem 1.5rem', fontSize: '0.9rem' }}
                      onClick={handleCsvUpload}
                      disabled={isImporting || !selectedFile || (!importForm.listId && !importForm.newListName)}>
                      {isImporting ? '⌛ Importing…' : '⬆ Start Import'}
                    </button>
                  </div>

                  {!selectedFile && (
                    <p style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.5rem' }}>
                      CSV columns: <code>firstName, lastName, phone, address</code> — phone is required.
                    </p>
                  )}
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
                            } catch (e) { setErrorModal('Failed to delete some items.'); }
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.02em' }}>
                      Agents <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#94a3b8', background: '#f1f5f9', padding: '2px 10px', borderRadius: 8, marginLeft: 8 }}>{users.filter(u => u.role?.name?.toLowerCase() === 'agent').length}</span>
                    </h1>
                    <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>Manage agents, numbers and list assignments</p>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '8px 16px', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', color: '#475569' }} onClick={fetchUsers}>↻ Refresh</button>
                    <button style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 18px', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }} onClick={() => {
                      const { email } = generateAgentId(companyName, authState.user?.email, users);
                      setUserForm({ name: '', email, password: '', roleId: '', accountId: companyAccountId });
                      fetchAccounts(); fetchRoles(); setShowUserModal(true);
                    }}>+ Add Agent</button>
                  </div>
                </div>

                {users.filter(u => u.role?.name?.toLowerCase() === 'agent').length === 0 ? (
                  <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e8ecf4', padding: '60px 24px', textAlign: 'center' }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a', marginBottom: 6 }}>No agents yet</div>
                    <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Click "+ Add Agent" to create your first agent</div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
                    {users.filter(u => u.role?.name?.toLowerCase() === 'agent').map(u => {
                      const numberPool = Array.isArray(u.account?.numberPool) ? u.account.numberPool : [];
                      const assignedListIds = u.AgentList?.map(al => al.listId) || [];
                      const initials = (u.name || 'A').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
                      const avatarColors = ['#6366f1', '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444'];
                      const avatarColor = avatarColors[(u.name || '').charCodeAt(0) % avatarColors.length];
                      return (
                        <div key={u.id} style={{ background: '#fff', borderRadius: 16, border: '1px solid #e8ecf4', overflow: 'hidden', boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}>
                          {/* Header */}
                          <div style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid #f1f5f9' }}>
                            <div style={{ width: 40, height: 40, borderRadius: 12, background: avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '0.88rem', flexShrink: 0 }}>{initials}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>{u.name}</span>
                                {resetRequests.some(r => r.id === u.id) && (
                                  <span style={{ fontSize: '0.62rem', background: '#fef3c7', color: '#92400e', borderRadius: 5, padding: '2px 6px', fontWeight: 700 }}>🔑 Reset</span>
                                )}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                            </div>
                            <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: u.status === 'ACTIVE' ? '#dcfce7' : '#fef3c7', color: u.status === 'ACTIVE' ? '#16a34a' : '#d97706', flexShrink: 0 }}>{u.status}</span>
                          </div>
                          {/* Number */}
                          <div style={{ padding: '12px 18px', borderBottom: '1px solid #f1f5f9' }}>
                            <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: 6 }}>📞 Outbound Number</div>
                            {!u.callerNumber && numberPool.length === 0 ? (
                              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>No numbers assigned — contact Voxiq support</div>
                            ) : (
                              <select className="input-field" style={{ padding: '6px 10px', fontSize: '0.8rem', width: '100%' }} value={u.callerNumber || ''} onChange={async (e) => {
                                const val = e.target.value || null;
                                await fetchJson(`${API_URL}/users/${u.id}/caller-number`, { method: 'PATCH', body: JSON.stringify({ callerNumber: val }) });
                                fetchUsers();
                              }}>
                                <option value="">— Auto —</option>
                                {numberPool.map((n, i) => {
                                  const isUsed = users.some(other => other.id !== u.id && other.callerNumber === n.number);
                                  return <option key={i} value={n.number} disabled={isUsed}>{formatCallerOption(n)}{isUsed ? ' [Used]' : ''}</option>;
                                })}
                              </select>
                            )}
                          </div>
                          {/* Lists */}
                          <div style={{ padding: '12px 18px', borderBottom: '1px solid #f1f5f9' }}>
                            <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: 8 }}>📋 Assigned Lists</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                              {u.AgentList?.map(al => (
                                <div key={al.listId} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#ede9fe', color: '#5b21b6', fontSize: '0.7rem', fontWeight: 700, padding: '3px 8px', borderRadius: 6 }}>
                                  {al.List?.name}
                                  <button style={{ background: 'none', border: 'none', color: '#7c3aed', cursor: 'pointer', padding: 0, fontWeight: 800, lineHeight: 1 }} onClick={async () => {
                                    const newListIds = assignedListIds.filter(id => id !== al.listId);
                                    await fetchJson(`${API_URL}/users/${u.id}/lists`, { method: 'PUT', body: JSON.stringify({ listIds: newListIds }) });
                                    fetchUsers();
                                  }}>×</button>
                                </div>
                              ))}
                            </div>
                            <select className="input-field" style={{ padding: '5px 10px', fontSize: '0.75rem', width: '100%' }} value="" onChange={async (e) => {
                              const listId = e.target.value;
                              if (!listId) return;
                              const newListIds = [...assignedListIds, listId];
                              await fetchJson(`${API_URL}/users/${u.id}/lists`, { method: 'PUT', body: JSON.stringify({ listIds: newListIds }) });
                              fetchUsers();
                            }}>
                              <option value="">+ Assign List</option>
                              {availableLists.filter(l => l.accountId === u.accountId && !assignedListIds.includes(l.id)).map(list => (
                                <option key={list.id} value={list.id}>{list.name}</option>
                              ))}
                            </select>
                          </div>
                          {/* Actions */}
                          <div style={{ padding: '10px 18px', display: 'flex', gap: 8 }}>
                            <button style={{ flex: 1, padding: '7px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', color: '#475569' }} onClick={() => { setEditAgentModal(u); setEditAgentForm({ name: u.name || '', email: u.email || '', password: '' }); }}>✏️ Edit</button>
                            <button style={{ flex: 1, padding: '7px', background: '#fff1f2', border: '1px solid #fecaca', borderRadius: 8, fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', color: '#ef4444' }} onClick={() => setConfirmModal({ show: true, title: 'Remove Agent?', message: `Remove ${u.name}?`, onConfirm: async () => { await fetch(`${API_URL}/users/${u.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` } }); fetchUsers(); } })}>🗑 Remove</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── CAMPAIGNS ──────────────────────────────────────────────── */}
            {activeTab === 'campaigns' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.02em' }}>
                      Campaigns <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#94a3b8', background: '#f1f5f9', padding: '2px 10px', borderRadius: 8, marginLeft: 8 }}>{campaigns.length}</span>
                    </h1>
                    <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>Manage dialing campaigns and monitor performance</p>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '8px 16px', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', color: '#475569' }} onClick={fetchCampaigns}>↻ Refresh</button>
                    <button style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 18px', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }} onClick={() => openCampaignModal()}>+ New Campaign</button>
                  </div>
                </div>

                {campaigns.length === 0 ? (
                  <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e8ecf4', padding: '60px 24px', textAlign: 'center' }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>🚀</div>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a', marginBottom: 6 }}>No campaigns yet</div>
                    <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Create your first campaign to start dialing</div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(400px, 1fr))', gap: 16 }}>
                    {campaigns.map(c => {
                      const isActive = c.status === 'ACTIVE';
                      const accentColor = isActive ? '#10b981' : '#94a3b8';
                      const calls = metrics[c.id]?.totalCalls || 0;
                      const connectRate = metrics[c.id]?.connectionRate || '0';
                      return (
                        <div key={c.id} style={{ background: '#fff', borderRadius: 16, border: '1px solid #e8ecf4', borderLeft: `4px solid ${accentColor}`, overflow: 'hidden', boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}>
                          <div style={{ padding: '18px 20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a', marginBottom: 4 }}>{c.name}</div>
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                  <span style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.68rem', fontWeight: 600, padding: '2px 8px', borderRadius: 6 }}>{c.mode}</span>
                                  <span style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.68rem', fontWeight: 600, padding: '2px 8px', borderRadius: 6 }}>{c.pacing}s pacing</span>
                                </div>
                              </div>
                              <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: isActive ? '#dcfce7' : '#f1f5f9', color: isActive ? '#16a34a' : '#64748b', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: accentColor, display: 'inline-block' }} />
                                {c.status}
                              </span>
                            </div>
                            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                              <div style={{ background: '#f8fafc', borderRadius: 10, padding: '8px 14px', flex: 1, textAlign: 'center' }}>
                                <div style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: 3 }}>Calls</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Outfit, sans-serif' }}>{calls}</div>
                              </div>
                              <div style={{ background: '#f8fafc', borderRadius: 10, padding: '8px 14px', flex: 1, textAlign: 'center' }}>
                                <div style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: 3 }}>Connect%</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#10b981', fontFamily: 'Outfit, sans-serif' }}>{connectRate}%</div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                              {c.status === 'PAUSED'
                                ? <button style={{ flex: 1, padding: '8px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 9, fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }} onClick={() => handleStartCampaign(c.id)}>▶ Start</button>
                                : <button style={{ flex: 1, padding: '8px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 9, fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }} onClick={() => handlePauseCampaign(c.id)}>⏸ Pause</button>
                              }
                              <button style={{ padding: '8px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 9, fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', color: '#475569' }} onClick={() => openCampaignModal(c)}>⚙️ Edit</button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── ACCOUNTS ───────────────────────────────────────────────── */}
            {activeTab === 'accounts' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.02em' }}>{isSuperAdmin ? 'Accounts & Numbers' : 'Company & Numbers'}</h1>
                    <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>{isSuperAdmin ? 'Manage all accounts and number pools' : 'Your plan, numbers and account settings'}</p>
                  </div>
                  {isSuperAdmin && (
                    <button style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 18px', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }} onClick={() => { setAccountForm({ name: '' }); setShowAccountModal(true); }}>+ New Account</button>
                  )}
                </div>

                {!isSuperAdmin && <PlanCard token={authState.token} />}

                {!isSuperAdmin && (
                  <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e8ecf4', padding: '18px 20px', marginBottom: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>Phone Numbers</div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 2 }}>Numbers available in your company pool</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ background: '#dcfce7', color: '#16a34a', fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 8 }}>{companyNumberInventory.availableNumbers.length} Available</span>
                        <span style={{ background: '#ede9fe', color: '#5b21b6', fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 8 }}>{companyNumberInventory.assignedNumbers.length} Assigned</span>
                        <button style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '5px 12px', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer', color: '#475569' }} onClick={fetchCompanyNumberInventory}>↻</button>
                      </div>
                    </div>
                    {companyNumberInventory.availableNumbers.length === 0 ? (
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>No numbers available. Ask the super admin to assign numbers to your company.</div>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                        {companyNumberInventory.availableNumbers.map((entry) => (
                          <div key={entry.number} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 14px', minWidth: 170 }}>
                            <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>{entry.number}</div>
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 3 }}>{entry.countryCode || 'Unknown'}{entry.callerName ? ` · ${entry.callerName}` : ''}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                  {accounts.map(a => {
                    const agentCount = users.filter(u => u.accountId === a.id).length;
                    const listCount = availableLists.filter(l => l.accountId === a.id).length;
                    const numCount = a.numberPool?.length || 0;
                    return (
                      <div key={a.id} style={{ background: '#fff', borderRadius: 16, border: '1px solid #e8ecf4', padding: '18px 20px', boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a', marginBottom: 10 }}>{a.name}</div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              <span style={{ background: '#ede9fe', color: '#5b21b6', fontSize: '0.7rem', fontWeight: 700, padding: '3px 9px', borderRadius: 7 }}>👤 {agentCount} agents</span>
                              <span style={{ background: '#dbeafe', color: '#1d4ed8', fontSize: '0.7rem', fontWeight: 700, padding: '3px 9px', borderRadius: 7 }}>📋 {listCount} lists</span>
                              <span style={{ background: '#dcfce7', color: '#16a34a', fontSize: '0.7rem', fontWeight: 700, padding: '3px 9px', borderRadius: 7 }}>📞 {numCount} numbers</span>
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button style={{ flex: 1, padding: '7px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 9, fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', color: '#475569' }} onClick={() => setManageAccount({ ...a, numberPool: a.numberPool || [] })}>⚙️ Manage</button>
                          {isSuperAdmin && (
                            <button style={{ padding: '7px 14px', background: '#fff1f2', border: '1px solid #fecaca', borderRadius: 9, fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', color: '#ef4444' }} onClick={() => handleDeleteAccount(a.id)}>🗑</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── INTEGRATIONS ──────────────────────────────────────────── */}
            {activeTab === 'integrations' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.02em' }}>Integrations</h1>
                    <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>Connect your tools and automate workflows</p>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
                  {/* Zapier */}
                  <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e8ecf4', overflow: 'hidden' }}>
                    <div style={{ background: 'linear-gradient(135deg, #fff7ed, #ffedd5)', padding: '16px 20px', borderBottom: '1px solid #fed7aa', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#fff' }}>⚡</div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>Zapier Integration</div>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Fire events on call outcomes</div>
                      </div>
                    </div>
                    <div style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                        <input className="input-field" style={{ flex: 1 }} placeholder="https://hooks.zapier.com/..." value={newWebhookUrl} onChange={e => setNewWebhookUrl(e.target.value)} />
                        <button style={{ background: '#f97316', color: '#fff', border: 'none', borderRadius: 9, padding: '0 16px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={addWebhook}>Add</button>
                      </div>
                      {webhooks.map(w => (
                        <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', borderRadius: 8, padding: '8px 12px', marginBottom: 6 }}>
                          <span style={{ fontSize: '0.75rem', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>{w.url}</span>
                          <button style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 700, marginLeft: 8, flexShrink: 0 }} onClick={() => deleteWebhook(w.id)}>✕</button>
                        </div>
                      ))}
                      {webhooks.length === 0 && <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>No Zapier integrations yet</div>}
                    </div>
                  </div>

                  {/* GoHighLevel */}
                  <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e8ecf4', overflow: 'hidden' }}>
                    <div style={{ background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', padding: '16px 20px', borderBottom: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#fff' }}>🔗</div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>GoHighLevel</div>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Sync contacts and activities</div>
                      </div>
                    </div>
                    <div style={{ padding: '16px 20px' }}>
                      <input className="input-field" style={{ marginBottom: 10 }} type="password" placeholder="GHL API Key" value={ghlKey} onChange={e => setGhlKey(e.target.value)} />
                      <button style={{ width: '100%', padding: '9px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 9, fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }} onClick={saveGhlKey}>Save API Key</button>
                    </div>
                  </div>

                  {/* SMS Templates */}
                  <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e8ecf4', overflow: 'hidden' }}>
                    <div style={{ background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', padding: '16px 20px', borderBottom: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#fff' }}>💬</div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>SMS Templates</div>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Reusable message templates for agents</div>
                      </div>
                    </div>
                    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <input className="input-field" placeholder="Template name" value={newSmsName} onChange={e => setNewSmsName(e.target.value)} />
                      <textarea className="input-field" placeholder="Message body..." rows={3} value={newSmsMsg} onChange={e => setNewSmsMsg(e.target.value)} style={{ resize: 'vertical' }} />
                      <button style={{ padding: '9px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 9, fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }} onClick={addSmsTemplate}>Save Template</button>
                    </div>
                  </div>

                  {/* Voicemail */}
                  <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e8ecf4', overflow: 'hidden' }}>
                    <div style={{ background: 'linear-gradient(135deg, #faf5ff, #ede9fe)', padding: '16px 20px', borderBottom: '1px solid #ddd6fe', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#fff' }}>📬</div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>Voicemail Library</div>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Upload MP3 drop-voicemails</div>
                      </div>
                    </div>
                    <div style={{ padding: '16px 20px' }}>
                      {accounts.length > 0 && (
                        <form onSubmit={async (e) => { e.preventDefault(); const fd = new FormData(e.target); await fetch(`${API_URL}/voicemail/templates`, { method: 'POST', headers: { Authorization: `Bearer ${getToken() || ''}` }, body: fd }); fetchVmTemplates(); }} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <input name="name" className="input-field" placeholder="Voicemail name" required />
                          <select name="accountId" className="input-field" required>
                            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                          </select>
                          <input name="file" type="file" accept="audio/*" required style={{ fontSize: '0.82rem' }} />
                          <button style={{ padding: '9px', background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: 9, fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>Upload Voicemail</button>
                        </form>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── COMPLIANCE ─────────────────────────────────────────────── */}
            {activeTab === 'compliance' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.02em' }}>Compliance Guard</h1>
                    <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>Regulatory safeguards and audit controls</p>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 16 }}>
                  {[
                    { icon: '🛡️', label: 'DNC Scrubbing', value: 'Active', desc: 'All leads are automatically checked against the Do Not Call registry before dialing.', color: '#10b981', bg: '#f0fdf4', border: '#bbf7d0' },
                    { icon: '🕐', label: 'Quiet Hours', value: 'Enforced', desc: 'Calls are restricted to compliant hours only. No calls before 8AM or after 9PM local time.', color: '#6366f1', bg: '#f5f3ff', border: '#ddd6fe' },
                    { icon: '📋', label: 'Audit Trail', value: '100% Compliant', desc: 'Every call, message, and agent action is logged and retained for compliance review.', color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe' },
                  ].map((item, i) => (
                    <div key={i} style={{ background: item.bg, border: `1.5px solid ${item.border}`, borderRadius: 16, padding: '24px 22px' }}>
                      <div style={{ fontSize: 32, marginBottom: 14 }}>{item.icon}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                        <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>{item.label}</span>
                        <span style={{ background: item.color, color: '#fff', fontSize: '0.62rem', fontWeight: 800, padding: '2px 8px', borderRadius: 20 }}>{item.value}</span>
                      </div>
                      <p style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: 1.6, margin: 0 }}>{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── SMS ──────────────────────────────────────────────────────── */}
            {activeTab === 'sms' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', minHeight: 500 }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10, flexShrink: 0 }}>
                  <div>
                    <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.02em' }}>SMS Conversations</h1>
                    <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>{smsConversations.length} active thread{smsConversations.length !== 1 ? 's' : ''}</p>
                  </div>
                  <select value={smsAgentFilter} onChange={e => setSmsAgentFilter(e.target.value)} style={{ padding: '7px 12px', border: '1.5px solid #e2e8f0', borderRadius: 9, fontSize: '0.82rem', fontWeight: 600, background: '#fff', color: '#475569', cursor: 'pointer' }}>
                    <option value="all">All Agents</option>
                    {[...new Map(smsConversations.filter(c => c.agentId).map(c => [c.agentId, c.agentName])).entries()].map(([id, name]) => (
                      <option key={id} value={id}>{name || id}</option>
                    ))}
                  </select>
                </div>

                {/* Chat panel */}
                <div style={{ flex: 1, display: 'flex', flexDirection: isMobile ? 'column' : 'row', background: '#fff', borderRadius: 16, border: '1px solid #e8ecf4', overflow: 'hidden', boxShadow: '0 1px 4px rgba(15,23,42,0.05)', minHeight: 0 }}>
                  {/* Left: conversation list */}
                  <div style={{ width: isMobile ? '100%' : 280, maxHeight: isMobile ? 220 : 'none', borderRight: isMobile ? 'none' : '1px solid #f1f5f9', borderBottom: isMobile ? '1px solid #f1f5f9' : 'none', overflowY: 'auto', background: '#fafbfc', flexShrink: 0 }}>
                    {smsConversations.filter(c => smsAgentFilter === 'all' || c.agentId === smsAgentFilter).length === 0 ? (
                      <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>No conversations yet</div>
                    ) : (
                      smsConversations.filter(c => smsAgentFilter === 'all' || c.agentId === smsAgentFilter).map(c => (
                        <div key={c.contactNumber} onClick={() => { setSmsActiveThread(c.contactNumber); fetchAdminSmsThread(c.contactNumber); }}
                          style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', background: smsActiveThread === c.contactNumber ? '#eff6ff' : 'transparent', transition: 'background 0.15s' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                            <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>{c.contactNumber}</span>
                            <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{new Date(c.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          {c.agentName && <span style={{ fontSize: '0.65rem', background: '#ede9fe', color: '#5b21b6', padding: '1px 7px', borderRadius: 10, fontWeight: 600 }}>{c.agentName}</span>}
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {c.direction === 'outbound' ? '→ ' : '← '}{c.lastMessage}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Right: thread */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
                    {!smsActiveThread ? (
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', gap: 8 }}>
                        <div style={{ fontSize: 36 }}>💬</div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>Select a conversation</div>
                      </div>
                    ) : (
                      <>
                        <div style={{ padding: '12px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                          <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.82rem', fontWeight: 800, color: '#5b21b6' }}>
                            {smsActiveThread.slice(-2)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>{smsActiveThread}</div>
                            <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{smsMessages.length} messages</div>
                          </div>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {smsMessages.map(m => (
                            <div key={m.id} style={{ display: 'flex', justifyContent: m.direction === 'outbound' ? 'flex-end' : 'flex-start' }}>
                              <div style={{ maxWidth: '68%', padding: '10px 14px', borderRadius: m.direction === 'outbound' ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: m.direction === 'outbound' ? '#6366f1' : '#f1f5f9', color: m.direction === 'outbound' ? '#fff' : '#0f172a', fontSize: '0.85rem', lineHeight: 1.5 }}>
                                {m.direction === 'outbound' && m.agentName && (
                                  <div style={{ fontSize: '0.68rem', opacity: 0.75, marginBottom: 3, fontWeight: 600 }}>{m.agentName}</div>
                                )}
                                {m.body}
                                <div style={{ fontSize: '0.62rem', opacity: 0.6, marginTop: 5, textAlign: 'right' }}>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 8, flexShrink: 0 }}>
                          <input value={smsInput} onChange={e => setSmsInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAdminSmsMessage(); } }}
                            placeholder="Type a message… (Enter to send)"
                            style={{ flex: 1, padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: '0.85rem', outline: 'none', fontFamily: 'inherit' }} />
                          <button onClick={sendAdminSmsMessage} disabled={smsSendingMsg || !smsInput.trim()}
                            style={{ padding: '10px 20px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', opacity: smsSendingMsg || !smsInput.trim() ? 0.5 : 1 }}>
                            {smsSendingMsg ? '...' : 'Send →'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {showAccountModal && isSuperAdmin && (
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
            <select className="input-field mb-2" value={listForm.accountId} onChange={e => setListForm(p => ({ ...p, accountId: e.target.value }))} disabled={!isSuperAdmin && !!companyAccountId}>
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
            <h2 className="font-head mb-4">Create New Agent</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-soft)', marginBottom: '1rem', marginTop: '-0.5rem' }}>
              The agent will use these credentials to log in and make calls.
            </p>
            <div className="flex flex-col gap-3">
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-soft)', display: 'block', marginBottom: 4 }}>Full Name</label>
                <input className="input-field" placeholder="Jane Doe" autoFocus value={userForm.name} onChange={e => setUserForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-soft)', display: 'block', marginBottom: 4 }}>Login Email</label>
                <input className="input-field" placeholder="agent@company.com" type="email" value={userForm.email} onChange={e => setUserForm(p => ({ ...p, email: e.target.value }))} />
                <p style={{ fontSize: '0.72rem', color: 'var(--text-soft)', marginTop: '-10px' }}>
                  Auto-generated ID. Agent will use this to login.
                </p>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-soft)', display: 'block', marginBottom: 4 }}>Password</label>
                <input className="input-field" placeholder="Min 8 characters" type="password" value={userForm.password} onChange={e => setUserForm(p => ({ ...p, password: e.target.value }))} />
              </div>
              {isSuperAdmin && (
                <>
                  <select className="input-field" value={userForm.accountId} onChange={e => setUserForm(p => ({ ...p, accountId: e.target.value }))}>
                    <option value="">Assign Account</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                  <select className="input-field" value={userForm.roleId} onChange={e => setUserForm(p => ({ ...p, roleId: e.target.value }))}>
                    <option value="">Select Role</option>
                    {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </>
              )}
              <div className="flex gap-2 mt-2">
                <button className="btn btn-primary flex-1" onClick={handleCreateUser}>Create Agent</button>
                <button className="btn flex-1" style={{ background: 'var(--vx-gray-100)' }} onClick={() => setShowUserModal(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {createdAgentCreds && (
        <div className="flex-center" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1001, padding: '1rem' }}>
          <div className="card" style={{ width: '420px', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
            <h2 className="font-head mb-2">Agent Created!</h2>
            <p style={{ color: 'var(--text-soft)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Share these credentials with <strong>{createdAgentCreds.name || 'the agent'}</strong> so they can log in.
            </p>
            <div style={{ background: 'var(--vx-gray-50)', borderRadius: 12, padding: '1rem', marginBottom: '1.25rem', textAlign: 'left' }}>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-soft)', textTransform: 'uppercase', marginBottom: 3 }}>Login Email</div>
                <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.95rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {createdAgentCreds.email}
                  <button onClick={() => navigator.clipboard.writeText(createdAgentCreds.email)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--vx-accent)', fontWeight: 700 }}>Copy</button>
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-soft)', textTransform: 'uppercase', marginBottom: 3 }}>Password</div>
                <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.95rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {createdAgentCreds.password}
                  <button onClick={() => navigator.clipboard.writeText(createdAgentCreds.password)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--vx-accent)', fontWeight: 700 }}>Copy</button>
                </div>
              </div>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-soft)', marginBottom: '1rem' }}>
              Now assign a <strong>caller number</strong> and <strong>lead list</strong> to this agent from the Agents tab.
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setCreatedAgentCreds(null)}>Done</button>
          </div>
        </div>
      )}

      {importResult && (
        <div style={{ position: 'fixed', top: 0, left: isSidebarCollapsed ? 72 : 260, right: 0, bottom: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '1rem' }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: '2rem', width: 380, maxWidth: '92vw', boxShadow: '0 25px 60px rgba(0,0,0,0.2)', textAlign: 'center' }}>
            {importResult.error ? (
              <>
                <div style={{ fontSize: 48, marginBottom: 12 }}>❌</div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#111827', marginBottom: 8 }}>Import Failed</h2>
                <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '1.5rem' }}>{importResult.error}</p>
              </>
            ) : (
              <>
                <div style={{ fontSize: 52, marginBottom: 12 }}>🎉</div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#111827', marginBottom: 6 }}>Import Complete!</h2>
                <p style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Your leads have been imported successfully.</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: '1.75rem' }}>
                  <div style={{ background: '#f0fdf4', borderRadius: 14, padding: '14px 8px' }}>
                    <div style={{ fontSize: 26, fontWeight: 800, color: '#16a34a' }}>{importResult.imported}</div>
                    <div style={{ fontSize: 11, color: '#166534', fontWeight: 700, marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Imported</div>
                  </div>
                  <div style={{ background: '#fef3c7', borderRadius: 14, padding: '14px 8px' }}>
                    <div style={{ fontSize: 26, fontWeight: 800, color: '#d97706' }}>{importResult.duplicates}</div>
                    <div style={{ fontSize: 11, color: '#92400e', fontWeight: 700, marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Dupes</div>
                  </div>
                  <div style={{ background: importResult.errors > 0 ? '#fee2e2' : '#f9fafb', borderRadius: 14, padding: '14px 8px' }}>
                    <div style={{ fontSize: 26, fontWeight: 800, color: importResult.errors > 0 ? '#dc2626' : '#9ca3af' }}>{importResult.errors}</div>
                    <div style={{ fontSize: 11, color: importResult.errors > 0 ? '#991b1b' : '#6b7280', fontWeight: 700, marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Errors</div>
                  </div>
                </div>
              </>
            )}
            <button onClick={() => setImportResult(null)}
              style={{ width: '100%', padding: '0.75rem', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(99,102,241,0.4)' }}>
              Done
            </button>
          </div>
        </div>
      )}

      {editAgentModal && (
        <div className="flex-center" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1001, padding: '1rem' }}>
          <div className="card" style={{ width: 420 }}>
            <h2 className="font-head mb-1">Edit Agent</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-soft)', marginBottom: '1.25rem' }}>
              Leave a field blank to keep it unchanged.
            </p>
            {resetRequests.some(r => r.id === editAgentModal.id) && (
              <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.82rem', color: '#92400e', fontWeight: 600 }}>
                🔑 This agent has requested a password reset. Set a new password below.
              </div>
            )}
            <div className="flex flex-col gap-3">
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-soft)', display: 'block', marginBottom: 4 }}>Full Name</label>
                <input className="input-field" value={editAgentForm.name} onChange={e => setEditAgentForm(f => ({ ...f, name: e.target.value }))} placeholder={editAgentModal.name} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-soft)', display: 'block', marginBottom: 4 }}>Email</label>
                <input className="input-field" type="email" value={editAgentForm.email} onChange={e => setEditAgentForm(f => ({ ...f, email: e.target.value }))} placeholder={editAgentModal.email} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-soft)', display: 'block', marginBottom: 4 }}>New Password <span style={{ fontWeight: 400 }}>(leave blank to keep current)</span></label>
                <input className="input-field" type="password" value={editAgentForm.password} onChange={e => setEditAgentForm(f => ({ ...f, password: e.target.value }))} placeholder="Min 8 characters" />
              </div>
              <div className="flex gap-2 mt-2">
                <button className="btn btn-primary flex-1" onClick={handleEditAgent}>Save Changes</button>
                <button className="btn flex-1" style={{ background: 'var(--vx-gray-100)' }} onClick={() => setEditAgentModal(null)}>Cancel</button>
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

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { API_URL } from '../config/env';
import { fetchJson } from '../lib/api';
import { clearToken } from '../lib/auth';
import StateMap from '../components/StateMap';

export default function Manager() {
    const navigate = useNavigate();
    const { isConnected, disconnectForLogout } = useSocket();
    const [activeTab, setActiveTab] = useState('team');

    // Data state
    const [agents, setAgents] = useState([]);
    const [leads, setLeads] = useState([]);
    const [campaigns, setCampaigns] = useState([]);
    const [lists, setLists] = useState([]);
    const [overview, setOverview] = useState(null);
    const [recordings, setRecordings] = useState([]);
    const [heatmapData, setHeatmapData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [leadsPage, setLeadsPage] = useState(1);
    const LEADS_PER_PAGE = 20;

    // Script editor
    const [scriptText, setScriptText] = useState('Hi {firstName}, calling from WinFi...');

    const handleLogout = () => {
        disconnectForLogout();
        clearToken();
        navigate('/login');
    };

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [agentsRes, leadsRes, campaignsRes, logsRes, recordingsRes, heatmapRes] = await Promise.allSettled([
                fetchJson(`${API_URL}/users`),
                fetchJson(`${API_URL}/leads?limit=100`),
                fetchJson(`${API_URL}/campaigns`),
                fetchJson(`${API_URL}/analytics/overview`),
                fetchJson(`${API_URL}/analytics/recordings`),
                fetchJson(`${API_URL}/analytics/heatmap`)
            ]);
            if (agentsRes.status === 'fulfilled') setAgents(Array.isArray(agentsRes.value) ? agentsRes.value : []);
            if (leadsRes.status === 'fulfilled') setLeads(Array.isArray(leadsRes.value) ? leadsRes.value : []);
            if (campaignsRes.status === 'fulfilled') setCampaigns(Array.isArray(campaignsRes.value) ? campaignsRes.value : []);
            if (logsRes.status === 'fulfilled') setOverview(logsRes.value || null);
            if (recordingsRes.status === 'fulfilled') setRecordings(Array.isArray(recordingsRes.value) ? recordingsRes.value : []);

            if (heatmapRes.status === 'fulfilled') {
                const data = heatmapRes.value;
                if (!data || data.length === 0) {
                    setHeatmapData([]);
                } else setHeatmapData(data);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAll();
    }, []);

    const handleAddTag = async (id, currentTags = []) => {
        const newTag = prompt('Enter new tag (e.g. Excellent, Needs Review, Rude):');
        if (!newTag || newTag.trim() === '') return;
        const tag = newTag.trim();
        if (currentTags.includes(tag)) return alert('Tag already exists');

        try {
            await fetchJson(`${API_URL}/analytics/recordings/${id}/tags`, {
                method: 'PATCH',
                body: JSON.stringify({ tags: [...currentTags, tag] })
            });
            // Update local state
            setRecordings(prev => prev.map(r => r.id === id ? { ...r, tags: [...currentTags, tag] } : r));
        } catch (e) {
            alert('Failed to add tag: ' + e.message);
        }
    };

    const TABS = [
        { id: 'team', label: '👥 Team' },
        { id: 'leads', label: '📋 Leads' },
        { id: 'campaigns', label: '🚀 Campaigns' },
        { id: 'recordings', label: '🎙️ Recordings' },
        { id: 'script', label: '📝 Script Editor' },
        { id: 'activity', label: '📊 Activity' },
    ];

    return (
        <div className="admin-layout">
            <aside className="sidebar" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                {/* Logo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem', flexShrink: 0 }}>
                    <div style={{ width: 36, height: 36, background: 'var(--grad-brand)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '1rem', flexShrink: 0 }}>W</div>
                    <span style={{ fontFamily: 'Outfit,sans-serif', fontWeight: 800, fontSize: '1.1rem', color: 'var(--brand-dark)' }}>Manager Hub</span>
                </div>
                {/* Nav */}
                <nav className="sidebar-nav" style={{ flex: 1, overflowY: 'auto', marginTop: 0 }}>
                    {TABS.map(t => (
                        <a key={t.id} href={`#${t.id}`} className={activeTab === t.id ? 'active' : ''}
                            onClick={e => { e.preventDefault(); setActiveTab(t.id); }}>
                            {t.label}
                        </a>
                    ))}
                </nav>
                {/* System health + sign out */}
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span className="stat-label">System Health</span>
                        <span className={`pill-status ${isConnected ? 'pill-success' : 'pill-error'}`} style={{ fontSize: '0.65rem' }}>{isConnected ? '● LIVE' : '● OFFLINE'}</span>
                    </div>
                    <button className="btn w-full" style={{ background: '#fee2e2', color: '#b91c1c', fontSize: '0.8rem', border: '1px solid #fca5a5' }} onClick={handleLogout}>🚪 Sign Out</button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="admin-content">
                {/* Header */}
                <div className="card full-width flex justify-between items-center mb-4" style={{ padding: '1rem 1.5rem' }}>
                    <div>
                        <span className="stat-label">Manager Workspace</span>
                        <h1 className="font-head" style={{ color: 'var(--brand-dark)' }}>Team Control Center</h1>
                    </div>
                    <button className="btn" style={{ background: 'var(--slate-100)', fontSize: '0.75rem' }} onClick={fetchAll}>
                        {loading ? 'Loading...' : '🔄 Refresh'}
                    </button>
                </div>

                {/* Team Tab */}
                {activeTab === 'team' && (
                    <section className="card full-width">
                        <h2 className="font-head mb-4">👥 Agent Roster</h2>
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th></tr>
                                </thead>
                                <tbody>
                                    {agents.filter(a => a.role?.name === 'AGENT' || !a.role).map(agent => (
                                        <tr key={agent.id}>
                                            <td style={{ fontWeight: 600 }}>{agent.name || '—'}</td>
                                            <td className="text-dim">{agent.email}</td>
                                            <td><span className="pill-status" style={{ fontSize: '0.65rem', background: 'var(--indigo-50)', color: 'var(--primary)' }}>AGENT</span></td>
                                            <td><span className={`pill-status ${agent.status === 'ACTIVE' ? 'pill-success' : 'pill-dim'}`} style={{ fontSize: '0.65rem' }}>{agent.status}</span></td>
                                        </tr>
                                    ))}
                                    {agents.length === 0 && (
                                        <tr><td colSpan="4" className="text-center py-4 text-soft">No agents found. Create agents from Admin panel.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}

                {/* Leads Tab */}
                {activeTab === 'leads' && (
                    <section className="card full-width">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="font-head">📋 Lead Overview <span className="text-dim" style={{ fontSize: '1rem', fontWeight: 400 }}>({leads.length} total)</span></h2>
                            <button className="btn" style={{ fontSize: '0.8rem' }} onClick={fetchAll}>🔄 Refresh</button>
                        </div>
                        <div className="dynamic-grid mb-4">
                            {['NEW', 'CONTACTED', 'NO_ANSWER', 'DNC', 'BOOKED'].map(status => (
                                <div key={status} className="card stat-card" style={{ padding: '0.75rem' }}>
                                    <span className="stat-label" style={{ fontSize: '0.7rem' }}>{status}</span>
                                    <span className="stat-val" style={{ fontSize: '1.5rem' }}>{leads.filter(l => l.status === status).length}</span>
                                </div>
                            ))}
                        </div>
                        {(() => {
                            // Sort newest first, paginate
                            const sorted = [...leads].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                            const totalPages = Math.ceil(sorted.length / LEADS_PER_PAGE);
                            const pageLeads = sorted.slice((leadsPage - 1) * LEADS_PER_PAGE, leadsPage * LEADS_PER_PAGE);
                            return (
                                <>
                                    <div className="table-container">
                                        <table>
                                            <thead>
                                                <tr><th>#</th><th>Name</th><th>Phone</th><th>Status</th><th>Uploaded</th></tr>
                                            </thead>
                                            <tbody>
                                                {pageLeads.length > 0 ? pageLeads.map((lead, i) => (
                                                    <tr key={lead.id}>
                                                        <td className="text-dim" style={{ fontSize: '0.75rem' }}>{(leadsPage - 1) * LEADS_PER_PAGE + i + 1}</td>
                                                        <td style={{ fontWeight: 600 }}>{lead.firstName} {lead.lastName}</td>
                                                        <td style={{ fontFamily: 'monospace' }}>{lead.phone}</td>
                                                        <td><span className={`pill-status ${lead.status === 'NEW' ? 'pill-success' : 'pill-dim'}`} style={{ fontSize: '0.65rem' }}>{lead.status}</span></td>
                                                        <td className="text-dim" style={{ fontSize: '0.78rem' }}>{new Date(lead.createdAt).toLocaleDateString()}</td>
                                                    </tr>
                                                )) : <tr><td colSpan="5" className="text-center py-4 text-dim">No leads available.</td></tr>}
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
                    </section>
                )}

                {/* Campaigns Tab */}
                {activeTab === 'campaigns' && (
                    <section className="card full-width">
                        <h2 className="font-head mb-4">🚀 Campaign Status</h2>
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr><th>Campaign</th><th>Mode</th><th>Status</th><th>Pacing</th></tr>
                                </thead>
                                <tbody>
                                    {campaigns.map(c => (
                                        <tr key={c.id}>
                                            <td style={{ fontWeight: 600 }}>{c.name}</td>
                                            <td><span className="pill-status" style={{ fontSize: '0.65rem', background: 'var(--indigo-50)', color: 'var(--primary)' }}>{c.mode}</span></td>
                                            <td><span className={`pill-status ${c.status === 'ACTIVE' ? 'pill-success' : 'pill-dim'}`} style={{ fontSize: '0.65rem' }}>{c.status}</span></td>
                                            <td className="text-dim">{c.pacing || 1}x</td>
                                        </tr>
                                    ))}
                                    {campaigns.length === 0 && <tr><td colSpan="4" className="text-center py-4 text-soft">No campaigns yet.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}

                {/* Script Editor Tab */}
                {activeTab === 'script' && (
                    <section className="card full-width">
                        <h2 className="font-head mb-4">📝 Call Script Editor</h2>
                        <p className="text-dim mb-4" style={{ fontSize: '0.9rem' }}>
                            Use <code style={{ background: 'var(--slate-100)', padding: '2px 6px', borderRadius: '4px' }}>{'{firstName}'}</code>,{' '}
                            <code style={{ background: 'var(--slate-100)', padding: '2px 6px', borderRadius: '4px' }}>{'{lastName}'}</code>,{' '}
                            <code style={{ background: 'var(--slate-100)', padding: '2px 6px', borderRadius: '4px' }}>{'{phone}'}</code> as dynamic variables.
                        </p>
                        <textarea
                            className="input-field"
                            rows={10}
                            value={scriptText}
                            onChange={e => setScriptText(e.target.value)}
                            placeholder="Hi {firstName}, calling from WinFi..."
                            style={{ fontFamily: 'monospace', fontSize: '0.95rem', lineHeight: '1.6' }}
                        />
                        <div className="mt-4 card" style={{ background: 'var(--slate-50)', borderStyle: 'dashed' }}>
                            <span className="stat-label">Live Preview</span>
                            <p className="mt-2 text-dim" style={{ fontStyle: 'italic' }}>
                                {scriptText.replace('{firstName}', 'John').replace('{lastName}', 'Smith').replace('{phone}', '+15551234567')}
                            </p>
                        </div>
                        <button className="btn btn-primary mt-4" onClick={() => alert('Script saved locally!')}>
                            💾 Save Script
                        </button>
                    </section>
                )}

                {/* Activity Tab */}
                {activeTab === 'activity' && (
                    <section className="card full-width">
                        <h2 className="font-head mb-4">📊 Recent Activity</h2>
                        <div className="dynamic-grid mb-6">
                            <div className="card stat-card">
                                <span className="stat-label">Total Leads</span>
                                <span className="stat-val">{leads.length}</span>
                            </div>
                            <div className="card stat-card">
                                <span className="stat-label">Campaigns</span>
                                <span className="stat-val">{campaigns.length}</span>
                            </div>
                            <div className="card stat-card">
                                <span className="stat-label">Active Agents</span>
                                <span className="stat-val">{agents.length}</span>
                            </div>
                            <div className="card stat-card">
                                <span className="stat-label">Booked Leads</span>
                                <span className="stat-val">{overview ? overview.appointments : leads.filter(l => l.status === 'BOOKED').length}</span>
                            </div>
                            <div className="card stat-card">
                                <span className="stat-label">Total Revenue</span>
                                <span className="stat-val" style={{ color: 'var(--emerald-500)' }}>${(overview?.revenue || 0).toLocaleString()}</span>
                            </div>
                        </div>

                        {/* State Heatmap section */}
                        <div className="card mt-6 mb-6" style={{ background: 'var(--slate-50)' }}>
                            <h3 className="font-head mb-4 text-center">Geographic Density</h3>
                            <StateMap data={heatmapData} />
                            <p className="text-center text-dim mt-2" style={{ fontSize: '0.75rem' }}>Call density by Area Code mapping</p>
                        </div>

                        <p className="text-soft text-center py-4">For detailed analytics, contact your Admin.</p>
                    </section>
                )}

                {/* Recordings Tab */}
                {activeTab === 'recordings' && (
                    <section className="card full-width">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="font-head">🎙️ Call Recordings</h2>
                            <button className="btn" style={{ fontSize: '0.8rem' }} onClick={fetchAll}>🔄 Refresh</button>
                        </div>
                        {recordings.length === 0 ? (
                            <div className="text-center py-12 text-dim">
                                <p style={{ fontSize: '2rem' }}>🎙️</p>
                                <p>No recordings yet. Calls from campaigns with "Record Calls" enabled will appear here.</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4">
                                {recordings.map(r => (
                                    <div key={r.id} className="card" style={{ padding: '1rem', background: 'var(--slate-50)' }}>
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <h4 style={{ fontWeight: 600 }}>{r.lead ? `${r.lead.firstName} ${r.lead.lastName}` : 'Unknown Lead'}</h4>
                                                <span className="text-dim" style={{ fontSize: '0.75rem' }}>
                                                    Agent: {r.agent?.name || 'System'} • Number: {r.lead?.phone || 'Unknown'} • {r.startedAt ? new Date(r.startedAt).toLocaleString() : ''} • {r.disposition || 'No disposition'}
                                                </span>
                                            </div>
                                            <span className="pill-status pill-success">Recorded</span>
                                        </div>
                                        <audio controls style={{ width: '100%', height: '36px' }} src={r.recordingUrl}>
                                            Your browser does not support audio.
                                        </audio>
                                        <div className="flex gap-2 mt-2 items-center flex-wrap">
                                            {r.tags && r.tags.map((tag, idx) => (
                                                <span key={idx} className="pill-status" style={{ background: 'var(--indigo-50)', color: 'var(--indigo-600)', fontSize: '0.7rem' }}>🏷️ {tag}</span>
                                            ))}
                                            <button className="btn" style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', background: 'var(--slate-100)' }} onClick={() => handleAddTag(r.id, r.tags || [])}>+ Tag</button>
                                            <div style={{ flex: 1 }}></div>
                                            <a href={r.recordingUrl} target="_blank" rel="noreferrer" className="btn" style={{ fontSize: '0.72rem', background: 'white', border: '1px solid var(--slate-200)' }}>⬇️ Download</a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                )}
            </main>
        </div>
    );
}

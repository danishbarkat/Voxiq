/**
 * SoftphoneContext — Global Telnyx WebRTC client that persists across all pages.
 * Renders IncomingCallOverlay on any page when an inbound call arrives.
 */
import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSoftphone } from '../hooks/useSoftphone';
import { API_URL } from '../config/env';
import { getToken } from '../lib/auth';

const SoftphoneContext = createContext(null);

// ── Ring tone ──────────────────────────────────────────────────────────────────
let ringInterval = null;
let ringCtx = null;

function playRingTone() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        ringCtx = ctx;
        const now = ctx.currentTime;
        // Classic phone ring: two 0.4s bursts at 440Hz + 480Hz — volume lowered to 0.07
        [[0, 0.4], [0.5, 0.9]].forEach(([start, end]) => {
            [440, 480].forEach(freq => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.frequency.value = freq;
                osc.type = 'sine';
                gain.gain.setValueAtTime(0, now + start);
                gain.gain.linearRampToValueAtTime(0.07, now + start + 0.02);
                gain.gain.setValueAtTime(0.07, now + end - 0.02);
                gain.gain.linearRampToValueAtTime(0, now + end);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now + start);
                osc.stop(now + end);
            });
        });
        setTimeout(() => { try { ctx.close(); } catch (_) {} ringCtx = null; }, 1100);
    } catch (_) {}
}

function startRing() {
    stopRing();
    playRingTone();
    ringInterval = setInterval(playRingTone, 3000);
}

function stopRing() {
    if (ringInterval) { clearInterval(ringInterval); ringInterval = null; }
    try { if (ringCtx) { ringCtx.close(); ringCtx = null; } } catch (_) {}
}

// ── Browser Notifications ──────────────────────────────────────────────────────
let _callNotification = null;

function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

function showCallNotification(info) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    closeCallNotification();
    try {
        const n = new Notification('📞 Incoming Call', {
            body: `${info?.callerName && info.callerName !== info?.from ? info.callerName + '\n' : ''}${info?.from || 'Unknown number'}`,
            icon: '/logo.png',
            requireInteraction: true,
            tag: 'voxiq-incoming-call',
            silent: false,
        });
        n.onclick = () => { window.focus(); n.close(); };
        _callNotification = n;
    } catch (_) {}
}

function closeCallNotification() {
    if (_callNotification) { try { _callNotification.close(); } catch (_) {} _callNotification = null; }
}

// ── Wake Lock (prevents browser from throttling background tab) ────────────────
let _wakeLock = null;

async function requestWakeLock() {
    if (!('wakeLock' in navigator)) return;
    try { _wakeLock = await navigator.wakeLock.request('screen'); } catch (_) {}
}

function releaseWakeLock() {
    if (_wakeLock) { try { _wakeLock.release(); } catch (_) {} _wakeLock = null; }
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function loadCreds() {
    try {
        return {
            login: localStorage.getItem('voxiq_sip_login') || '',
            password: localStorage.getItem('voxiq_sip_password') || '',
            callerName: localStorage.getItem('voxiq_caller_name') || 'Voxiq Agent',
            callerNumber: localStorage.getItem('voxiq_caller_number') || '',
        };
    } catch { return { login: '', password: '', callerName: 'Voxiq Agent', callerNumber: '' }; }
}

function saveCreds(creds) {
    try {
        if (creds.login) localStorage.setItem('voxiq_sip_login', creds.login);
        if (creds.password) localStorage.setItem('voxiq_sip_password', creds.password);
        if (creds.callerName) localStorage.setItem('voxiq_caller_name', creds.callerName);
        if (creds.callerNumber) localStorage.setItem('voxiq_caller_number', creds.callerNumber);
    } catch { }
}

// ── IncomingCallOverlay ────────────────────────────────────────────────────────
function IncomingCallOverlay({ info, onAnswer, onReject }) {
    const [callerLead, setCallerLead] = useState(null);

    useEffect(() => {
        if (!info?.from) return;
        // Lookup caller in DB
        const token = getToken();
        fetch(`${API_URL}/leads?limit=1`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
            .then(r => r.json())
            .then(leads => {
                const phone = info.from.replace(/\D/g, '');
                const match = (Array.isArray(leads) ? leads : leads?.data || []).find(l => {
                    const lp = (l.phone || '').replace(/\D/g, '');
                    return lp === phone || lp.endsWith(phone) || phone.endsWith(lp);
                });
                if (match) setCallerLead(match);
            })
            .catch(() => { });
    }, [info?.from]);

    const displayName = callerLead
        ? `${callerLead.firstName || ''} ${callerLead.lastName || ''}`.trim() || callerLead.phone
        : (info?.callerName && info.callerName !== info?.from ? info.callerName : null);

    return (
        <div style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.65)',
            zIndex: 99999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
        }}>
            <div style={{
                background: 'linear-gradient(160deg, #0f172a 0%, #1e293b 100%)',
                borderRadius: '24px',
                padding: '2.5rem 2.5rem 2rem',
                textAlign: 'center',
                boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.07)',
                minWidth: '300px',
                maxWidth: '360px',
                width: '90vw',
                animation: 'incoming-pulse 2s ease-in-out infinite',
            }}>
                {/* Avatar ring */}
                <div style={{
                    width: 80, height: 80, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 1.25rem',
                    boxShadow: '0 0 0 8px rgba(34,197,94,0.15), 0 0 0 16px rgba(34,197,94,0.07)',
                    fontSize: '36px',
                    animation: 'ring-pulse 1.5s ease-out infinite',
                }}>
                    {callerLead ? '👤' : '📞'}
                </div>

                <div style={{ color: '#64748b', fontSize: '12px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Incoming Call
                </div>

                <div style={{ color: '#f1f5f9', fontSize: '22px', fontWeight: 700, marginBottom: '4px', lineHeight: 1.2 }}>
                    {displayName || 'Unknown Caller'}
                </div>

                <div style={{ color: '#475569', fontSize: '14px', fontFamily: 'monospace', marginBottom: '0.5rem' }}>
                    {info?.from || ''}
                </div>

                {callerLead?.list?.name && (
                    <div style={{
                        display: 'inline-block', padding: '2px 10px', borderRadius: '20px',
                        background: 'rgba(99,102,241,0.15)', color: '#818cf8', fontSize: '11px', marginBottom: '1.5rem',
                    }}>
                        {callerLead.list.name}
                    </div>
                )}

                {/* Buttons */}
                <div style={{ display: 'flex', gap: '1.25rem', justifyContent: 'center', marginTop: callerLead?.list?.name ? 0 : '1.5rem' }}>
                    {/* Reject */}
                    <div style={{ textAlign: 'center' }}>
                        <button
                            onClick={onReject}
                            style={{
                                width: 64, height: 64, borderRadius: '50%', border: 'none',
                                cursor: 'pointer', background: '#dc2626', color: '#fff',
                                fontSize: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 4px 20px rgba(220,38,38,0.45)',
                                transition: 'transform 0.12s, box-shadow 0.12s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.12)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(220,38,38,0.6)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(220,38,38,0.45)'; }}
                        >✕</button>
                        <div style={{ color: '#64748b', fontSize: '11px', marginTop: '6px' }}>Decline</div>
                    </div>

                    {/* Answer */}
                    <div style={{ textAlign: 'center' }}>
                        <button
                            onClick={onAnswer}
                            style={{
                                width: 64, height: 64, borderRadius: '50%', border: 'none',
                                cursor: 'pointer', background: '#22c55e', color: '#fff',
                                fontSize: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 4px 20px rgba(34,197,94,0.45)',
                                transition: 'transform 0.12s, box-shadow 0.12s',
                                animation: 'answer-bounce 0.6s ease-in-out infinite alternate',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.12)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(34,197,94,0.6)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(34,197,94,0.45)'; }}
                        >📞</button>
                        <div style={{ color: '#64748b', fontSize: '11px', marginTop: '6px' }}>Answer</div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes ring-pulse {
                    0%, 100% { box-shadow: 0 0 0 8px rgba(34,197,94,0.15), 0 0 0 16px rgba(34,197,94,0.07); }
                    50% { box-shadow: 0 0 0 12px rgba(34,197,94,0.2), 0 0 0 24px rgba(34,197,94,0.06); }
                }
                @keyframes incoming-pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.005); }
                }
                @keyframes answer-bounce {
                    from { transform: rotate(-15deg); }
                    to { transform: rotate(15deg); }
                }
            `}</style>
        </div>
    );
}

// ── Provider ───────────────────────────────────────────────────────────────────
function SoftphoneProviderInner({ children }) {
    const navigate = useNavigate();
    const [creds, setCreds] = useState(loadCreds);
    const inboundCallLogRef = useRef(null);

    const softphone = useSoftphone(creds);
    const { incomingCall, incomingCallInfo, answerCall, rejectCall } = softphone;

    // Request notification permission on mount (needs user gesture context — fires after first render)
    useEffect(() => { requestNotificationPermission(); }, []);

    // Ring + notification + wake lock when call arrives, stop when it clears
    useEffect(() => {
        if (incomingCall) {
            startRing();
            showCallNotification(incomingCallInfo);
            requestWakeLock();
            // Create inbound callLog in DB
            createInboundCallLog(incomingCallInfo?.from, incomingCallInfo?.callerName).then(id => {
                inboundCallLogRef.current = id;
            });
        } else {
            stopRing();
            closeCallNotification();
            releaseWakeLock();
        }
    }, [!!incomingCall]);

    async function createInboundCallLog(from, callerName) {
        try {
            const token = getToken();
            const res = await fetch(`${API_URL}/dialer/call/log`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                body: JSON.stringify({
                    manualNumber: from || 'unknown',
                    manualName: callerName || from || 'Inbound Caller',
                    agentId: localStorage.getItem('voxiq_agent_id') || 'system',
                    isManual: true,
                    direction: 'inbound',
                }),
            });
            const data = await res.json();
            return data?.id || null;
        } catch { return null; }
    }

    const handleAnswer = useCallback(async () => {
        stopRing();
        closeCallNotification();
        releaseWakeLock();
        // Update callLog direction to inbound + status will be updated when connected
        if (inboundCallLogRef.current) {
            const token = getToken();
            fetch(`${API_URL}/dialer/call/log/${inboundCallLogRef.current}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                body: JSON.stringify({ disposition: 'answered', direction: 'inbound' }),
            }).catch(() => { });
        }
        await answerCall();
        navigate('/agent');
    }, [answerCall, navigate]);

    const handleReject = useCallback(() => {
        stopRing();
        closeCallNotification();
        releaseWakeLock();
        // Mark call as REJECTED
        if (inboundCallLogRef.current) {
            const token = getToken();
            fetch(`${API_URL}/dialer/call/log/${inboundCallLogRef.current}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                body: JSON.stringify({ callStatus: 'REJECTED', endedAt: new Date().toISOString() }),
            }).catch(() => { });
        }
        rejectCall();
        inboundCallLogRef.current = null;
    }, [rejectCall]);

    const updateCredentials = useCallback((newCreds) => {
        saveCreds(newCreds);
        setCreds(prev => ({ ...prev, ...newCreds }));
    }, []);

    const contextValue = { ...softphone, updateCredentials };

    return (
        <SoftphoneContext.Provider value={contextValue}>
            {children}
            {incomingCall && incomingCallInfo && (
                <IncomingCallOverlay
                    info={incomingCallInfo}
                    onAnswer={handleAnswer}
                    onReject={handleReject}
                />
            )}
        </SoftphoneContext.Provider>
    );
}

export function SoftphoneProvider({ children }) {
    return <SoftphoneProviderInner>{children}</SoftphoneProviderInner>;
}

export function useSoftphoneContext() {
    const ctx = useContext(SoftphoneContext);
    if (!ctx) throw new Error('useSoftphoneContext must be used inside SoftphoneProvider');
    return ctx;
}

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useSoftphoneContext } from '../context/SoftphoneContext';
import { API_URL } from '../config/env';
import { fetchJson } from '../lib/api';
import { clearToken, getToken } from '../lib/auth';
import { countries } from '../lib/countries';

// Error label helper
function errorLabel(err) {
  switch (err) {
    case 'invalid_number': return '⚠️ Invalid number — skipping';
    case 'busy': return '📵 Line busy';
    case 'no_answer': return '🔕 No answer';
    case 'rejected': return '❌ Call rejected';
    case 'error': return '⚠️ Call failed';
    case 'mic_permission': return 'Microphone permission or device is missing';
    default: return null;
  }
}

function callFailureMessage(err) {
  if (err === 'mic_permission') {
    return 'Call could not start because microphone access is blocked or no working mic device is available. Please allow mic access in your browser and verify your input device.';
  }
  return 'Call failed to initiate. Please check your softphone registration.';
}

function AgentHistoryBadge({ item }) {
  const palette = {
    'call:missed': { bg: '#fee2e2', fg: '#b91c1c', label: 'Missed' },
    'call:received': { bg: '#dcfce7', fg: '#15803d', label: 'Received' },
    'call:dialed': { bg: '#dbeafe', fg: '#1d4ed8', label: 'Dialed' },
    'sms:received': { bg: '#ecfeff', fg: '#0f766e', label: 'SMS In' },
    'sms:dialed': { bg: '#ede9fe', fg: '#6d28d9', label: 'SMS Out' },
  };
  const key = `${item.type}:${item.category}`;
  const style = palette[key] || { bg: '#f1f5f9', fg: '#475569', label: item.type };
  return (
    <span style={{ background: style.bg, color: style.fg, borderRadius: 999, padding: '3px 8px', fontSize: '0.68rem', fontWeight: 700 }}>
      {style.label}
    </span>
  );
}

function formatHistoryStatus(item) {
  if (item?.type === 'sms') {
    return item?.category === 'received' ? 'Received SMS' : 'Sent SMS';
  }
  if (item?.category === 'missed') return 'Missed';
  if (item?.category === 'received') return 'Received';
  if (item?.category === 'dialed') return 'Dialed';
  return item?.status || 'Unknown';
}

function normalizeSmsPhone(input, fallbackCountryCode = '+1') {
  const raw = `${input || ''}`.trim();
  if (!raw) return null;

  if (raw.startsWith('+')) {
    const normalized = `+${raw.slice(1).replace(/\D/g, '')}`;
    return normalized.length > 1 ? normalized : null;
  }

  const digits = raw.replace(/\D/g, '');
  if (digits.length < 10) return null;
  return `${fallbackCountryCode}${digits}`;
}

function splitPhoneForDialer(input, fallbackCountryCode = '+1') {
  const raw = `${input || ''}`.trim();
  if (!raw) {
    return { countryCode: fallbackCountryCode, localNumber: '' };
  }

  if (!raw.startsWith('+')) {
    return {
      countryCode: fallbackCountryCode,
      localNumber: raw.replace(/[^\d*#\s-]/g, ''),
    };
  }

  const normalized = `+${raw.slice(1).replace(/\D/g, '')}`;
  const normalizedCountries = countries
    .map(({ code }) => ({
      original: code,
      normalized: `+${String(code || '').replace(/\D/g, '')}`,
    }))
    .filter((entry) => entry.normalized.length > 1)
    .sort((a, b) => b.normalized.length - a.normalized.length);

  const matched = normalizedCountries.find((entry) => normalized.startsWith(entry.normalized));
  if (matched) {
    return {
      countryCode: matched.original,
      localNumber: normalized.slice(matched.normalized.length),
    };
  }

  const genericCode = normalized.slice(0, Math.min(4, normalized.length));
  return {
    countryCode: genericCode.length > 1 ? genericCode : fallbackCountryCode,
    localNumber: normalized.slice(genericCode.length),
  };
}

function formatHistoryDateTime(value) {
  if (!value) return '—';
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleString([], {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function Agent() {
  const navigate = useNavigate();
  const { socket, isConnected, disconnectForLogout } = useSocket();
  const [agentId, setAgentId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [currentLead, setCurrentLead] = useState(null);
  const currentLeadRef = useRef(null); // Ref mirrors currentLead so auto-advance always has access even after hangup clears state
  const [callLogId, setCallLogId] = useState(null);
  const callLogIdRef = useRef(null);
  const [callControlIdState, setCallControlIdState] = useState(null); // Track callControlId for VM drop
  const [notes, setNotes] = useState('');
  const [recentCalls, setRecentCalls] = useState([]);
  const [historyFeed, setHistoryFeed] = useState([]);
  const [historyStats, setHistoryStats] = useState({ missedCalls: 0, receivedCalls: 0, dialedCalls: 0, totalMessages: 0 });
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyFilter, setHistoryFilter] = useState('all'); // 'all' | 'dialed' | 'missed' | 'received' | 'sms'
  const [status, setStatus] = useState('Idle');
  const [dialNumber, setDialNumber] = useState('');
  const [dialName, setDialName] = useState('');
  const [dialCountryCode, setDialCountryCode] = useState('+1');
  const [showDialpad, setShowDialpad] = useState(false);
  const [lastDialedNumber, setLastDialedNumber] = useState(() => {
    try { return localStorage.getItem('voxiq_last_dialed') || ''; } catch { return ''; }
  });
  const [callTimer, setCallTimer] = useState(0);
  const todayKey = `agent_stats_${new Date().toISOString().slice(0, 10)}`;
  const [stats, setStats] = useState(() => {
    try {
      const saved = localStorage.getItem(todayKey);
      return saved ? JSON.parse(saved) : { calls: 0, appointments: 0 };
    } catch { return { calls: 0, appointments: 0 }; }
  });
  const [localCallActive, setLocalCallActive] = useState(false);

  // Lead queue state
  const [leads, setLeads] = useState([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [leadSearch, setLeadSearch] = useState('');

  // ── Auto-dial (Power Dialer) ───────────────────────────────────────────────
  const [autoDial, setAutoDial] = useState(false);
  const [autoDialIndex, setAutoDialIndex] = useState(0);
  const [autoDialCountdown, setAutoDialCountdown] = useState(null); // 2,1 countdown
  const autoDialRef = useRef(false);
  const autoDialIndexRef = useRef(0);
  const autoDialLeadsRef = useRef([]); // snapshot of queue when auto-dial started
  const hasDialedRef = useRef(false);  // prevent triggering on first mount
  const dialedIdsRef = useRef(new Set()); // Track already-dialed lead IDs to prevent duplicates
  const finalizedCallLogsRef = useRef(new Set());
  const [campaignDialingActive, setCampaignDialingActive] = useState(false);
  const campaignDialingActiveRef = useRef(false);
  const agentWsStatusRef = useRef('paused');

  useEffect(() => { autoDialRef.current = autoDial; }, [autoDial]);
  useEffect(() => { autoDialIndexRef.current = autoDialIndex; }, [autoDialIndex]);
  useEffect(() => { callLogIdRef.current = callLogId; }, [callLogId]);
  useEffect(() => { campaignDialingActiveRef.current = campaignDialingActive; }, [campaignDialingActive]);

  // SMS & Voicemail
  const [vmTemplates, setVmTemplates] = useState([]);
  const [smsTemplates, setSmsTemplates] = useState([]);
  const [showSmsPanel, setShowSmsPanel] = useState(false);
  const [smsMsg, setSmsMsg] = useState('');
  const [smsSending, setSmsSending] = useState(false);
  const [showVmDrop, setShowVmDrop] = useState(false);

  // SMS Messaging tab
  const [smsTab, setSmsTab] = useState(false);
  const [activeChannel, setActiveChannel] = useState('sms'); // 'sms' | 'whatsapp'
  const [smsConversations, setSmsConversations] = useState([]);
  const [smsActiveThread, setSmsActiveThread] = useState(null);
  const [smsMessages, setSmsMessages] = useState([]);
  const [smsInput, setSmsInput] = useState('');
  const [smsSendingMsg, setSmsSendingMsg] = useState(false);
  const [smsNewMode, setSmsNewMode] = useState(false);
  const [smsNewNumber, setSmsNewNumber] = useState('');

  // Dialer quick-SMS panel
  const [dialerSmsMessages, setDialerSmsMessages] = useState([]);
  const [dialerSmsInput, setDialerSmsInput] = useState('');
  const [dialerSmsSending, setDialerSmsSending] = useState(false);
  const [dialerSmsPhone, setDialerSmsPhone] = useState('');
  const [callbackTime, setCallbackTime] = useState('');
  const [dealValue, setDealValue] = useState('');
  const dialerSmsFetchTimeoutRef = useRef(null);
  const dialerSmsRequestIdRef = useRef(0);

  // ── Period Call Stats ──────────────────────────────────────────────────────
  const [periodStats, setPeriodStats] = useState({ today: 0, yesterday: 0, thisWeek: 0, lastWeek: 0, thisMonth: 0, thisYear: 0 });
  const [statsPeriod, setStatsPeriod] = useState('today'); // which period is highlighted

  // ── Calendar / Scheduled Callbacks ────────────────────────────────────────
  const [appointments, setAppointments] = useState([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [calViewMonth, setCalViewMonth] = useState(() => {
    const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [calSelectedDate, setCalSelectedDate] = useState(null); // 'YYYY-MM-DD'
  const [showApptModal, setShowApptModal] = useState(false);
  const [apptForm, setApptForm] = useState({ customerName: '', customerPhone: '', customerEmail: '', scheduledAt: '', notes: '' });
  const [apptSaving, setApptSaving] = useState(false);
  const [countryBlockedModal, setCountryBlockedModal] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1440,
  );

  // Persist today's stats to localStorage whenever they change
  useEffect(() => {
    try { localStorage.setItem(todayKey, JSON.stringify(stats)); } catch { /* ignore */ }
  }, [stats, todayKey]);

  const HEARTBEAT_MS = 20000;

  const {
    callState,
    lastError,
    sipCause,
    callOutcome,
    makeCall,
    attachCall,
    hangup,
    registered,
    handleWebSocketCallUpdate,
    sendDTMF,
    updateCredentials,
    incomingCall,
    incomingCallInfo,
    speakerDevices,
    speakerDeviceId,
    speakerSupported,
    speakerError,
    setSpeakerDevice,
    refreshSpeakerDevices,
  } = useSoftphoneContext();

  const emitAgentStatus = useCallback((nextStatus) => {
    agentWsStatusRef.current = nextStatus;
    if (socket && agentId) {
      socket.emit('agent:status', { agentId, status: nextStatus });
    }
  }, [socket, agentId]);

  // Track inbound calls in recentCalls
  const prevIncomingCallRef = useRef(null);
  useEffect(() => {
    const prev = prevIncomingCallRef.current;
    if (prev && !incomingCall) {
      // Call ended — was it answered or missed?
      const wasAnswered = callState === 'connected' || callState === 'disconnected';
      const from = prev.options?.remoteCallerNumber || prev.from || 'Unknown';
      const callerName = prev.options?.remoteCallerName || from;
      setRecentCalls(p => [{
        lead: callerName !== from ? callerName : from,
        number: from,
        time: new Date().toLocaleTimeString(),
        disposition: wasAnswered ? 'Received' : 'Missed',
        direction: 'inbound',
      }, ...p.slice(0, 49)]);
    }
    prevIncomingCallRef.current = incomingCall || null;
  }, [incomingCall]);

  // Auto-skip on invalid number or failed call
  const autoSkipRef = useRef(false);
  useEffect(() => {
    if (callState === 'failed' && lastError) {
      // Show error briefly then clear lead and reset state.
      // The callOutcome auto-advance effect will handle moving to the next lead.
      const t = setTimeout(() => {
        // Mark the pre-dial RINGING call log as FAILED so retries are not blocked.
        // Cannot call finalizeCallLog() here (TDZ: const declared later at line 677).
        // Inline equivalent: PATCH the call log directly.
        const stuckLogId = callLogIdRef.current;
        if (stuckLogId && !finalizedCallLogsRef.current.has(stuckLogId)) {
          finalizedCallLogsRef.current.add(stuckLogId);
          fetchJson(`${API_URL}/dialer/call/log/${stuckLogId}`, {
            method: 'PATCH',
            body: JSON.stringify({ callStatus: 'FAILED', disposition: 'Unreachable', endedAt: new Date().toISOString() }),
          }).catch(() => { finalizedCallLogsRef.current.delete(stuckLogId); });
        }
        setCurrentLead(null);
        currentLeadRef.current = null;
        setCallLogId(null);
        setStatus(campaignDialingActiveRef.current ? 'Waiting for Lead...' : 'Idle');
        autoSkipRef.current = false;
        emitAgentStatus(campaignDialingActiveRef.current ? 'available' : 'paused');
      }, 2500);
      return () => clearTimeout(t);
    }
    // NOTE: handleDialLead and finalizeCallLog are intentionally excluded — they are defined
    // later in the component and including them in deps here causes a TDZ crash at render time.
    // finalizeCallLog has [] deps so its reference is stable; callLogIdRef is a ref (stable).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callState, lastError, emitAgentStatus]);

  // Fetch leads + VM templates + SMS templates
  const fetchLeads = useCallback(async (currentAgentId) => {
    if (!currentAgentId) return;
    setLeadsLoading(true);
    try {
      // Pass agentId to filter leads by assigned lists
      const data = await fetchJson(`${API_URL}/leads?agentId=${currentAgentId}&limit=500`);
      setLeads(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch leads:', error);
    } finally {
      setLeadsLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const data = await fetchJson(`${API_URL}/analytics/history?limit=100`);
      setHistoryFeed(Array.isArray(data?.items) ? data.items : []);
      setHistoryStats(data?.stats || { missedCalls: 0, receivedCalls: 0, dialedCalls: 0, totalMessages: 0 });
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const fetchAppointments = useCallback(async (aid) => {
    const id = aid || agentId;
    if (!id) return;
    setAppointmentsLoading(true);
    try {
      const data = await fetchJson(`${API_URL}/dialer/scheduled-callbacks?agentId=${id}`);
      setAppointments(Array.isArray(data) ? data : []);
    } catch { /* silent */ }
    finally { setAppointmentsLoading(false); }
  }, [agentId]);

  useEffect(() => {
    const token = getToken();
    // Guard: if no token is present, ProtectedRoute should already redirect — bail early
    if (!token) return;

    // ─── UI DEV MODE: seed mock data, skip all API calls ─────────────────────
    if (token === 'dev-mode-fake-token') {
      const mockProfile = {
        id: 'dev-user-1',
        name: 'Dev Agent',
        email: 'dev@voxiq.com',
        role: 'agent',
        sipUri: '',
        sipPassword: '',
        callerNumber: '+15550001234',
        callerName: 'Dev Agent',
        status: 'active',
        createdAt: new Date().toISOString(),
      };
      setAgentId('dev-user-1');
      setProfile(mockProfile);
      updateCredentials({ login: '', password: '', callerName: 'Dev Agent', callerNumber: '' });
      setLeads([
        { id: 'l1', firstName: 'Alice', lastName: 'Johnson', phone: '+15550001111', email: 'alice@example.com', status: 'New' },
        { id: 'l2', firstName: 'Bob', lastName: 'Smith', phone: '+15550002222', email: 'bob@example.com', status: 'Called' },
        { id: 'l3', firstName: 'Carol', lastName: 'Williams', phone: '+15550003333', email: 'carol@example.com', status: 'New' },
        { id: 'l4', firstName: 'David', lastName: 'Brown', phone: '+15550004444', email: 'david@example.com', status: 'Voicemail' },
        { id: 'l5', firstName: 'Eva', lastName: 'Davis', phone: '+15550005555', email: 'eva@example.com', status: 'New' },
      ]);
      setHistoryFeed([
        { id: 'h1', type: 'call', category: 'dialed', phone: '+15550001111', name: 'Alice Johnson', createdAt: new Date(Date.now() - 3600000).toISOString(), duration: 120 },
        { id: 'h2', type: 'call', category: 'missed', phone: '+15550002222', name: 'Bob Smith', createdAt: new Date(Date.now() - 7200000).toISOString(), duration: 0 },
        { id: 'h3', type: 'sms', category: 'dialed', phone: '+15550003333', name: 'Carol Williams', createdAt: new Date(Date.now() - 10800000).toISOString() },
      ]);
      setHistoryStats({ missedCalls: 1, receivedCalls: 3, dialedCalls: 8, totalMessages: 5 });
      setPeriodStats({ today: 8, yesterday: 12, thisWeek: 47, lastWeek: 53, thisMonth: 180, thisYear: 1420 });
      setLeadsLoading(false);
      setAppointmentsLoading(false);
      setHistoryLoading(false);
      return; // skip all API calls
    }
    // ─────────────────────────────────────────────────────────────────────────

    // 1. Get current user profile — cache: 'no-store' prevents stale cached responses
    //    on re-mounts from returning a 200 after the token has been cleared
    fetchJson(`${API_URL}/auth/profile`, { cache: 'no-store' }).then(async (auth) => {
      if (auth?.userId) {
        setAgentId(auth.userId);
        try { localStorage.setItem('voxiq_agent_id', auth.userId); } catch { }
        const tzOffset = new Date().getTimezoneOffset();
        const [fullUser, historyData, appointmentData, periodData, leadData] = await Promise.all([
          fetchJson(`${API_URL}/users/${auth.userId}`).catch(() => null),
          fetchJson(`${API_URL}/analytics/history?limit=100`).catch(() => null),
          fetchJson(`${API_URL}/dialer/scheduled-callbacks?agentId=${auth.userId}`).catch(() => null),
          fetchJson(`${API_URL}/analytics/my-period-stats?tzOffset=${encodeURIComponent(tzOffset)}`).catch(() => null),
          fetchJson(`${API_URL}/leads?agentId=${auth.userId}&limit=500`).catch(() => null),
        ]);

        setProfile(fullUser);
        updateCredentials({
          login: fullUser?.sipUri || '',
          password: fullUser?.sipPassword || '',
          callerName: fullUser?.name || 'Voxiq Agent',
          callerNumber: fullUser?.callerNumber || '',
        });

        setHistoryFeed(Array.isArray(historyData?.items) ? historyData.items : []);
        setHistoryStats(historyData?.stats || { missedCalls: 0, receivedCalls: 0, dialedCalls: 0, totalMessages: 0 });
        setAppointments(Array.isArray(appointmentData) ? appointmentData : []);
        if (periodData) setPeriodStats(periodData);
        setLeads(Array.isArray(leadData) ? leadData : []);
        setLeadsLoading(false);
        setAppointmentsLoading(false);
        setHistoryLoading(false);
      }
    });

    const authHeaders = token
      ? { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
      : { 'Content-Type': 'application/json' };
    fetch(`${API_URL}/voicemail/templates`, { headers: authHeaders })
      .then(r => r.ok ? r.json() : [])
      .then(d => setVmTemplates(Array.isArray(d) ? d : []))
      .catch(() => setVmTemplates([]));
    fetch(`${API_URL}/integrations/sms-templates`, { headers: authHeaders })
      .then(r => r.ok ? r.json() : [])
      .then(d => setSmsTemplates(Array.isArray(d) ? d : []))
      .catch(() => setSmsTemplates([]));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Call timer
  useEffect(() => {
    let t;
    if (callState === 'connected') {
      const start = Date.now();
      t = setInterval(() => {
        setCallTimer(Math.floor((Date.now() - start) / 1000));
      }, 1000);
    } else {
      setCallTimer(0);
    }
    return () => { if (t) clearInterval(t); };
  }, [callState]);

  // Socket events
  useEffect(() => {
    if (socket && isConnected && agentId) {
      socket.emit('agent:register', { agentId });
      emitAgentStatus('paused');

      const heartbeat = setInterval(() => {
        socket.emit('agent:status', { agentId, status: agentWsStatusRef.current });
      }, HEARTBEAT_MS);

      // Autodialer assigned a call to this agent
      socket.on('call:incoming', (data) => {
        console.log('Incoming call:', data);
        setCurrentLead(data.lead);
        setCallLogId(data.callLogId);
        setLocalCallActive(true);
        setStatus('Dialing Lead');
        agentWsStatusRef.current = 'on_call';
        attachCall(data.callLogId);
      });

      // Backend broadcasts this from Telnyx webhook when call is answered/ended
      socket.on('call:update', (data) => {
        console.log('Call update received:', data);
        handleWebSocketCallUpdate(data.callLogId, data.status);
        if (data.status === 'connected') {
          setStatus('On Call');
          setLocalCallActive(true);
          agentWsStatusRef.current = 'on_call';
        } else if (data.status === 'completed' || data.status === 'hangup') {
          const nextStatus = campaignDialingActiveRef.current ? 'available' : 'paused';
          setStatus(campaignDialingActiveRef.current ? 'Waiting for Lead...' : 'Idle');
          setLocalCallActive(false);
          emitAgentStatus(nextStatus);
          fetchHistory();
        }
      });

      socket.on(`sms:received:${profile?.accountId}`, (msg) => {
        const contact = msg.fromNumber;
        setSmsConversations(prev => {
          const existing = prev.find(c => c.contactNumber === contact);
          if (existing) {
            return [
              { ...existing, lastMessage: msg.body, lastMessageAt: msg.createdAt, direction: 'inbound' },
              ...prev.filter(c => c.contactNumber !== contact),
            ];
          }
          return [{ contactNumber: contact, lastMessage: msg.body, lastMessageAt: msg.createdAt, direction: 'inbound', agentName: null, agentId: null }, ...prev];
        });
        setSmsActiveThread(prev => {
          if (prev === contact) {
            setSmsMessages(msgs => [...msgs, { ...msg, direction: 'inbound' }]);
          }
          return prev;
        });
        fetchHistory();
      });

      return () => {
        clearInterval(heartbeat);
        socket.off('call:incoming');
        socket.off('call:update');
        socket.off(`sms:received:${profile?.accountId}`);
      };
    }
  }, [socket, isConnected, agentId, attachCall, handleWebSocketCallUpdate, profile, fetchHistory, emitAgentStatus]);

  // Effect to fetch full lead details (with list) if missing
  useEffect(() => {
    if (currentLead && (!currentLead.list || !currentLead.list.name)) {
      fetchJson(`${API_URL}/leads/${currentLead.id}`)
        .then(fullLead => {
          if (fullLead?.list) {
            setCurrentLead(prev => ({ ...prev, list: fullLead.list }));
          }
        })
        .catch(err => console.error('Full lead fetch error:', err));
    }
  }, [currentLead?.id]);

  const handleStartDialing = () => {
    setCampaignDialingActive(true);
    setStatus('Waiting for Lead...');
    emitAgentStatus('available');
  };

  const handlePause = () => {
    setCampaignDialingActive(false);
    setStatus('Paused');
    emitAgentStatus('paused');
  };

  // Manually dial a lead from the queue
  const handleDialLead = useCallback(async (lead) => {
    hasDialedRef.current = true;

    if (!isAllowedCountry(lead?.phone)) { setCountryBlockedModal(true); return false; }

    // 1. Acquire distributed lock: prevent two agents dialing the same number
    //    The lock creates a RINGING callLog which blocks getNextLeadBatch for other agents.
    let logId = null;
    try {
      const lockRes = await fetchJson(`${API_URL}/dialer/call/lock`, {
        method: 'POST',
        body: JSON.stringify({ leadId: lead.id, agentId, phone: lead.phone }),
      });

      if (!lockRes?.locked) {
        const reason = lockRes?.reason || 'unknown';
        console.warn(`[Dialer] Lock denied for lead ${lead.id} — reason: ${reason}`);
        if (reason === 'db_error') {
          // DB issue creating callLog — proceed with call anyway (no tracking)
          console.warn('[Dialer] db_error on lock — proceeding without callLog');
        } else {
          // Another agent is dialing this lead — skip it
          if (!autoDialRef.current) {
            setStatus(`⚠️ Already being dialed by another agent — skipping`);
            setTimeout(() => setStatus('Idle'), 2500);
          }
          return false;
        }
      }

      // Lock acquired — use the callLogId returned by the lock endpoint
      logId = lockRes.callLogId;
      setCallLogId(logId);
    } catch (e) {
      console.warn('Lock request failed, proceeding anyway (offline fallback):', e);
      // Fallback: create callLog the old way if lock endpoint is unreachable
      try {
        const logData = await fetchJson(`${API_URL}/dialer/call/log`, {
          method: 'POST',
          body: JSON.stringify({ leadId: lead.id, agentId }),
        });
        if (logData?.id) { logId = logData.id; setCallLogId(logId); }
      } catch (_) { /* ignore — don't block the call */ }
    }

    setCurrentLead(lead);
    currentLeadRef.current = lead; // Keep ref in sync
    setStatus('Dialing...');
    setLocalCallActive(true);

    // 2. Start the actual WebRTC call (logId already set from lock)
    const result = await makeCall(lead.phone, lead.id, logId);
    if (result?.callLogId) setCallLogId(result.callLogId);
    if (!result) {
      if (logId) finalizeCallLog('invalid', logId);
      setStatus('Dial Failed');
      setLocalCallActive(false);
      setCurrentLead(null);
      currentLeadRef.current = null;
      return false;
    }
    return true; // Success
  // finalizeCallLog intentionally excluded from deps: declared with const at line ~688 (after this
  // callback), so including it in the deps array causes a TDZ ReferenceError at render time.
  // It has [] deps itself so its reference is stable — safe to omit.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [makeCall, agentId]);

  const ALLOWED_DIAL_PREFIXES = [
    '+1',
    '+44', '+49', '+33', '+34', '+39', '+31', '+32', '+41', '+43',
    '+45', '+46', '+47', '+48', '+351', '+353', '+358', '+370', '+371', '+372',
    '+420', '+421', '+36', '+40', '+30', '+385', '+386', '+359',
    '+352', '+354', '+356', '+357', '+376', '+377', '+378', '+423',
  ];
  const isAllowedCountry = (phone) => {
    if (!phone?.startsWith('+')) return true;
    return ALLOWED_DIAL_PREFIXES.some(p => phone.startsWith(p));
  };

  const handleManualInputDial = useCallback(async (overrideNumber, overrideName) => {
    const rawNumber = (typeof overrideNumber === 'string' ? overrideNumber : null) || dialNumber;
    const numberToUse = rawNumber && !rawNumber.startsWith('+') ? dialCountryCode + rawNumber : rawNumber;
    if (!numberToUse) return;
    if (!isAllowedCountry(numberToUse)) { setCountryBlockedModal(true); return; }
    if (!agentId) {
      alert('Profile still loading — please wait a moment and try again.');
      return;
    }
    const originalNumber = numberToUse;
    const nameToUse = (typeof overrideName === 'string' ? overrideName : null) || dialName || '';
    setLastDialedNumber(originalNumber);
    try { localStorage.setItem('voxiq_last_dialed', originalNumber); } catch { /* ignore */ }

    const shouldUseSelectedLead =
      !!currentLead?.id &&
      (!rawNumber || rawNumber.trim() === '' || rawNumber.replace(/\D/g, '') === (currentLead.phone || '').replace(/\D/g, ''));

    // Only use the selected lead when the agent did not intentionally type a different number.
    if (shouldUseSelectedLead) {
      await handleDialLead(currentLead);
      setDialNumber('');
    } else {
      // Show name + number in Lead Profile during the call
      const nameParts = nameToUse.trim().split(' ');
      setCurrentLead({
        id: null,
        firstName: nameParts[0] || 'Manual',
        lastName: nameParts.slice(1).join(' ') || '',
        phone: originalNumber,
        status: 'MANUAL',
        list: { name: 'Manual Dial' },
        address: '',
      });
      currentLeadRef.current = {
        id: null,
        firstName: nameParts[0] || 'Manual',
        lastName: nameParts.slice(1).join(' ') || '',
        phone: originalNumber,
        status: 'MANUAL',
      };

      setStatus('Dialing Manual...');
      setLocalCallActive(true);

      try {
        const logData = await fetchJson(`${API_URL}/dialer/call/log`, {
          method: 'POST',
          body: JSON.stringify({
            manualNumber: originalNumber,
            manualName: nameToUse || undefined,
            agentId,
            isManual: true
          }),
        });

        const result = await makeCall(originalNumber, null, logData?.id);
        if (result) {
          setDialNumber('');
          setDialName('');
          if (logData?.id) setCallLogId(logData.id);
        } else {
          if (logData?.id) finalizeCallLog('invalid', logData.id);
          setStatus('Dial Failed');
          setLocalCallActive(false);
          setCurrentLead(null);
          currentLeadRef.current = null;
          alert(callFailureMessage(lastError));
        }
      } catch (e) {
        console.warn('Manual dial process failed:', e);
        const errMsg = (e?.message || '').toLowerCase();
        if (errMsg.includes('trial') || errMsg.includes('trial_expired')) {
          setStatus('Error');
          setLocalCallActive(false);
          setCurrentLead(null);
          currentLeadRef.current = null;
          alert('Your free trial has expired. Please contact your admin to upgrade your plan.');
          return;
        }
        const result = await makeCall(originalNumber);
        if (result) {
          setDialNumber('');
          setDialName('');
        } else {
          setStatus('Error');
          setLocalCallActive(false);
          setCurrentLead(null);
          currentLeadRef.current = null;
          alert(callFailureMessage(lastError));
        }
      }
    }
  // finalizeCallLog intentionally excluded: TDZ (declared later). Stable [] deps — safe to omit.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialNumber, dialCountryCode, dialName, currentLead, handleDialLead, makeCall, agentId, lastError]);

  // Skip to next lead in auto-dial mode (or stop if list exhausted)
  const handleAutoSkip = useCallback(async () => {
    const leadsList = autoDialLeadsRef.current;
    let nextIndex = autoDialIndexRef.current + 1;

    while (nextIndex < leadsList.length) {
      // Skip leads already dialed in THIS SESSION
      if (dialedIdsRef.current.has(leadsList[nextIndex]?.id)) {
        nextIndex++;
        continue;
      }

      setAutoDialIndex(nextIndex);
      autoDialIndexRef.current = nextIndex;

      // Try to dial — if locked by another agent, handleDialLead returns false
      const success = await handleDialLead(leadsList[nextIndex]);
      if (success) {
        setAutoDialCountdown(null);
        return; // Dialing started, exit loop
      }

      // If lock denied, immediately loop to try the NEXT one
      nextIndex++;
    }

    setAutoDial(false);
    autoDialRef.current = false;
    setAutoDialCountdown(null);
    setStatus('✅ List Complete!');
  }, [handleDialLead]);

  // Start / stop auto-dial
  const lastSearchRef = useRef(''); // Track search used for current auto-dial session
  const toggleAutoDial = useCallback(() => {
    if (autoDialRef.current) {
      // Pause
      setAutoDial(false);
      autoDialRef.current = false;
      setAutoDialCountdown(null);
      setStatus('Paused');
    } else {
      const q = leadSearch.toLowerCase();
      // Check if we should resume or start fresh
      const isResuming = autoDialLeadsRef.current.length > 0 && q === lastSearchRef.current;

      const snapshot = isResuming ? autoDialLeadsRef.current : leads.filter(lead => {
        if (!q) return true;
        return (
          (lead.firstName || '').toLowerCase().includes(q) ||
          (lead.lastName || '').toLowerCase().includes(q) ||
          (lead.phone || '').includes(q)
        );
      });

      if (snapshot.length === 0) return;

      if (!isResuming) {
        autoDialLeadsRef.current = snapshot;
        lastSearchRef.current = q;
        dialedIdsRef.current = new Set();
        setAutoDialIndex(0);
        autoDialIndexRef.current = 0;
      }

      const currentIdx = autoDialIndexRef.current;
      setAutoDial(true);
      autoDialRef.current = true;
      hasDialedRef.current = true;
      handleDialLead(snapshot[currentIdx]);
    }
  }, [leads, leadSearch, handleDialLead]);

  // Track when the current call FIRST became active (connecting/ringing/connected)
  const callActiveSinceRef = useRef(null);
  const MIN_CALL_ACTIVE_MS = 5000;

  // Record the timestamp when call first becomes active
  useEffect(() => {
    if (callState === 'connecting' || callState === 'ringing' || callState === 'connected') {
      if (!callActiveSinceRef.current) callActiveSinceRef.current = Date.now();
    }
  }, [callState]);

  // ── Lead status badges helper ─────────────────────────────────────────────
  const leadStatusMap = useRef({}); // leadId → 'invalid' | 'no_answer' | 'answered' | 'dialing'
  const [leadStatuses, setLeadStatuses] = useState({}); // triggers re-render

  const updateLeadStatus = useCallback((leadId, status) => {
    leadStatusMap.current[leadId] = status;
    setLeadStatuses(prev => ({ ...prev, [leadId]: status }));
  }, []);

  const finalizeCallLog = useCallback((outcome, explicitCallLogId) => {
    const targetCallLogId = explicitCallLogId || callLogIdRef.current;
    if (!targetCallLogId || finalizedCallLogsRef.current.has(targetCallLogId)) return;

    finalizedCallLogsRef.current.add(targetCallLogId);

    const callStatus = outcome === 'answered' ? 'COMPLETED' : 'FAILED';
    const disposition =
      outcome === 'no_answer' ? 'No Answer'
        : outcome === 'voicemail' ? 'Voicemail'
          : outcome === 'callback' ? 'Callback'
            : outcome === 'invalid' ? 'Unreachable'
              : outcome === 'answered' ? 'Contacted'
                : undefined;

    fetchJson(`${API_URL}/dialer/call/log/${targetCallLogId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        callStatus,
        disposition,
        endedAt: new Date().toISOString(),
      }),
    }).catch((error) => {
      finalizedCallLogsRef.current.delete(targetCallLogId);
      console.warn('Call log finalize failed:', error);
    });
  }, []);

  // ── Smart lead reordering on call outcome ──────────────────────────────
  // outcome: 'answered' | 'no_answer' | 'voicemail' | 'invalid'
  const handleCallOutcome = useCallback((lead, outcome) => {
    if (!lead) return;

    finalizeCallLog(outcome);

    // Update visual status badge
    updateLeadStatus(lead.id, outcome);

    // Mark as dialed in current auto-dial session so it won't be re-dialed
    dialedIdsRef.current.add(lead.id);

    // Increment session call stats on every call end, not just on disposition
    setStats(prev => ({
      ...prev,
      calls: prev.calls + 1,
    }));

    // Map outcome to a valid Prisma LeadStatus enum value:
    // NEW | CONTACTED | CALLBACK | NO_ANSWER | BOOKED | DNC
    const backendStatus =
      outcome === 'answered' ? 'CONTACTED'
        : outcome === 'callback' ? 'CALLBACK'
          : outcome === 'no_answer' || outcome === 'voicemail' ? 'NO_ANSWER'
            : outcome === 'invalid' ? 'UNREACHABLE'
              : 'CONTACTED';

    if (lead.id) {
      fetchJson(`${API_URL}/leads/${lead.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: backendStatus }),
      }).then(() => {
        console.log(`[Outcome] Lead ${lead.id} persisted as ${backendStatus}`);
      }).catch(e => console.warn('Lead status update failed:', e));
    }

    // Reorder the live leads list
    setLeads(prev => {
      const rest = prev.filter(l => l.id !== lead.id);
      const updated = { ...lead, status: backendStatus, _outcome: outcome };
      // ALL dialing outcomes (answered, no_answer, voicemail, callback, invalid)
      // move the lead to the bottom of the visible queue so the agent keeps seeing fresh leads.
      return [...rest, updated];
    });

    // NOTE: Do NOT reorder autoDialLeadsRef.current here.
    // Reordering breaks index-based auto-advance (index increments from old position
    // into a reordered array, skipping leads). dialedIdsRef already prevents re-dialing.
  }, [finalizeCallLog, updateLeadStatus]);

  // ── Auto-advance: outcome-driven ──────────────────────────────────────────
  // RULES:
  //   'invalid'   → skip after 3s (safety buffer for valid numbers with brief network issues)
  //   'no_answer' → 2s countdown then next
  //   'answered'  → NEVER auto-skip, agent must manually end call
  const callSeqRef = useRef(0); // Incremented on every new call — guards against stale effect fires
  useEffect(() => {
    if (!autoDial) return;
    if (!hasDialedRef.current) return;
    // Fire on 'disconnected' (normal end) OR 'failed' (Telnyx error/rejection)
    if (callState !== 'disconnected' && callState !== 'failed') return;

    const outcome = callOutcome; // 'invalid' | 'no_answer' | 'answered' | null
    if (!outcome) return; // callOutcome resets to null at start of each call — if null, call hasn't ended yet
    if (outcome === 'answered') return; // Agent manually ended an answered call — never auto-advance

    // Snapshot the current call sequence so we can cancel if a new call starts mid-countdown
    // IMPORTANT: Only increment ONCE per outcome, not on re-renders
    const mySeq = (callSeqRef.current += 1);

    // Use REF to get current lead — NOT state, because hangup() clears state before this fires
    const leadForOutcome = currentLeadRef.current;
    if (leadForOutcome) handleCallOutcome(leadForOutcome, outcome);
    // Now safe to clear the ref since handleCallOutcome captured it
    currentLeadRef.current = null;

    const delay = outcome === 'invalid' ? 1500 : 2000; // 1.5s for invalid to move fast, 2s for no-answer

    const doAdvance = async () => {
      // If a new call started while we were counting, abort
      if (callSeqRef.current !== mySeq) return;

      callActiveSinceRef.current = null;
      if (!autoDialRef.current) return;

      const leadsList = autoDialLeadsRef.current;
      let nextIndex = autoDialIndexRef.current + 1;

      while (nextIndex < leadsList.length) {
        // Skip leads already dialed in this session
        if (dialedIdsRef.current.has(leadsList[nextIndex]?.id)) {
          nextIndex++;
          continue;
        }

        setAutoDialIndex(nextIndex);
        autoDialIndexRef.current = nextIndex;

        const success = await handleDialLead(leadsList[nextIndex]);
        if (success) return; // Dialing started, exit loop

        nextIndex++; // If locked, try next
      }

      setAutoDial(false);
      autoDialRef.current = false;
      setAutoDialCountdown(null);
      setStatus('✅ List Complete!');
    };

    const countSeconds = Math.round(delay / 1000);
    let count = countSeconds;
    setAutoDialCountdown(outcome === 'invalid' ? null : count); // Don't show countdown for invalid
    const timer = setInterval(() => {
      if (callSeqRef.current !== mySeq) { clearInterval(timer); return; }
      count -= 1;
      if (count <= 0) {
        clearInterval(timer);
        setAutoDialCountdown(null);
        doAdvance();
      } else {
        if (outcome !== 'invalid') setAutoDialCountdown(count);
      }
    }, 1000);
    return () => clearInterval(timer);
    // NOTE: currentLead and handleCallOutcome intentionally omitted from deps.
    // We use currentLeadRef (ref) to avoid re-fires when hangup() clears currentLead state mid-countdown.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callState, callOutcome, autoDial, handleDialLead]);

  // ── Manual dial outcome: update lead status/position even when autoDial is OFF ──
  // The auto-advance effect bails early when autoDial=false, so we need this
  // separate effect to still track outcomes for manually dialed calls.
  useEffect(() => {
    if (autoDial) return; // Auto-dial mode handles this in its own effect
    // Fire on 'disconnected' (normal end) OR 'failed' (Telnyx error/rejection)
    if (callState !== 'disconnected' && callState !== 'failed') return;
    if (!callOutcome) return;
    if (!hasDialedRef.current) return;

    const leadForOutcome = currentLeadRef.current;
    if (leadForOutcome) {
      handleCallOutcome(leadForOutcome, callOutcome);
      currentLeadRef.current = null;
    }

    // Always reset the status back to Idle after a manual call ends,
    // even when there was no lead (pure typed-in number dial).
    setLocalCallActive(false);
    setCallLogId(null);
    setStatus('Idle');
    if (leadForOutcome?.id == null) {
      setCurrentLead(null);
      currentLeadRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callState, callOutcome, autoDial]);


  // Drop voicemail via Telnyx play_audio
  const handleVmDrop = async (vmId, vmUrl) => {
    if (!callControlId) return alert('No active call control ID — call may not be fully connected yet');
    try {
      await fetch(`${API_URL}/voip/voicemail-drop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callControlId: callControlId, audioUrl: vmUrl, callLogId }),  // callControlId = Telnyx ID, NOT callLogId
      });
      setShowVmDrop(false);
      alert('✅ Voicemail drop initiated');
    } catch (e) { alert('VM drop failed: ' + e.message); }
  };

  // Send SMS follow-up
  const handleSendSms = async () => {
    if (!currentLead?.phone || !smsMsg) return;
    setSmsSending(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/integrations/sms/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`,
        },
        body: JSON.stringify({ to: currentLead.phone, message: smsMsg }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.sent === false) {
        alert('SMS failed: ' + (data.error || 'Unknown error'));
      } else {
        alert(`✅ SMS sent to ${currentLead.phone}`);
        setShowSmsPanel(false);
        setSmsMsg('');
        await fetchHistory();
      }
    } catch (e) { alert('SMS failed: ' + e.message); }
    finally { setSmsSending(false); }
  };

  const fetchSmsConversations = async (ch) => {
    const channel = ch || activeChannel;
    const token = getToken();
    if (!token) {
      setSmsConversations([]);
      return;
    }
    try {
      const data = await fetchJson(`${API_URL}/sms/conversations?channel=${channel}`);
      setSmsConversations(Array.isArray(data) ? data : []);
    } catch (e) { console.error('fetchSmsConversations:', e); }
  };

  const fetchSmsThread = async (contactNumber, ch) => {
    const channel = ch || activeChannel;
    const token = getToken();
    if (!token) {
      setSmsMessages([]);
      return;
    }
    try {
      const encoded = encodeURIComponent(contactNumber);
      const data = await fetchJson(`${API_URL}/sms/conversations/${encoded}?channel=${channel}`);
      setSmsMessages(Array.isArray(data) ? data : []);
    } catch (e) { console.error('fetchSmsThread:', e); }
  };

  const sendSmsMessage = async () => {
    if (!smsInput.trim() || !smsActiveThread) return;
    setSmsSendingMsg(true);
    try {
      await fetchJson(`${API_URL}/sms/send`, {
        method: 'POST',
        body: JSON.stringify({ to: smsActiveThread, body: smsInput.trim(), channel: activeChannel }),
      });
      setSmsInput('');
      await fetchSmsThread(smsActiveThread, activeChannel);
      await fetchHistory();
    } catch (e) { alert(`${activeChannel === 'whatsapp' ? 'WhatsApp' : 'SMS'} send failed: ` + e.message); }
    finally { setSmsSendingMsg(false); }
  };

  const fetchDialerSmsThread = async (phone) => {
    const normalizedPhone = normalizeSmsPhone(phone, dialCountryCode);
    const token = getToken();
    const requestId = ++dialerSmsRequestIdRef.current;
    if (!normalizedPhone || !token) {
      setDialerSmsMessages([]);
      return;
    }
    try {
      const encoded = encodeURIComponent(normalizedPhone);
      const data = await fetchJson(`${API_URL}/sms/conversations/${encoded}`);
      if (requestId !== dialerSmsRequestIdRef.current) return;
      setDialerSmsMessages(Array.isArray(data) ? data : []);
    } catch { setDialerSmsMessages([]); }
  };

  const sendDialerSms = async () => {
    const phone = normalizeSmsPhone(dialerSmsPhone || currentLead?.phone || dialNumber, dialCountryCode);
    if (!dialerSmsInput.trim() || !phone) return;
    setDialerSmsSending(true);
    try {
      await fetchJson(`${API_URL}/sms/send`, {
        method: 'POST',
        body: JSON.stringify({ to: phone, body: dialerSmsInput.trim() }),
      });
      setDialerSmsInput('');
      await fetchDialerSmsThread(phone);
    } catch (e) { alert('SMS failed: ' + e.message); }
    finally { setDialerSmsSending(false); }
  };

  const scheduleDialerSmsThreadFetch = useCallback((phone) => {
    if (dialerSmsFetchTimeoutRef.current) {
      clearTimeout(dialerSmsFetchTimeoutRef.current);
    }

    dialerSmsFetchTimeoutRef.current = setTimeout(() => {
      fetchDialerSmsThread(phone);
    }, 350);
  }, [dialCountryCode]);

  // Auto-load dialer SMS thread when current lead / dial number changes
  useEffect(() => {
    const phone = currentLead?.phone || dialNumber;
    if (phone) {
      setDialerSmsPhone(phone);
      scheduleDialerSmsThreadFetch(phone);
      return;
    }
    setDialerSmsPhone('');
    setDialerSmsMessages([]);
  }, [currentLead?.phone, dialNumber, scheduleDialerSmsThreadFetch]);

  useEffect(() => () => {
    if (dialerSmsFetchTimeoutRef.current) {
      clearTimeout(dialerSmsFetchTimeoutRef.current);
    }
  }, []);

  // End call - force resets everything regardless of SIP state
  const handleHangup = useCallback(() => {
    if (callState !== 'disconnected' && callState !== 'failed') {
      finalizeCallLog(callState === 'connected' ? 'answered' : 'invalid');
    }
    hangup();
    setLocalCallActive(false);
    // NOTE: Do NOT clear currentLeadRef here — the auto-advance useEffect needs it
    // when callState → disconnected fires (which happens AFTER hangup()).
    // currentLeadRef.current will be cleared after the advance runs.
    setCurrentLead(null);
    // currentLeadRef.current = null; // Removed: effector at 408/478 needs this to process the final outcome
    setCallLogId(null);
    setNotes('');
    setCallbackTime('');
    setDealValue('');
    setStatus('Idle');
    setShowVmDrop(false);
    setShowSmsPanel(false);
    emitAgentStatus(campaignDialingActiveRef.current ? 'available' : 'paused');
  }, [callState, finalizeCallLog, hangup, emitAgentStatus]);

  const handleLogout = () => {
    disconnectForLogout();
    clearToken();
    navigate('/login');
  };

  const ensureDispositionCallLog = useCallback(async () => {
    if (callLogId) return callLogId;
    if (!agentId) return null;

    try {
      if (currentLead?.id) {
        const logData = await fetchJson(`${API_URL}/dialer/call/log`, {
          method: 'POST',
          body: JSON.stringify({ leadId: currentLead.id, agentId }),
        });
        if (logData?.id) {
          setCallLogId(logData.id);
          return logData.id;
        }
      }

      const manualNumber = currentLead?.phone || dialNumber || '';
      const manualName = currentLead
        ? `${currentLead.firstName || ''} ${currentLead.lastName || ''}`.trim()
        : dialName;

      if (manualNumber) {
        const logData = await fetchJson(`${API_URL}/dialer/call/log`, {
          method: 'POST',
          body: JSON.stringify({
            manualNumber,
            manualName: manualName || undefined,
            agentId,
            isManual: true,
          }),
        });
        if (logData?.id) {
          setCallLogId(logData.id);
          return logData.id;
        }
      }
    } catch (error) {
      console.error('Failed to create fallback call log for disposition:', error);
    }

    return null;
  }, [agentId, callLogId, currentLead, dialName, dialNumber]);

  const submitDisposition = useCallback(async (disposition) => {
    // ── Manual Disposition Triggers: trigger outcome before hangup so lead moves to bottom
    const leadForOutcome = currentLeadRef.current || currentLead;
    if (leadForOutcome) {
      if (disposition === 'Voicemail') {
        handleCallOutcome(leadForOutcome, 'voicemail');
      } else if (disposition === 'No Answer') {
        handleCallOutcome(leadForOutcome, 'no_answer');
      } else if (disposition === 'Callback') {
        handleCallOutcome(leadForOutcome, 'callback');
      } else if (disposition === 'Unreachable') {
        handleCallOutcome(leadForOutcome, 'invalid');
      }
      currentLeadRef.current = null; // Consumed: prevent auto-effector from overwriting with 'no_answer'
    }

    const effectiveCallLogId = callLogId || await ensureDispositionCallLog();

    if (!effectiveCallLogId) {
      setRecentCalls(prev => [{
        lead: currentLead ? `${currentLead.firstName} ${currentLead.lastName}` : 'Manual',
        number: currentLead?.phone || dialNumber || '',
        time: new Date().toLocaleTimeString(),
        disposition, direction: 'outbound',
      }, ...prev]);
      setStats(prev => ({
        ...prev,
        calls: prev.calls + 1,
        appointments: disposition === 'Interested' || disposition === 'Booked' ? prev.appointments + 1 : prev.appointments
      }));
      fetchHistory();
      handleHangup();
      return;
    }

    try {
      await fetchJson(`${API_URL}/dialer/call/disposition`, {
        method: 'POST',
        body: JSON.stringify({
          callLogId: effectiveCallLogId,
          disposition,
          notes,
          ...(disposition === 'Callback' && callbackTime ? { callbackAt: callbackTime } : {}),
          ...(dealValue && !isNaN(parseFloat(dealValue)) ? { dealValue: parseFloat(dealValue) } : {})
        }),
      });
      finalizedCallLogsRef.current.add(effectiveCallLogId);

      setRecentCalls(prev => [{
        lead: currentLead ? `${currentLead.firstName} ${currentLead.lastName}` : 'Unknown',
        number: currentLead?.phone || dialNumber || '',
        time: new Date().toLocaleTimeString(),
        disposition, direction: 'outbound',
      }, ...prev]);

      setStats(prev => ({
        ...prev,
        calls: prev.calls + 1,
        appointments: disposition === 'Interested' || disposition === 'Booked' ? prev.appointments + 1 : prev.appointments
      }));

      fetchHistory();
      handleHangup();
    } catch (error) {
      console.error('Failed to submit disposition:', error);
      handleHangup();
    }
  }, [callLogId, notes, callbackTime, currentLead, handleHangup, dealValue, handleCallOutcome, fetchHistory, ensureDispositionCallLog, dialNumber]);

  // Native keyboard shortcuts - works on Mac and all browsers
  useEffect(() => {
    const handleKey = (e) => {
      // Only trigger if not typing in an input/textarea
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      // DTMF Support: 0-9, *, #
      if (callState === 'connected') {
        if (/^[0-9*#]$/.test(e.key)) {
          e.preventDefault();
          sendDTMF(e.key);
          return;
        }
      }

      if (e.key === 'F1') { e.preventDefault(); submitDisposition('Interested'); }
      if (e.key === 'F2') { e.preventDefault(); submitDisposition('Callback'); }
      if (e.key === 'F3') { e.preventDefault(); submitDisposition('Voicemail'); }
      if (e.key === 'F4') { e.preventDefault(); submitDisposition('No Answer'); }
      if (e.key === 'F5') { e.preventDefault(); submitDisposition('Unreachable'); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [submitDisposition, callState, sendDTMF]);

  // ── Appointment handlers ───────────────────────────────────────────────
  const saveAppointment = async () => {
    if (!apptForm.customerName || !apptForm.customerPhone || !apptForm.scheduledAt) return;
    setApptSaving(true);
    try {
      await fetchJson(`${API_URL}/dialer/scheduled-callbacks`, {
        method: 'POST',
        body: JSON.stringify({
          agentId,
          customerName: apptForm.customerName,
          customerPhone: apptForm.customerPhone,
          customerEmail: apptForm.customerEmail || undefined,
          scheduledAt: apptForm.scheduledAt,
          notes: apptForm.notes || undefined,
        }),
      });
      setShowApptModal(false);
      setApptForm({ customerName: '', customerPhone: '', customerEmail: '', scheduledAt: '', notes: '' });
      fetchAppointments(agentId);
    } catch { /* silent */ }
    finally { setApptSaving(false); }
  };

  const markApptDone = async (id) => {
    try {
      await fetchJson(`${API_URL}/dialer/scheduled-callbacks/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'DONE' }) });
      fetchAppointments(agentId);
    } catch { /* silent */ }
  };

  const cancelAppt = async (id) => {
    try {
      await fetchJson(`${API_URL}/dialer/scheduled-callbacks/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'CANCELLED' }) });
      fetchAppointments(agentId);
    } catch { /* silent */ }
  };

  // Calendar helper computed values
  const apptsByDate = appointments.reduce((acc, a) => {
    const d = new Date(a.scheduledAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(a);
    return acc;
  }, {});

  const calFilteredAppts = calSelectedDate ? (apptsByDate[calSelectedDate] || []) : appointments;

  const filteredLeads = leads.filter(lead => {
    if (!leadSearch) return true;
    const q = leadSearch.toLowerCase();
    return (
      (lead.firstName || '').toLowerCase().includes(q) ||
      (lead.lastName || '').toLowerCase().includes(q) ||
      (lead.phone || '').includes(q)
    );
  });

  // Is a call in progress - either SIP state OR we locally initiated one
  const callActive = localCallActive || callState === 'connecting' || callState === 'connected' || callState === 'ringing';

  // Sync localCallActive with SIP state - when SIP disconnects, clear local flag too
  useEffect(() => {
    if (callState === 'disconnected' || callState === 'failed') {
      setLocalCallActive(false);
    }
  }, [callState]);

  // Line status display
  const lineStatusText = () => {
    if (callState === 'connected') return `CONNECTED • ${String(Math.floor(callTimer / 60)).padStart(2, '0')}:${String(callTimer % 60).padStart(2, '0')}`;
    if (callState === 'connecting') return 'DIALING... ☎️';
    if (callState === 'ringing') return 'RINGING... 🔔';
    if (callState === 'failed') return errorLabel(lastError) || 'CALL FAILED';
    return status;
  };

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isTablet = viewportWidth <= 1024;
  const isMobile = viewportWidth <= 768;
  const isNarrowPhone = viewportWidth <= 560;
  const isCompactDesktop = viewportWidth <= 1380;
  const isHistoryCompact = true;

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', overflowX: 'hidden' }}>

      {/* ── COUNTRY BLOCKED MODAL ──────────────────────────────────── */}
      {countryBlockedModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#1e293b', borderRadius: 18, padding: '36px 32px', maxWidth: 400, width: '100%', textAlign: 'center', boxShadow: '0 12px 48px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: 44, marginBottom: 14 }}>🌍</div>
            <h3 style={{ color: '#f1f5f9', fontSize: '1.15rem', fontWeight: 800, marginBottom: 10, margin: '0 0 10px' }}>Country Not Available</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.65, marginBottom: 28 }}>
              Outbound calls to this country are not available on your current plan.<br /><br />
              If you need additional countries access, please contact your admin.
            </p>
            <button
              onClick={() => setCountryBlockedModal(false)}
              style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 32px', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              OK, Got it
            </button>
          </div>
        </div>
      )}

      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <header style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1b2050 100%)',
        padding: isMobile ? '0.6rem 0.875rem' : '0 2rem',
        minHeight: isMobile ? 'auto' : '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: isMobile ? 'wrap' : 'nowrap',
        gap: isMobile ? '0.5rem' : 0,
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
        flexShrink: 0,
      }}>
        {/* Voxiq Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: 38, height: 38,
            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 4px 14px rgba(99,102,241,0.5)',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.46 2 2 0 0 1 3.57 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.54a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
          </div>
          <div>
            <div style={{ fontFamily: 'Outfit,sans-serif', fontWeight: 900, fontSize: '1.2rem', color: 'white', letterSpacing: '-0.02em', lineHeight: 1.1 }}>Voxiq</div>
            <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Agent Dashboard</div>
          </div>
        </div>
        {/* Right: info pills + sign out */}
        {isMobile ? (
          /* ── MOBILE HEADER: compact single row ── */
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', width: '100%', overflowX: 'auto', flexWrap: 'nowrap' }}>
            {profile && (
              <div style={{ padding: '4px 9px', borderRadius: 7, background: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.12)', flexShrink: 0 }}>
                <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Agent</div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'white', whiteSpace: 'nowrap' }}>{profile.name || 'Agent'}</div>
              </div>
            )}
            <div style={{ padding: '4px 9px', borderRadius: 7, background: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.12)', flexShrink: 0 }}>
              <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Caller ID</div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{profile?.callerNumber || '---'}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 7, background: isConnected ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', border: `1px solid ${isConnected ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, flexShrink: 0 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: isConnected ? '#10b981' : '#ef4444' }} />
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: isConnected ? '#34d399' : '#fca5a5', whiteSpace: 'nowrap' }}>{isConnected ? 'Live' : 'Off'}</span>
            </div>
            <div style={{ padding: '6px 9px', borderRadius: 7, background: registered ? 'rgba(16,185,129,0.1)' : 'rgba(251,191,36,0.1)', border: `1px solid ${registered ? 'rgba(16,185,129,0.25)' : 'rgba(251,191,36,0.25)'}`, fontSize: '0.68rem', fontWeight: 700, color: registered ? '#34d399' : '#fbbf24', flexShrink: 0, whiteSpace: 'nowrap' }}>
              {registered ? '✓ SIP' : '⚠ SIP'}
            </div>
            <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
              <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', background: 'linear-gradient(135deg, #dc2626, #991b1b)', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                Out
              </button>
            </div>
          </div>
        ) : (
          /* ── DESKTOP HEADER: full pills ── */
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {profile && (
              <div style={{ padding: '4px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.38)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Agent</div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'white' }}>{profile.name || 'Agent'}</div>
              </div>
            )}
            <div style={{ padding: '4px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.38)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Caller ID</div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.9)', fontFamily: 'monospace' }}>{profile?.callerNumber || '---'}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: 8, background: isConnected ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', border: `1px solid ${isConnected ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: isConnected ? '#10b981' : '#ef4444', boxShadow: isConnected ? '0 0 8px rgba(16,185,129,0.8)' : '0 0 8px rgba(239,68,68,0.8)' }} />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: isConnected ? '#34d399' : '#fca5a5' }}>{isConnected ? 'Online' : 'Offline'}</span>
            </div>
            <div style={{ padding: '6px 12px', borderRadius: 8, background: registered ? 'rgba(16,185,129,0.1)' : 'rgba(251,191,36,0.1)', border: `1px solid ${registered ? 'rgba(16,185,129,0.25)' : 'rgba(251,191,36,0.25)'}`, fontSize: '0.73rem', fontWeight: 700, color: registered ? '#34d399' : '#fbbf24' }}>
              {registered ? '✓ SIP Ready' : '⚠ SIP...'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <span style={{ fontSize: '0.9rem' }}>🔊</span>
              <select value={speakerDeviceId || 'default'} onChange={(e) => setSpeakerDevice(e.target.value)} onClick={() => refreshSpeakerDevices?.()} disabled={!speakerSupported}
                style={{ background: 'transparent', color: 'white', border: 'none', outline: 'none', fontSize: '0.72rem', fontWeight: 700, maxWidth: 170, cursor: speakerSupported ? 'pointer' : 'not-allowed' }}
                title={speakerSupported ? 'Choose call speaker output' : 'Speaker selection not supported in this browser'}>
                <option value="default" style={{ color: '#111827' }}>Default Speaker</option>
                {speakerDevices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId} style={{ color: '#111827' }}>{device.label}</option>
                ))}
              </select>
            </div>
            <div style={{ padding: '5px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.73rem', fontWeight: 600, color: 'rgba(255,255,255,0.65)', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{status}</div>
            <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '9px 20px', background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)', color: 'white', border: '1px solid rgba(220,38,38,0.5)', borderRadius: 9, fontWeight: 700, fontSize: '0.85rem', fontFamily: 'inherit', cursor: 'pointer', boxShadow: '0 4px 14px rgba(220,38,38,0.4)', letterSpacing: '0.01em' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Sign Out
            </button>
          </div>
        )}
      </header>

      {/* ── PAGE BODY ──────────────────────────────────────────────── */}
      <div style={{ padding: isMobile ? '0.75rem' : '1.25rem 1.75rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', background: '#f1f5f9' }}>
        {speakerError && (
          <div style={{
            background: '#fff7ed',
            border: '1px solid #fdba74',
            color: '#9a3412',
            borderRadius: 12,
            padding: '10px 14px',
            fontSize: '0.82rem',
            fontWeight: 600,
          }}>
            Speaker warning: {speakerError}
          </div>
        )}

        {/* Tab Bar */}
        {(() => {
          const canSms = profile?.account?.canSendSms ?? false;
          const canWa = profile?.account?.canSendWhatsapp ?? false;
          return (
            <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid #e5e7eb', paddingBottom: 0, marginBottom: -8, flexWrap: 'wrap' }}>
              <button
                onClick={() => setSmsTab(false)}
                style={{ padding: '8px 18px', background: 'none', border: 'none', borderBottom: !smsTab ? '2px solid #6366f1' : '2px solid transparent', color: !smsTab ? '#6366f1' : '#64748b', fontWeight: !smsTab ? 700 : 500, cursor: 'pointer', fontSize: '0.9rem', marginBottom: -2, fontFamily: 'inherit' }}
              >
                Dialer
              </button>

              {/* SMS Tab */}
              <button
                onClick={() => {
                  if (!canSms) return;
                  setSmsTab(true);
                  setActiveChannel('sms');
                  setSmsActiveThread(null);
                  setSmsMessages([]);
                  fetchSmsConversations('sms');
                }}
                title={canSms ? 'SMS Conversations' : 'SMS not enabled for this account'}
                style={{
                  padding: '8px 16px', background: 'none', border: 'none', marginBottom: -2, fontFamily: 'inherit',
                  borderBottom: smsTab && activeChannel === 'sms' ? '2px solid #6366f1' : '2px solid transparent',
                  color: !canSms ? '#d1d5db' : (smsTab && activeChannel === 'sms') ? '#6366f1' : '#64748b',
                  fontWeight: (smsTab && activeChannel === 'sms') ? 700 : 500,
                  cursor: canSms ? 'pointer' : 'not-allowed',
                  fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 5,
                }}
              >
                💬 SMS {!canSms && <span style={{ fontSize: 10, color: '#d1d5db' }}>🔒</span>}
              </button>

              {/* WhatsApp Tab */}
              <button
                onClick={() => {
                  if (!canWa) return;
                  setSmsTab(true);
                  setActiveChannel('whatsapp');
                  setSmsActiveThread(null);
                  setSmsMessages([]);
                  fetchSmsConversations('whatsapp');
                }}
                title={canWa ? 'WhatsApp Conversations' : 'WhatsApp not enabled for this account'}
                style={{
                  padding: '8px 16px', background: 'none', border: 'none', marginBottom: -2, fontFamily: 'inherit',
                  borderBottom: smsTab && activeChannel === 'whatsapp' ? '2px solid #25d366' : '2px solid transparent',
                  color: !canWa ? '#d1d5db' : (smsTab && activeChannel === 'whatsapp') ? '#25d366' : '#64748b',
                  fontWeight: (smsTab && activeChannel === 'whatsapp') ? 700 : 500,
                  cursor: canWa ? 'pointer' : 'not-allowed',
                  fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 5,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                WhatsApp {!canWa && <span style={{ fontSize: 10, color: '#d1d5db' }}>🔒</span>}
              </button>
            </div>
          );
        })()}

        {/* ── MESSAGES PANEL (SMS or WhatsApp) ── */}
        {smsTab && (
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', height: isMobile ? 'auto' : '65vh', minHeight: isMobile ? '70vh' : 'unset', border: `1px solid ${activeChannel === 'whatsapp' ? '#25d36633' : '#e5e7eb'}`, borderRadius: 12, overflow: 'hidden', background: '#fff', marginTop: 12 }}>
            {/* Left: conversation list */}
            <div style={{ width: isMobile ? '100%' : 270, maxHeight: isMobile ? 240 : 'none', borderRight: isMobile ? 'none' : '1px solid #e5e7eb', borderBottom: isMobile ? '1px solid #e5e7eb' : 'none', display: 'flex', flexDirection: 'column', background: activeChannel === 'whatsapp' ? '#f0fdf4' : '#f9fafb', flexShrink: 0 }}>
              <div style={{ padding: '10px 14px', fontWeight: 700, borderBottom: '1px solid #e5e7eb', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: activeChannel === 'whatsapp' ? '#dcfce7' : undefined }}>
                <span style={{ color: activeChannel === 'whatsapp' ? '#15803d' : '#111827' }}>
                  {activeChannel === 'whatsapp' ? '📱 WhatsApp' : '💬 SMS'}
                </span>
                <button
                  onClick={() => { setSmsNewMode(m => !m); setSmsNewNumber(''); }}
                  style={{ background: smsNewMode ? '#6366f1' : '#eff6ff', color: smsNewMode ? '#fff' : '#4338ca', border: 'none', borderRadius: 6, padding: '3px 9px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                >
                  {smsNewMode ? '✕ Cancel' : '+ New'}
                </button>
              </div>

              {/* New conversation input */}
              {smsNewMode && (
                <div style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb', background: '#fff' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 5 }}>To (phone number):</div>
                  <input
                    autoFocus
                    value={smsNewNumber}
                    onChange={e => setSmsNewNumber(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && smsNewNumber.trim()) {
                        const num = smsNewNumber.trim();
                        setSmsActiveThread(num);
                        fetchSmsThread(num);
                        setSmsNewMode(false);
                        setSmsNewNumber('');
                      }
                    }}
                    placeholder="+14422039259"
                    style={{ width: '100%', padding: '6px 9px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, outline: 'none', fontFamily: 'monospace', boxSizing: 'border-box' }}
                  />
                  <button
                    onClick={() => {
                      if (!smsNewNumber.trim()) return;
                      const num = smsNewNumber.trim();
                      setSmsActiveThread(num);
                      fetchSmsThread(num);
                      setSmsNewMode(false);
                      setSmsNewNumber('');
                    }}
                    style={{ marginTop: 6, width: '100%', padding: '6px 0', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
                  >
                    Open Chat
                  </button>
                </div>
              )}

              <div style={{ flex: 1, overflowY: 'auto' }}>
                {smsConversations.length === 0 && !smsNewMode && (
                  <div style={{ padding: 20, color: '#9ca3af', fontSize: 12, textAlign: 'center' }}>
                    No messages yet.<br />Click <b>+ New</b> to start a conversation.
                  </div>
                )}
                {smsConversations.map(c => (
                  <div
                    key={c.contactNumber}
                    onClick={() => { setSmsActiveThread(c.contactNumber); fetchSmsThread(c.contactNumber); setSmsNewMode(false); }}
                    style={{
                      padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6',
                      background: smsActiveThread === c.contactNumber ? '#eff6ff' : 'transparent',
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 12, color: '#0f172a' }}>{c.contactNumber}</div>
                    {c.agentName && <div style={{ fontSize: 10, color: '#6366f1', marginTop: 1 }}>{c.agentName}</div>}
                    <div style={{ fontSize: 11, color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>
                      {c.direction === 'outbound' ? 'You: ' : '← '}{c.lastMessage}
                    </div>
                    <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>
                      {new Date(c.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: thread view */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              {!smsActiveThread ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', gap: 10 }}>
                  <div style={{ fontSize: 32, opacity: 0.3 }}>💬</div>
                  <div style={{ fontSize: 13 }}>Select a conversation or click <b>+ New</b></div>
                </div>
              ) : (
                <>
                  <div style={{ padding: '10px 14px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, fontFamily: 'monospace' }}>{smsActiveThread}</div>
                    </div>
                    <button onClick={() => fetchSmsThread(smsActiveThread)} style={{ background: '#f1f5f9', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer', color: '#64748b' }}>↻ Refresh</button>
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {smsMessages.map(m => (
                      <div key={m.id} style={{ display: 'flex', justifyContent: m.direction === 'outbound' ? 'flex-end' : 'flex-start' }}>
                        <div style={{
                          maxWidth: '72%', padding: '7px 11px', borderRadius: 12,
                          background: m.direction === 'outbound' ? (activeChannel === 'whatsapp' ? '#25d366' : '#2563eb') : '#f3f4f6',
                          color: m.direction === 'outbound' ? '#fff' : '#111827',
                          fontSize: 13,
                        }}>
                          {m.body}
                          <div style={{ fontSize: 10, opacity: 0.65, marginTop: 3 }}>
                            {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {m.agentName && <span style={{ marginLeft: 5 }}>· {m.agentName}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ padding: 10, borderTop: '1px solid #e5e7eb', display: 'flex', gap: 8 }}>
                    <input
                      value={smsInput}
                      onChange={e => setSmsInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendSmsMessage(); } }}
                      placeholder={`Type ${activeChannel === 'whatsapp' ? 'WhatsApp' : 'SMS'} message...`}
                      style={{ flex: 1, padding: '7px 10px', border: `1px solid ${activeChannel === 'whatsapp' ? '#86efac' : '#d1d5db'}`, borderRadius: 8, fontSize: 13, outline: 'none' }}
                    />
                    <button
                      onClick={sendSmsMessage}
                      disabled={smsSendingMsg || !smsInput.trim()}
                      style={{ padding: '7px 14px', background: activeChannel === 'whatsapp' ? '#25d366' : '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
                    >
                      {smsSendingMsg ? '...' : 'Send'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Stats Row + Dialer panels (hidden when SMS tab is active) */}
        {!smsTab && (<>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
          {/* Calls — period selector card */}
          <div style={{ background: '#fff', borderRadius: 14, padding: '1rem 1.1rem', borderTop: '3px solid #6366f1', boxShadow: '0 1px 4px rgba(15,23,42,0.06)', minWidth: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Calls</span>
              <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#6366f1', background: '#eff6ff', padding: '2px 7px', borderRadius: 99 }}>{statsPeriod === 'today' ? 'Today' : statsPeriod === 'yesterday' ? 'Yest.' : statsPeriod === 'thisWeek' ? 'Week' : statsPeriod === 'lastWeek' ? 'L.Week' : statsPeriod === 'thisMonth' ? 'Month' : 'Year'}</span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#6366f1', fontFamily: 'Outfit,sans-serif', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              {periodStats[statsPeriod] ?? 0}
            </div>
            <div style={{ display: 'flex', gap: 3, marginTop: 7, overflowX: 'auto', paddingBottom: 2 }}>
              {[
                { key: 'today', label: 'Today' },
                { key: 'yesterday', label: 'Yest' },
                { key: 'thisWeek', label: 'Week' },
                { key: 'lastWeek', label: 'L.Wk' },
                { key: 'thisMonth', label: 'Mo' },
                { key: 'thisYear', label: 'Yr' },
              ].map(p => (
                <button key={p.key} onClick={() => setStatsPeriod(p.key)} style={{
                  fontSize: '0.58rem', fontWeight: 700, padding: '2px 6px', borderRadius: 999, border: 'none', cursor: 'pointer', flexShrink: 0,
                  background: statsPeriod === p.key ? '#6366f1' : '#f1f5f9',
                  color: statsPeriod === p.key ? 'white' : '#64748b',
                }}>{p.label}</button>
              ))}
            </div>
          </div>
          {[
            { label: "Today's Appts", value: stats.appointments, accent: '#10b981', sub: 'booked' },
            { label: 'Conv. Rate', value: `${stats.calls > 0 ? ((stats.appointments / stats.calls) * 100).toFixed(1) : '0.0'}%`, accent: '#f59e0b', sub: 'appt / call' },
            { label: 'Leads Queue', value: leads.length, accent: '#06b6d4', sub: 'available' },
          ].map(({ label, value, accent, sub }) => (
            <div key={label} style={{ background: '#fff', borderRadius: 14, padding: '1rem 1.1rem', borderTop: `3px solid ${accent}`, boxShadow: '0 1px 4px rgba(15,23,42,0.06)', minWidth: 0, overflow: 'hidden' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: accent, fontFamily: 'Outfit,sans-serif', letterSpacing: '-0.02em', lineHeight: 1.1, marginTop: 4 }}>
                {value}
              </div>
              <div style={{ fontSize: '0.68rem', color: '#cbd5e1', marginTop: 3 }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Main 2-column grid */}
        <div style={{ display: 'grid', gridTemplateColumns: isCompactDesktop ? '1fr' : 'minmax(0, 1fr) minmax(320px, 340px)', gap: '0.875rem', alignItems: 'start', minWidth: 0 }}>

        {/* ── LEFT COLUMN ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', minWidth: 0 }}>

          {/* Lead Profile + Quick SMS — side by side on desktop, stacked on mobile */}
          <div style={{ display: 'grid', gridTemplateColumns: isCompactDesktop ? '1fr' : 'minmax(0, 1fr) minmax(0, 1fr)', gap: '0.75rem', alignItems: 'start', minWidth: 0 }}>

            {/* Compact Lead Profile Card */}
            <section className="card" style={{ minHeight: 240, borderTop: '3px solid #6366f1', minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h2 className="font-head" style={{ fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span>👤</span> Lead Profile
                </h2>
                {currentLead && <span className="pill-status pill-success" style={{ fontSize: '0.6rem' }}>{currentLead.status}</span>}
              </div>

              {callState === 'failed' && lastError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '0.5rem 0.75rem', marginBottom: '0.75rem', color: '#dc2626', fontWeight: 600, fontSize: '0.82rem' }}>
                  {errorLabel(lastError)}
                </div>
              )}

              {currentLead ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <div>
                    <span className="stat-label" style={{ fontSize: '0.65rem' }}>Contact Name</span>
                    <p style={{ fontWeight: 700, fontSize: '0.95rem', marginTop: '0.2rem', color: '#0f172a' }}>{currentLead.firstName} {currentLead.lastName}</p>
                  </div>
                  <div>
                    <span className="stat-label" style={{ fontSize: '0.65rem' }}>Phone</span>
                    <p style={{ fontWeight: 700, fontSize: '0.95rem', fontFamily: 'monospace', marginTop: '0.2rem', color: '#0f172a' }}>{currentLead.phone}</p>
                  </div>
                  <div>
                    <span className="stat-label" style={{ fontSize: '0.65rem' }}>Source List</span>
                    <p style={{ fontWeight: 600, fontSize: '0.85rem', color: '#6366f1', marginTop: '0.2rem' }}>{currentLead.list?.name || 'Manual'}</p>
                  </div>
                  {currentLead.address && (
                    <div>
                      <span className="stat-label" style={{ fontSize: '0.65rem' }}>Address</span>
                      <p style={{ color: '#94a3b8', marginTop: '0.2rem', fontSize: '0.82rem' }}>{currentLead.address}</p>
                    </div>
                  )}
                  {currentLead.metadata && Object.keys(currentLead.metadata).length > 0 && (
                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.5rem' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        {Object.entries(currentLead.metadata).map(([k, v]) => (
                          <span key={k} style={{ background: '#eff6ff', borderRadius: 5, padding: '1px 6px', fontSize: '0.72rem', color: '#3730a3' }}>
                            <b>{k}:</b> {v}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '1.5rem 0', color: '#94a3b8' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.3 }}>👤</div>
                  <p style={{ fontWeight: 600, color: '#64748b', fontSize: '0.88rem' }}>No lead selected</p>
                  <p style={{ fontSize: '0.78rem', marginTop: '0.2rem' }}>Select from queue or start auto-dial</p>
                </div>
              )}

              <div style={{ marginTop: '0.75rem', padding: '0.625rem 0.75rem', background: '#f8fafc', borderRadius: 8, border: '1px dashed #e2e8f0' }}>
                <span className="stat-label" style={{ fontSize: '0.65rem' }}>Live Script</span>
                <p style={{ marginTop: '0.3rem', color: '#64748b', fontStyle: 'italic', fontSize: '0.82rem', lineHeight: 1.5 }}>
                  {currentLead
                    ? `"Hi ${currentLead.firstName}, calling from Voxiq. Hope you're having a great day..."`
                    : 'Script will appear here when a call is active.'}
                </p>
              </div>
            </section>

            {/* Quick SMS Panel */}
            <section className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: 240, padding: '0.875rem', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <h2 className="font-head" style={{ fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span>💬</span> Quick SMS
                </h2>
                {(currentLead?.phone || dialNumber) && (
                  <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#6366f1', fontWeight: 700 }}>
                    {currentLead?.phone || dialNumber}
                  </span>
                )}
              </div>

              {/* Number input when no lead */}
              {!currentLead?.phone && !dialNumber && (
                <div style={{ marginBottom: '0.5rem' }}>
                  <input
                    value={dialerSmsPhone}
                    onChange={e => {
                      const nextPhone = e.target.value;
                      setDialerSmsPhone(nextPhone);
                      scheduleDialerSmsThreadFetch(nextPhone);
                    }}
                    placeholder="Enter number e.g. +14422039259"
                    style={{ width: '100%', padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: '0.82rem', outline: 'none', fontFamily: 'monospace', boxSizing: 'border-box' }}
                  />
                </div>
              )}

              {/* Message thread */}
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 5, marginBottom: '0.5rem', maxHeight: 130, minHeight: 60 }}>
                {dialerSmsMessages.length === 0 ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '0.78rem', fontStyle: 'italic' }}>
                    {(currentLead?.phone || dialNumber || dialerSmsPhone) ? 'No messages yet — send first SMS below' : 'Enter a number to start'}
                  </div>
                ) : (
                  dialerSmsMessages.slice(-8).map(m => (
                    <div key={m.id} style={{ display: 'flex', justifyContent: m.direction === 'outbound' ? 'flex-end' : 'flex-start' }}>
                      <div style={{
                        maxWidth: '80%', padding: '5px 9px', borderRadius: 10,
                        background: m.direction === 'outbound' ? '#2563eb' : '#f3f4f6',
                        color: m.direction === 'outbound' ? '#fff' : '#111827',
                        fontSize: '0.78rem',
                      }}>
                        {m.body}
                        <div style={{ fontSize: '0.6rem', opacity: 0.6, marginTop: 2 }}>
                          {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Send bar */}
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  value={dialerSmsInput}
                  onChange={e => setDialerSmsInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendDialerSms(); } }}
                  placeholder="Type message..."
                  disabled={!currentLead?.phone && !dialNumber && !dialerSmsPhone}
                  style={{ flex: 1, padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: '0.82rem', outline: 'none' }}
                />
                <button
                  onClick={sendDialerSms}
                  disabled={dialerSmsSending || !dialerSmsInput.trim() || (!currentLead?.phone && !dialNumber && !dialerSmsPhone)}
                  style={{ padding: '6px 13px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 7, fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  {dialerSmsSending ? '...' : 'Send'}
                </button>
              </div>
              <div style={{ marginTop: 6, textAlign: 'right' }}>
                <button
                  onClick={() => { setSmsTab(true); if (currentLead?.phone || dialNumber) { const p = currentLead?.phone || dialNumber; setSmsActiveThread(p); fetchSmsThread(p); } fetchSmsConversations(); }}
                  style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                >
                  Open full conversation →
                </button>
              </div>
            </section>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isCompactDesktop ? '1fr' : 'minmax(0, 1.15fr) minmax(280px, 0.95fr)', gap: '0.875rem', alignItems: 'stretch', minWidth: 0 }}>
          {/* Disposition Card */}
          <section className="card" style={{ height: '100%', borderTop: '3px solid #f59e0b', minWidth: 0 }}>
            <h2 className="font-head mb-4" style={{ fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>📋</span> Disposition
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: isNarrowPhone ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: '0.4rem', marginBottom: '1rem' }}>
              <button className="btn btn-primary" onClick={() => submitDisposition('Interested')} style={{ fontSize: '0.75rem', padding: '0.45rem 0.5rem', justifyContent: 'center' }}>✅ Interested</button>
              <button className="btn" onClick={() => submitDisposition('Callback')} style={{ background: '#eff6ff', color: '#3730a3', border: '1px solid #c7d2fe', fontSize: '0.75rem', padding: '0.45rem 0.5rem' }}>📅 Callback</button>
              <button className="btn" onClick={() => submitDisposition('Voicemail')} style={{ background: '#f5f3ff', color: '#6d28d9', border: '1px solid #ddd6fe', fontSize: '0.75rem', padding: '0.45rem 0.5rem' }}>📭 Voicemail</button>
              <button className="btn" onClick={() => submitDisposition('No Answer')} style={{ background: '#fffbeb', color: '#92400e', border: '1px solid #fcd34d', fontSize: '0.75rem', padding: '0.45rem 0.5rem' }}>🔕 No Ans</button>
              <button className="btn" onClick={() => submitDisposition('Unreachable')} style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fca5a5', fontSize: '0.75rem', padding: '0.45rem 0.5rem' }}>🚫 Unreach.</button>
              <button className="btn" onClick={() => submitDisposition('DNC')} style={{ background: '#0f172a', color: 'white', border: 'none', fontSize: '0.75rem', padding: '0.45rem 0.5rem' }}>⛔ DNC</button>
            </div>
            <textarea
              className="input-field mb-3"
              placeholder="Interaction notes..."
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <div style={{ display: 'grid', gridTemplateColumns: isNarrowPhone ? '1fr' : '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '0.3rem' }}>Schedule Callback</label>
                <input type="datetime-local" className="input-field" value={callbackTime} onChange={e => setCallbackTime(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '0.3rem' }}>Deal Value ($)</label>
                <input type="number" className="input-field" placeholder="e.g. 500.00" value={dealValue} onChange={e => setDealValue(e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn" style={{ background: '#eff6ff', color: '#3730a3', fontSize: '0.8rem' }} onClick={() => setShowSmsPanel(!showSmsPanel)} disabled={!currentLead}>💬 SMS Follow-up</button>
              {callActive && vmTemplates.length > 0 && (
                <button className="btn" style={{ background: '#fffbeb', color: '#d97706', fontSize: '0.8rem' }} onClick={() => setShowVmDrop(!showVmDrop)}>📬 Drop Voicemail</button>
              )}
            </div>
            {showSmsPanel && (
              <div style={{ marginTop: '0.75rem', background: '#f8fafc', borderRadius: 10, padding: '0.875rem', border: '1px solid #e2e8f0' }}>
                <p style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem' }}>SMS to: {currentLead?.phone}</p>
                {smsTemplates.length > 0 && (
                  <select className="input-field mb-2" onChange={e => setSmsMsg(e.target.value)} defaultValue="">
                    <option value="">Pick template...</option>
                    {smsTemplates.map(t => <option key={t.id} value={t.message}>{t.name}</option>)}
                  </select>
                )}
                <textarea className="input-field mb-2" rows={2} placeholder="Or type custom message..." value={smsMsg} onChange={e => setSmsMsg(e.target.value)} />
                <button className="btn btn-primary" style={{ fontSize: '0.8rem' }} onClick={handleSendSms} disabled={smsSending || !smsMsg}>
                  {smsSending ? 'Sending...' : '📤 Send SMS'}
                </button>
              </div>
            )}
            {showVmDrop && (
              <div style={{ marginTop: '0.75rem', background: '#fffbeb', borderRadius: 10, padding: '0.875rem' }}>
                <p style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem' }}>Select voicemail:</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {vmTemplates.map(vm => (
                    <div key={vm.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.82rem' }}>📬 {vm.name}</span>
                      <button className="btn" style={{ fontSize: '0.72rem', background: '#d97706', color: 'white' }} onClick={() => handleVmDrop(vm.id, vm.url)}>Drop</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', height: '100%', minWidth: 0 }}>
          <section className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: isMobile ? 'auto' : 494, maxHeight: isMobile ? 'none' : 494, minWidth: 0 }}>
            {/* Header row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'flex-start', flexDirection: isMobile ? 'column' : 'row', marginBottom: '1rem', gap: 12, flexWrap: 'wrap', minWidth: 0 }}>
              <h2 className="font-head" style={{ fontSize: '1rem', margin: 0 }}>Call &amp; SMS History</h2>
              <button className="btn" style={{ fontSize: '0.75rem', background: '#f8fafc', width: isMobile ? '100%' : 'auto' }} onClick={fetchHistory} disabled={historyLoading}>
                {historyLoading ? 'Loading...' : 'Refresh'}
              </button>
            </div>

            {/* Filter capsule tabs */}
            <div style={{ display: 'flex', gap: 6, overflowX: isMobile ? 'visible' : 'auto', flexWrap: isMobile ? 'wrap' : 'nowrap', marginBottom: '1rem', paddingBottom: 2, flexShrink: 0, minWidth: 0 }}>
              {[
                { key: 'all',      label: `All (${historyFeed.length})`,                                        bg: '#f1f5f9', activeBg: '#1d4ed8', color: '#475569', activeColor: '#fff' },
                { key: 'dialed',   label: `Dialed (${historyStats.dialedCalls})`,                               bg: '#dbeafe', activeBg: '#1d4ed8', color: '#1d4ed8', activeColor: '#fff' },
                { key: 'missed',   label: `Missed (${historyStats.missedCalls})`,                               bg: '#fee2e2', activeBg: '#b91c1c', color: '#b91c1c', activeColor: '#fff' },
                { key: 'received', label: `Received (${historyStats.receivedCalls})`,                           bg: '#dcfce7', activeBg: '#15803d', color: '#15803d', activeColor: '#fff' },
                { key: 'sms',      label: `SMS (${historyStats.totalMessages})`,                                bg: '#ede9fe', activeBg: '#6d28d9', color: '#6d28d9', activeColor: '#fff' },
              ].map(({ key, label, bg, activeBg, color, activeColor }) => {
                const isActive = historyFilter === key;
                return (
                  <button key={key} onClick={() => setHistoryFilter(key)} style={{
                    padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
                    fontSize: '0.75rem', fontWeight: 700, flexShrink: 0, whiteSpace: 'nowrap',
                    background: isActive ? activeBg : bg,
                    color: isActive ? activeColor : color,
                    transition: 'all 0.15s',
                  }}>{label}</button>
                );
              })}
            </div>

            {(() => {
              const filtered = historyFeed.filter((item) => {
                if (historyFilter === 'all') return true;
                if (historyFilter === 'sms') return item.type === 'sms';
                return item.type === 'call' && item.category === historyFilter;
              });
              const renderRow = (item) => {
                const contactName = (item.lead ? `${item.lead.firstName || ''} ${item.lead.lastName || ''}`.trim() : '') || item.agent?.name || '';
                const displayNumber = item.type === 'call'
                  ? (item.direction === 'inbound' ? (item.fromNumber || item.lead?.phone || '—') : (item.toNumber || item.lead?.phone || item.fromNumber || '—'))
                  : (item.toNumber || item.fromNumber || '—');
                const rawDur = item.durationSeconds;
                const durSec = rawDur != null && rawDur > 86400 ? Math.round(rawDur / 1000) : rawDur;
                const durDisplay = durSec != null
                  ? durSec >= 60 ? `${Math.floor(durSec / 60)}m ${durSec % 60}s` : `${Math.round(durSec)}s`
                  : item.type === 'call' ? '—' : '';
                const callbackBtn = item.type === 'call' && displayNumber !== '—' ? (
                  <button
                    disabled={callActive}
                    onClick={() => {
                      const { countryCode, localNumber } = splitPhoneForDialer(displayNumber, dialCountryCode);
                      setDialCountryCode(countryCode);
                      setDialNumber(localNumber);
                      setDialName(contactName || displayNumber);
                      setShowDialpad(true);
                    }}
                    style={{
                      background: callActive ? '#f1f5f9' : 'linear-gradient(135deg,#10b981,#059669)',
                      color: callActive ? '#94a3b8' : '#fff',
                      border: 'none',
                      borderRadius: 8,
                      padding: isMobile ? '8px 10px' : '6px 10px',
                      fontSize: '0.7rem',
                      cursor: callActive ? 'not-allowed' : 'pointer',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      width: isMobile ? '100%' : 'auto',
                    }}
                  >
                    Recall
                  </button>
                ) : null;
                if (isHistoryCompact) {
                  const detailText = [
                    durDisplay || '',
                    item.type === 'call' ? (item.disposition || '') : (item.body || ''),
                  ].filter(Boolean).join(' • ');
                  return (
                    <div
                      key={`${item.type}-${item.id}`}
                      style={{
                        padding: isMobile ? '12px' : '11px 12px',
                        background: '#f8fafc',
                        borderRadius: 12,
                        border: '1px solid #e8ecf4',
                        minWidth: 0,
                        overflow: 'visible',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8, flexWrap: 'wrap', minWidth: 0 }}>
                        <AgentHistoryBadge item={item} />
                        <span style={{ fontSize: '0.68rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                          {formatHistoryDateTime(item.startedAt || item.createdAt)}
                        </span>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: isMobile ? '0.82rem' : '0.8rem', color: '#1e40af', fontFamily: 'monospace', marginBottom: 6, overflowWrap: 'anywhere' }}>
                        {displayNumber}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#334155', fontWeight: 600, marginBottom: detailText ? 4 : 8, overflowWrap: 'anywhere' }}>
                        {contactName || 'Unknown'}
                      </div>
                      {detailText && (
                        <div style={{ fontSize: '0.72rem', color: '#64748b', lineHeight: 1.45, marginBottom: callbackBtn ? 10 : 0, whiteSpace: 'normal', overflowWrap: 'anywhere' }}>
                          {detailText}
                        </div>
                      )}
                      {callbackBtn && (
                        <div style={{ marginTop: detailText ? 0 : 4 }}>
                          {callbackBtn}
                        </div>
                      )}
                    </div>
                  );
                }
                return (
                  <tr key={`${item.type}-${item.id}`}>
                    <td><AgentHistoryBadge item={item} /></td>
                    <td style={{ fontWeight: 600, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{contactName || <span style={{ color: '#94a3b8', fontWeight: 400 }}>Unknown</span>}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: '#1e40af', fontWeight: 600 }}>{displayNumber}</td>
                    <td style={{ color: '#94a3b8', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{new Date(item.startedAt || item.createdAt).toLocaleString()}</td>
                    <td style={{ fontSize: '0.78rem', color: '#475569' }}>{durDisplay}</td>
                    <td style={{ fontSize: '0.75rem', color: '#64748b', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.type === 'call' ? (item.disposition || '—') : (item.body || '')}</td>
                    <td>{callbackBtn}</td>
                  </tr>
                );
              };
              if (isHistoryCompact) return (
                <div style={{ flex: 1, minHeight: 0, maxHeight: 360, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0, paddingRight: 2 }}>
                  {filtered.length === 0
                    ? <div style={{ textAlign: 'center', padding: '1.5rem 0', color: '#94a3b8', fontSize: '0.82rem' }}>{historyFeed.length === 0 ? 'No history yet.' : `No ${historyFilter} entries.`}</div>
                    : filtered.map(renderRow)}
                </div>
              );
              return (
                <div className="table-container" style={{ flex: 1, minHeight: 0, maxHeight: 320, overflowY: 'auto', overflowX: 'auto' }}>
                  <table><thead><tr><th>Type</th><th>Lead / Contact</th><th>Number Dialed</th><th>Time</th><th>Duration</th><th>Disposition</th><th></th></tr></thead>
                    <tbody>
                      {filtered.length === 0
                        ? <tr><td colSpan="7" style={{ textAlign: 'center', padding: '1.5rem 0', color: '#94a3b8', fontSize: '0.85rem' }}>{historyFeed.length === 0 ? 'No history yet — calls will appear here after they complete.' : `No ${historyFilter} entries found.`}</td></tr>
                        : filtered.map(renderRow)}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </section>
          </div>
          </div>
        </div> {/* end LEFT COLUMN */}

        {/* ── RIGHT COLUMN ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', minWidth: 0 }}>

          {/* Call Control / Softphone */}
          <section className="card" style={{ background: 'linear-gradient(160deg, #0f172a 0%, #1b2050 100%)', border: 'none', padding: '1.5rem', minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontFamily: 'Outfit,sans-serif', fontWeight: 800, color: 'white', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.46 2 2 0 0 1 3.57 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.54a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
                Call Control
              </h2>
              <div style={{ padding: '3px 10px', borderRadius: 6, background: callState === 'connected' ? 'rgba(52,211,153,0.18)' : callState === 'connecting' || callState === 'ringing' ? 'rgba(251,191,36,0.18)' : 'rgba(255,255,255,0.08)', border: `1px solid ${callState === 'connected' ? 'rgba(52,211,153,0.35)' : callState === 'connecting' || callState === 'ringing' ? 'rgba(251,191,36,0.35)' : 'rgba(255,255,255,0.12)'}`, fontSize: '0.7rem', fontWeight: 800, color: callState === 'connected' ? '#34d399' : callState === 'connecting' || callState === 'ringing' ? '#fbbf24' : 'rgba(255,255,255,0.45)', letterSpacing: '0.04em' }}>
                {callState === 'connected' ? `LIVE • ${String(Math.floor(callTimer / 60)).padStart(2, '0')}:${String(callTimer % 60).padStart(2, '0')}` : callState === 'connecting' ? 'DIALING...' : callState === 'ringing' ? 'RINGING...' : registered ? '✓ READY' : 'STANDBY'}
              </div>
            </div>

            <div style={{ background: callActive ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${callActive ? 'rgba(52,211,153,0.25)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 12, padding: '1.25rem', marginBottom: '1rem', textAlign: 'center', transition: 'all 0.3s ease' }}>
              <div style={{ fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: '0.5rem' }}>CURRENT STATUS</div>
              <div style={{ fontFamily: 'Outfit,sans-serif', fontWeight: 900, fontSize: '1.5rem', color: callState === 'connected' ? '#34d399' : callState === 'failed' ? '#f87171' : 'rgba(255,255,255,0.88)', letterSpacing: '-0.02em' }}>
                {lineStatusText()}
              </div>
              {sipCause && callState === 'disconnected' && callOutcome === 'invalid' && (
                <div style={{ marginTop: '0.5rem', background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 8, padding: '5px 10px', fontSize: '0.7rem', color: '#f87171', fontWeight: 600 }}>
                  {sipCause === 'USER_BUSY' || sipCause === '486' ? '📵 Line busy' : sipCause === 'CALL_REJECTED' || sipCause === '403' ? '❌ Call rejected' : sipCause === 'UNALLOCATED_NUMBER' || sipCause === '404' ? '⚠️ Number not found' : `SIP: ${sipCause}`}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {!callActive && !currentLead && status !== 'Waiting for Lead...' && (
                <button style={{ padding: '0.875rem', fontSize: '1rem', fontWeight: 800, borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: 'white', border: 'none', boxShadow: '0 4px 16px rgba(99,102,241,0.45)', cursor: 'pointer', fontFamily: 'inherit', width: '100%', letterSpacing: '0.02em' }} onClick={handleStartDialing}>
                  ▶ START CAMPAIGN DIALING
                </button>
              )}
              {!callActive && status === 'Waiting for Lead...' && (
                <button style={{ padding: '0.875rem', fontSize: '1rem', fontWeight: 800, borderRadius: 10, background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white', border: 'none', cursor: 'pointer', fontFamily: 'inherit', width: '100%' }} onClick={handlePause}>
                  ⏸ PAUSE DIALING
                </button>
              )}
              {callActive && (
                <button style={{ padding: '0.875rem', fontSize: '1rem', fontWeight: 800, borderRadius: 10, background: 'linear-gradient(135deg, #dc2626, #b91c1c)', color: 'white', border: 'none', boxShadow: '0 6px 20px rgba(220,38,38,0.5)', animation: callState === 'connected' ? 'pulse-red 2s infinite' : 'none', cursor: 'pointer', fontFamily: 'inherit', width: '100%' }} onClick={handleHangup}>
                  📵 END CALL
                </button>
              )}
            </div>

            {callState === 'connected' && (
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginBottom: '0.75rem' }}>DIAL PAD</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', maxWidth: '240px', margin: '0 auto' }}>
                  {['1','2','3','4','5','6','7','8','9','*','0','#'].map(key => (
                    <button key={key} onClick={() => sendDTMF(key)} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, fontSize: '1.2rem', fontWeight: 700, padding: '11px 0', color: 'white', cursor: 'pointer', fontFamily: 'inherit' }}>
                      {key}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* ── MANUAL DIAL CARD (dedicated) ── */}
          <section className="card" style={{ border: '1.5px solid #e0e7ff', minWidth: 0 }}>
            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: 34, height: 34, background: 'linear-gradient(135deg, #10b981, #059669)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.46 2 2 0 0 1 3.57 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.54a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                </div>
                <div>
                  <h2 className="font-head" style={{ fontSize: '1rem', lineHeight: 1.1 }}>Manual Dial</h2>
                  <p style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '1px' }}>Enter any number to call directly</p>
                </div>
              </div>
              {/* Keypad toggle */}
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setShowDialpad(p => !p)}
                style={{ padding: '6px 12px', borderRadius: 8, border: `1.5px solid ${showDialpad ? '#6366f1' : '#e0e7ff'}`, background: showDialpad ? '#eff6ff' : 'white', color: showDialpad ? '#6366f1' : '#64748b', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '5px', transition: 'all 0.15s' }}
                title="Toggle dialpad"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="4" height="4" rx="1"/><rect x="10" y="2" width="4" height="4" rx="1"/><rect x="18" y="2" width="4" height="4" rx="1"/>
                  <rect x="2" y="10" width="4" height="4" rx="1"/><rect x="10" y="10" width="4" height="4" rx="1"/><rect x="18" y="10" width="4" height="4" rx="1"/>
                  <rect x="2" y="18" width="4" height="4" rx="1"/><rect x="10" y="18" width="4" height="4" rx="1"/><rect x="18" y="18" width="4" height="4" rx="1"/>
                </svg>
                Keypad
              </button>
            </div>

            {/* Name field */}
            <input
              type="text"
              className="input-field"
              placeholder="Contact name (optional)"
              value={dialName}
              onChange={(e) => setDialName(e.target.value)}
              style={{ marginBottom: '0.5rem', fontSize: '0.9rem', height: '40px', borderRadius: 9, border: '1.5px solid #e2e8f0' }}
            />

            {/* Number display + call button */}
            <div style={{ display: 'flex', flexDirection: 'row', gap: '0.4rem', marginBottom: '0.5rem' }}>
              {/* Country code — manually typeable with datalist suggestions */}
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  list="country-codes-list"
                  value={dialCountryCode}
                  onChange={(e) => setDialCountryCode(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  style={{ width: '64px', flexShrink: 0, height: '48px', borderRadius: 10, border: '2px solid #e0e7ff', textAlign: 'center', fontWeight: 700, fontSize: '0.88rem', fontFamily: 'monospace', background: '#f8fafc', color: '#0f172a', outline: 'none', boxSizing: 'border-box' }}
                  placeholder="+92"
                />
                <datalist id="country-codes-list">
                  {countries.map(c => (
                    <option key={`${c.name}-${c.code}`} value={c.code}>{c.name} ({c.code})</option>
                  ))}
                </datalist>
              </div>
              <input
                type="text"
                className="input-field"
                placeholder="300 0000000"
                value={dialNumber}
                onChange={(e) => setDialNumber(e.target.value.replace(/[^\d\s\-]/g, ''))}
                onKeyDown={(e) => e.key === 'Enter' && handleManualInputDial()}
                style={{ flex: 1, minWidth: 0, fontSize: isMobile ? '0.95rem' : '1.1rem', height: '48px', borderRadius: 10, border: '2px solid #e0e7ff', textAlign: 'center', fontWeight: 700, letterSpacing: '0.04em', fontFamily: 'monospace' }}
              />
              <button
                style={{ height: '48px', padding: '0 1rem', fontSize: '1.2rem', borderRadius: 10, flexShrink: 0, border: 'none', cursor: callActive ? 'not-allowed' : 'pointer', fontFamily: 'inherit', background: dialNumber && !callActive ? 'linear-gradient(135deg,#10b981,#059669)' : '#f1f5f9', color: dialNumber && !callActive ? 'white' : '#94a3b8', boxShadow: dialNumber && !callActive ? '0 4px 14px rgba(16,185,129,0.4)' : 'none', transition: 'all 0.2s' }}
                onClick={() => handleManualInputDial()}
                disabled={!dialNumber || callActive}
                title="Call (Enter)"
              >📞</button>
            </div>

            {/* Inline Dialpad */}
            {showDialpad && (
              <div style={{ marginTop: '0.75rem', padding: '0.875rem', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', userSelect: 'none' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {[
                    { key: '1', sub: '' }, { key: '2', sub: 'ABC' }, { key: '3', sub: 'DEF' },
                    { key: '4', sub: 'GHI' }, { key: '5', sub: 'JKL' }, { key: '6', sub: 'MNO' },
                    { key: '7', sub: 'PQRS' }, { key: '8', sub: 'TUV' }, { key: '9', sub: 'WXYZ' },
                    { key: '*', sub: '' }, { key: '0', sub: '+' }, { key: '#', sub: '' },
                  ].map(({ key, sub }) => (
                    <button
                      key={key}
                      onClick={() => setDialNumber(prev => prev + key)}
                      style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '10px 0', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1px', touchAction: 'manipulation' }}
                      className="dialpad-key"
                    >
                      <span style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0f172a', lineHeight: 1 }}>{key}</span>
                      {sub && <span style={{ fontSize: '0.55rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em' }}>{sub}</span>}
                    </button>
                  ))}
                </div>
                {/* Backspace + Clear row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
                  <button
                    onClick={() => setDialNumber(prev => prev.slice(0, -1))}
                    style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '10px 0', cursor: 'pointer', fontFamily: 'inherit', fontSize: '1.1rem', color: '#64748b', fontWeight: 700, touchAction: 'manipulation' }}
                    className="dialpad-key dialpad-backspace"
                    title="Backspace"
                  >⌫</button>
                  <button
                    onClick={() => handleManualInputDial()}
                    disabled={!dialNumber || callActive}
                    style={{ background: dialNumber && !callActive ? 'linear-gradient(135deg,#10b981,#059669)' : '#f1f5f9', border: 'none', borderRadius: 10, padding: '10px 0', cursor: dialNumber && !callActive ? 'pointer' : 'not-allowed', fontFamily: 'inherit', fontSize: '1.1rem', color: dialNumber && !callActive ? 'white' : '#94a3b8', fontWeight: 800, boxShadow: dialNumber && !callActive ? '0 4px 12px rgba(16,185,129,0.35)' : 'none', transition: 'all 0.2s', touchAction: 'manipulation' }}
                  >📞</button>
                </div>
              </div>
            )}

            {/* Redial */}
            {lastDialedNumber && (
              <button
                style={{ marginTop: '0.75rem', width: '100%', padding: '0.6rem', borderRadius: 9, border: '1.5px dashed #d1fae5', background: '#f0fdf4', color: '#059669', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                onClick={() => handleManualInputDial(lastDialedNumber)}
                disabled={callActive}
                title={`Redial ${lastDialedNumber}`}
              >
                🔄 Redial <span style={{ fontFamily: 'monospace', fontWeight: 600, letterSpacing: '0.03em' }}>{lastDialedNumber}</span>
              </button>
            )}
          </section>

        </div> {/* end RIGHT COLUMN */}
        </div> {/* end main 2-col grid */}

        <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : 'minmax(0, 1.2fr) minmax(0, 1fr)', gap: '0.875rem', alignItems: 'start', minWidth: 0 }}>

        {/* ── LEAD QUEUE ── */}
        <section className="card" style={{ height: '100%', borderTop: '3px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '0.75rem' : 0, marginBottom: '1rem' }}>
            <div>
              <h2 className="font-head" style={{ fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>⚡</span> Lead Queue
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '0.82rem', marginTop: '2px' }}>
                {autoDial
                  ? <><span style={{ color: '#f59e0b', fontWeight: 700 }}>⚡ Auto Dialing</span> — {autoDialIndex + 1} of {autoDialLeadsRef.current.length} leads{autoDialCountdown !== null ? <span style={{ marginLeft: 8, color: '#ef4444', fontWeight: 700 }}>Next in {autoDialCountdown}s...</span> : null}</>
                  : <>{leads.length} leads available • Click a lead to dial</>}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
              <button
                className="btn"
                style={{ fontSize: '0.82rem', fontWeight: 700, padding: '0.5rem 1.25rem', background: autoDial ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'linear-gradient(135deg,#10b981,#059669)', color: 'white', border: 'none', borderRadius: 8, boxShadow: autoDial ? '0 4px 12px rgba(239,68,68,0.35)' : '0 4px 12px rgba(16,185,129,0.35)' }}
                onClick={toggleAutoDial}
                title={autoDial ? 'Pause auto-dialing' : 'Start power dialer'}
              >
                {autoDial ? '⏸ Pause' : autoDialLeadsRef.current.length > 0 && leadSearch.toLowerCase() === lastSearchRef.current ? '▶️ Resume' : '⚡ Auto Dial'}
              </button>
              {autoDial && (
                <button className="btn" style={{ fontSize: '0.75rem', background: '#f1f5f9' }} onClick={handleAutoSkip} title="Skip to next lead">Skip →</button>
              )}
              <input
                className="input-field"
                style={{ width: isMobile ? '100%' : '180px', padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
                placeholder="Search name or phone..."
                value={leadSearch}
                onChange={e => setLeadSearch(e.target.value)}
                disabled={autoDial}
              />
              <button className="btn" style={{ fontSize: '0.75rem', background: '#f1f5f9' }} onClick={() => fetchLeads(agentId)} disabled={autoDial}>
                {leadsLoading ? 'Loading...' : '↻ Refresh'}
              </button>
            </div>
          </div>
        {(() => {
          const sharedLeadRow = (lead) => {
            const isCurrentAutoDial = autoDial && autoDialLeadsRef.current[autoDialIndexRef.current]?.id === lead.id;
            const outcome = leadStatuses[lead.id];
            const isVoicemail = outcome === 'voicemail' || lead._outcome === 'voicemail';
            const isCallback = outcome === 'callback' || lead._outcome === 'callback' || lead.status === 'CALLBACK';
            const isUnreachable = outcome === 'invalid' || lead._outcome === 'invalid' || lead.status === 'UNREACHABLE';
            const isNoAnswer = !isVoicemail && !isCallback && !isUnreachable && (outcome === 'no_answer' || lead._outcome === 'no_answer' || lead.status === 'NO_ANSWER');
            const isAnswered = outcome === 'answered' || lead._outcome === 'answered' || lead.status === 'CONTACTED' || lead.status === 'BOOKED';
            const isInvalid = false;
            return { isCurrentAutoDial, isVoicemail, isCallback, isUnreachable, isNoAnswer, isAnswered, isInvalid };
          };
          const statusBadgeEl = (lead) => {
            const { isCurrentAutoDial, isVoicemail, isCallback, isUnreachable, isNoAnswer, isAnswered, isInvalid } = sharedLeadRow(lead);
            return isCurrentAutoDial ? <span style={{ background: '#10b981', color: 'white', borderRadius: 6, padding: '2px 7px', fontSize: '0.65rem', fontWeight: 800 }}>📞 Dialing</span>
              : isInvalid ? <span style={{ background: '#fef2f2', color: '#b91c1c', borderRadius: 6, padding: '2px 7px', fontSize: '0.65rem', fontWeight: 700, border: '1px solid #fca5a5' }}>❌ Invalid</span>
              : isVoicemail ? <span style={{ background: '#f5f3ff', color: '#7c3aed', borderRadius: 6, padding: '2px 7px', fontSize: '0.65rem', fontWeight: 700, border: '1px solid #c4b5fd' }}>📭 Voicemail</span>
              : isCallback ? <span style={{ background: '#eff6ff', color: '#1d4ed8', borderRadius: 6, padding: '2px 7px', fontSize: '0.65rem', fontWeight: 700, border: '1px solid #93c5fd' }}>📅 Callback</span>
              : isUnreachable ? <span style={{ background: '#fef2f2', color: '#b91c1c', borderRadius: 6, padding: '2px 7px', fontSize: '0.65rem', fontWeight: 700, border: '1px solid #fca5a5' }}>🚫 Unreach.</span>
              : isNoAnswer ? <span style={{ background: '#fffbeb', color: '#b45309', borderRadius: 6, padding: '2px 7px', fontSize: '0.65rem', fontWeight: 700, border: '1px solid #fcd34d' }}>🔕 No Ans</span>
              : isAnswered ? <span style={{ background: '#f0fdf4', color: '#15803d', borderRadius: 6, padding: '2px 7px', fontSize: '0.65rem', fontWeight: 700, border: '1px solid #86efac' }}>✅ Answered</span>
              : <span style={{ background: 'var(--indigo-50)', color: 'var(--indigo-600)', borderRadius: 6, padding: '2px 7px', fontSize: '0.65rem', fontWeight: 600 }}>🆕 New</span>;
          };

          if (isTablet) {
            if (filteredLeads.length === 0) return (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: '#94a3b8', fontSize: '0.82rem' }}>
                {leadsLoading ? 'Loading leads...' : leads.length === 0 ? 'No leads found. Upload a CSV from Admin panel.' : 'No leads match your search.'}
              </div>
            );
            let seenDiv = { noAnswer: false, voicemail: false, callback: false, unreachable: false };
            const mobileItems = [];
            filteredLeads.forEach((lead) => {
              const { isCurrentAutoDial, isVoicemail, isCallback, isUnreachable, isNoAnswer, isInvalid } = sharedLeadRow(lead);
              const divStyle = (bg, border, color, text) => (
                <div key={`div-${text}`} style={{ padding: '5px 10px', background: bg, borderTop: `2px solid ${border}`, borderBottom: `2px solid ${border}`, fontSize: '0.68rem', fontWeight: 700, color, letterSpacing: '0.05em', marginTop: 4 }}>{text}</div>
              );
              if (isNoAnswer && !seenDiv.noAnswer) { seenDiv.noAnswer = true; mobileItems.push(divStyle('rgba(251,191,36,0.08)', 'rgba(251,191,36,0.3)', '#b45309', '🔕 NO ANSWER')); }
              if (isVoicemail && !seenDiv.voicemail) { seenDiv.voicemail = true; mobileItems.push(divStyle('rgba(124,58,237,0.08)', 'rgba(124,58,237,0.3)', '#6d28d9', '📭 VOICEMAIL')); }
              if (isCallback && !seenDiv.callback) { seenDiv.callback = true; mobileItems.push(divStyle('rgba(59,130,246,0.08)', 'rgba(59,130,246,0.3)', '#1d4ed8', '📅 CALLBACK')); }
              if (isUnreachable && !seenDiv.unreachable) { seenDiv.unreachable = true; mobileItems.push(divStyle('rgba(239,68,68,0.08)', 'rgba(239,68,68,0.3)', '#b91c1c', '🚫 UNREACHABLE')); }
              mobileItems.push(
                <div key={lead.id} style={{ padding: '9px 10px', background: isCurrentAutoDial ? 'rgba(16,185,129,0.07)' : '#f8fafc', borderRadius: 10, border: isCurrentAutoDial ? '2px solid #10b981' : '1px solid #e8ecf4', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {isCurrentAutoDial && <span style={{ color: '#10b981', marginRight: 4 }}>▶</span>}{lead.firstName} {lead.lastName}
                    </div>
                    <div style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#1e40af', fontWeight: 600 }}>{lead.phone}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3, flexWrap: 'wrap' }}>
                      {statusBadgeEl(lead)}
                      {lead.list?.name && <span style={{ fontSize: '0.62rem', color: '#94a3b8' }}>{lead.list.name}</span>}
                    </div>
                  </div>
                  <button className="btn btn-primary" style={{ padding: '0.35rem 0.7rem', fontSize: '0.72rem', flexShrink: 0, opacity: isInvalid ? 0.5 : 1 }}
                    onClick={() => handleDialLead(lead)} disabled={callActive || autoDial}>📞</button>
                </div>
              );
            });
            return <div style={{ overflowY: 'auto', maxHeight: 420, display: 'flex', flexDirection: 'column', gap: 4 }}>{mobileItems}</div>;
          }

          // Desktop table view
          return (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>List</th>
                <th>Address</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.length > 0 ? (() => {
                let shownNoAnswerDivider = false;
                let shownVoicemailDivider = false;
                let shownCallbackDivider = false;
                let shownUnreachableDivider = false;
                let shownAnsweredDivider = false;
                let shownInvalidDivider = false;
                return filteredLeads.map((lead, idx) => {
                  const isCurrentAutoDial = autoDial && autoDialLeadsRef.current[autoDialIndexRef.current]?.id === lead.id;
                  const outcome = leadStatuses[lead.id]; // live session state: 'invalid'|'no_answer'|'voicemail'|'answered'
                  // Also check lead.status from backend — persists across refresh/re-login
                  const isVoicemail = outcome === 'voicemail' || lead._outcome === 'voicemail';
                  const isCallback = outcome === 'callback' || lead._outcome === 'callback' || lead.status === 'CALLBACK';
                  const isUnreachable = outcome === 'invalid' || lead._outcome === 'invalid' || lead.status === 'UNREACHABLE';
                  const isNoAnswer = !isVoicemail && !isCallback && !isUnreachable && (outcome === 'no_answer'
                    || lead._outcome === 'no_answer'
                    || lead.status === 'NO_ANSWER');
                  const isAnswered = outcome === 'answered'
                    || lead._outcome === 'answered'
                    || lead.status === 'CONTACTED' || lead.status === 'BOOKED';
                  const isInvalid = false; // Deprecated: invalid now maps to NO_ANSWER

                  // Section dividers
                  const rows = [];
                  if (isNoAnswer && !shownNoAnswerDivider && !isInvalid) {
                    shownNoAnswerDivider = true;
                    rows.push(
                      <tr key="divider-no-answer">
                        <td colSpan="6" style={{ padding: '6px 12px', background: 'rgba(251,191,36,0.08)', borderTop: '2px solid rgba(251,191,36,0.3)', borderBottom: '2px solid rgba(251,191,36,0.3)', fontSize: '0.72rem', fontWeight: 700, color: '#b45309', letterSpacing: '0.05em' }}>
                          🔕 NO ANSWER — will be retried next cycle
                        </td>
                      </tr>
                    );
                  }
                  if (isVoicemail && !shownVoicemailDivider) {
                    shownVoicemailDivider = true;
                    rows.push(
                      <tr key="divider-voicemail">
                        <td colSpan="6" style={{ padding: '6px 12px', background: 'rgba(124,58,237,0.08)', borderTop: '2px solid rgba(124,58,237,0.3)', borderBottom: '2px solid rgba(124,58,237,0.3)', fontSize: '0.72rem', fontWeight: 700, color: '#6d28d9', letterSpacing: '0.05em' }}>
                          📭 VOICEMAIL — follow-up required
                        </td>
                      </tr>
                    );
                  }
                  if (isAnswered && !shownAnsweredDivider) {
                    shownAnsweredDivider = true;
                    rows.push(
                      <tr key="divider-answered">
                        <td colSpan="6" style={{ padding: '6px 12px', background: 'rgba(16,185,129,0.08)', borderTop: '2px solid rgba(16,185,129,0.3)', borderBottom: '2px solid rgba(16,185,129,0.3)', fontSize: '0.72rem', fontWeight: 700, color: '#047857', letterSpacing: '0.05em' }}>
                          ✅ ANSWERED — contacted today
                        </td>
                      </tr>
                    );
                  }
                  if (isCallback && !shownCallbackDivider) {
                    shownCallbackDivider = true;
                    rows.push(
                      <tr key="divider-callback">
                        <td colSpan="6" style={{ padding: '6px 12px', background: 'rgba(59,130,246,0.08)', borderTop: '2px solid rgba(59,130,246,0.3)', borderBottom: '2px solid rgba(59,130,246,0.3)', fontSize: '0.72rem', fontWeight: 700, color: '#1d4ed8', letterSpacing: '0.05em' }}>
                          📅 CALLBACK — scheduled follow-up
                        </td>
                      </tr>
                    );
                  }
                  if (isUnreachable && !shownUnreachableDivider) {
                    shownUnreachableDivider = true;
                    rows.push(
                      <tr key="divider-unreachable">
                        <td colSpan="6" style={{ padding: '6px 12px', background: 'rgba(239,68,68,0.08)', borderTop: '2px solid rgba(239,68,68,0.3)', borderBottom: '2px solid rgba(239,68,68,0.3)', fontSize: '0.72rem', fontWeight: 700, color: '#b91c1c', letterSpacing: '0.05em' }}>
                          🚫 UNREACHABLE — number offline or laggy
                        </td>
                      </tr>
                    );
                  }
                  if (isInvalid && !shownInvalidDivider) {
                    shownInvalidDivider = true;
                    rows.push(
                      <tr key="divider-invalid">
                        <td colSpan="6" style={{ padding: '6px 12px', background: 'rgba(239,68,68,0.06)', borderTop: '2px solid rgba(239,68,68,0.25)', borderBottom: '2px solid rgba(239,68,68,0.25)', fontSize: '0.72rem', fontWeight: 700, color: '#b91c1c', letterSpacing: '0.05em' }}>
                          ❌ INVALID / INACTIVE — number unreachable
                        </td>
                      </tr>
                    );
                  }

                  // Status badge
                  const statusBadge = isCurrentAutoDial
                    ? <span style={{ background: '#10b981', color: 'white', borderRadius: 6, padding: '2px 7px', fontSize: '0.65rem', fontWeight: 800 }}>📞 Dialing</span>
                    : isInvalid
                      ? <span style={{ background: '#fef2f2', color: '#b91c1c', borderRadius: 6, padding: '2px 7px', fontSize: '0.65rem', fontWeight: 700, border: '1px solid #fca5a5' }}>❌ Invalid</span>
                      : isVoicemail
                        ? <span style={{ background: '#f5f3ff', color: '#7c3aed', borderRadius: 6, padding: '2px 7px', fontSize: '0.65rem', fontWeight: 700, border: '1px solid #c4b5fd' }}>📭 Voicemail</span>
                        : isCallback
                          ? <span style={{ background: '#eff6ff', color: '#1d4ed8', borderRadius: 6, padding: '2px 7px', fontSize: '0.65rem', fontWeight: 700, border: '1px solid #93c5fd' }}>📅 Callback</span>
                          : isUnreachable
                            ? <span style={{ background: '#fef2f2', color: '#b91c1c', borderRadius: 6, padding: '2px 7px', fontSize: '0.65rem', fontWeight: 700, border: '1px solid #fca5a5' }}>🚫 Unreachable</span>
                            : isNoAnswer
                              ? <span style={{ background: '#fffbeb', color: '#b45309', borderRadius: 6, padding: '2px 7px', fontSize: '0.65rem', fontWeight: 700, border: '1px solid #fcd34d' }}>🔕 No Answer</span>
                              : isAnswered
                                ? <span style={{ background: '#f0fdf4', color: '#15803d', borderRadius: 6, padding: '2px 7px', fontSize: '0.65rem', fontWeight: 700, border: '1px solid #86efac' }}>✅ Answered</span>
                                : <span style={{ background: 'var(--indigo-50)', color: 'var(--indigo-600)', borderRadius: 6, padding: '2px 7px', fontSize: '0.65rem', fontWeight: 600 }}>🆕 New</span>;

                  rows.push(
                    <tr
                      key={lead.id}
                      style={{
                        background: isCurrentAutoDial
                          ? 'rgba(16,185,129,0.07)'
                          : isInvalid ? 'rgba(239,68,68,0.03)'
                            : isVoicemail ? 'rgba(124,58,237,0.04)'
                              : isNoAnswer ? 'rgba(251,191,36,0.04)'
                                : 'transparent',
                        outline: isCurrentAutoDial ? '2px solid #10b981' : 'none',
                        outlineOffset: '-2px',
                        opacity: isInvalid ? 0.7 : 1,
                        transition: 'background 0.3s ease',
                      }}
                    >
                      <td style={{ fontWeight: 600 }}>
                        {isCurrentAutoDial && <span style={{ color: '#10b981', marginRight: 4, fontSize: '0.7rem', fontWeight: 800 }}>▶</span>}
                        {lead.firstName} {lead.lastName}
                      </td>
                      <td style={{ fontFamily: 'monospace' }}>{lead.phone}</td>
                      <td><span className="pill-status" style={{ fontSize: '0.65rem', background: '#eff6ff', color: '#3730a3' }}>{lead.list?.name || 'Unknown'}</span></td>
                      <td style={{ color: '#94a3b8' }}>{lead.address || '—'}</td>
                      <td>{statusBadge}</td>
                      <td>
                        <button
                          className="btn btn-primary"
                          style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem', opacity: isInvalid ? 0.5 : 1 }}
                          onClick={() => handleDialLead(lead)}
                          disabled={callActive || autoDial}
                          title={isInvalid ? 'This number is invalid/inactive' : autoDial ? 'Pause auto-dial to dial manually' : callActive ? 'End current call first' : `Call ${lead.phone}`}
                        >
                          📞 Dial
                        </button>
                      </td>
                    </tr>
                  );
                  return rows;
                });
              })() : (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '2rem 0', color: '#94a3b8' }}>
                    {leadsLoading ? 'Loading leads...' : leads.length === 0 ? 'No leads found. Upload a CSV from Admin panel.' : 'No leads match your search.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
          ); // end desktop table return
        })()} {/* end isMobile conditional */}
        </section>

        {/* ── CALENDAR / SCHEDULED CALLBACKS ── */}
        <section className="card" style={{ height: '100%', borderTop: '3px solid #6366f1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '0.75rem' : 0, marginBottom: '1.25rem' }}>
            <h2 className="font-head" style={{ fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>📅</span> Callback Calendar
            </h2>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
              {calSelectedDate && (
                <button className="btn" style={{ fontSize: '0.75rem', background: '#f1f5f9' }} onClick={() => setCalSelectedDate(null)}>
                  ✕ Show All
                </button>
              )}
              <button className="btn btn-primary" style={{ fontSize: '0.82rem' }} onClick={() => {
                const now = new Date();
                now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
                setApptForm(f => ({ ...f, scheduledAt: now.toISOString().slice(0, 16) }));
                setShowApptModal(true);
              }}>
                + Schedule Callback
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(220px, 260px) minmax(0, 1fr)', gap: '1.25rem', alignItems: 'start' }}>
            {/* Mini Calendar */}
            <div style={{ background: '#f8fafc', borderRadius: 12, padding: '1rem', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <button onClick={() => setCalViewMonth(m => {
                  let mo = m.month - 1; let yr = m.year;
                  if (mo < 0) { mo = 11; yr--; }
                  return { year: yr, month: mo };
                })} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: '#64748b', padding: '2px 6px', borderRadius: 6 }}>‹</button>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                  {new Date(calViewMonth.year, calViewMonth.month).toLocaleString('default', { month: 'long', year: 'numeric' })}
                </span>
                <button onClick={() => setCalViewMonth(m => {
                  let mo = m.month + 1; let yr = m.year;
                  if (mo > 11) { mo = 0; yr++; }
                  return { year: yr, month: mo };
                })} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: '#64748b', padding: '2px 6px', borderRadius: 6 }}>›</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', textAlign: 'center' }}>
                {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
                  <div key={d} style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', padding: '4px 0' }}>{d}</div>
                ))}
                {(() => {
                  const firstDay = new Date(calViewMonth.year, calViewMonth.month, 1).getDay();
                  const daysInMonth = new Date(calViewMonth.year, calViewMonth.month + 1, 0).getDate();
                  const today = new Date();
                  const cells = [];
                  for (let i = 0; i < firstDay; i++) cells.push(<div key={`e${i}`} />);
                  for (let d = 1; d <= daysInMonth; d++) {
                    const key = `${calViewMonth.year}-${String(calViewMonth.month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                    const hasAppts = !!apptsByDate[key];
                    const isToday = today.getFullYear() === calViewMonth.year && today.getMonth() === calViewMonth.month && today.getDate() === d;
                    const isSelected = calSelectedDate === key;
                    cells.push(
                      <button key={d} onClick={() => setCalSelectedDate(isSelected ? null : key)} style={{
                        background: isSelected ? '#4f46e5' : isToday ? '#eff6ff' : 'transparent',
                        color: isSelected ? 'white' : isToday ? '#4f46e5' : '#0f172a',
                        border: isToday && !isSelected ? '1.5px solid #6366f1' : '1.5px solid transparent',
                        borderRadius: 7,
                        fontSize: '0.8rem',
                        fontWeight: hasAppts ? 700 : 400,
                        padding: '5px 2px',
                        cursor: 'pointer',
                        position: 'relative',
                      }}>
                        {d}
                        {hasAppts && <span style={{ position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)', width: 5, height: 5, borderRadius: '50%', background: isSelected ? 'white' : '#6366f1', display: 'block' }} />}
                      </button>
                    );
                  }
                  return cells;
                })()}
              </div>
            </div>

            {/* Appointments List */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>
                  {calSelectedDate
                    ? `Appointments on ${new Date(calSelectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`
                    : 'Upcoming Callbacks'}
                </span>
                <span style={{ background: '#ede9fe', color: '#6d28d9', borderRadius: 999, padding: '2px 8px', fontSize: '0.72rem', fontWeight: 700 }}>
                  {calFilteredAppts.length}
                </span>
                <button className="btn" style={{ marginLeft: 'auto', fontSize: '0.72rem', background: '#f1f5f9' }} onClick={() => fetchAppointments(agentId)}>↻ Refresh</button>
              </div>

              {appointmentsLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem 0', color: '#94a3b8', fontSize: '0.85rem' }}>Loading...</div>
              ) : calFilteredAppts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 0', color: '#94a3b8' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.3 }}>📅</div>
                  <p style={{ fontSize: '0.85rem' }}>
                    {calSelectedDate ? 'No callbacks scheduled for this day' : 'No upcoming callbacks — schedule one above'}
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: 320, overflowY: 'auto' }}>
                  {calFilteredAppts.map(appt => {
                    const dt = new Date(appt.scheduledAt);
                    const isPast = dt < new Date();
                    return (
                      <div key={appt.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: isPast ? '#fffbeb' : '#f8fafc', border: `1px solid ${isPast ? '#fcd34d' : '#e2e8f0'}`, borderRadius: 10, padding: '0.75rem 1rem' }}>
                        <div style={{ width: 44, textAlign: 'center', flexShrink: 0 }}>
                          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>{dt.getDate()}</div>
                          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>{dt.toLocaleString('default', { month: 'short' })}</div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2 }}>{dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{appt.customerName}</div>
                          <div style={{ fontSize: '0.82rem', color: '#64748b', fontFamily: 'monospace' }}>{appt.customerPhone}</div>
                          {appt.customerEmail && <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{appt.customerEmail}</div>}
                          {appt.notes && <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2, fontStyle: 'italic' }}>{appt.notes}</div>}
                          {isPast && <span style={{ fontSize: '0.68rem', background: '#fef9c3', color: '#b45309', borderRadius: 999, padding: '2px 6px', fontWeight: 700 }}>OVERDUE</span>}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flexShrink: 0 }}>
                          <button
                            className="btn btn-primary"
                            style={{ fontSize: '0.72rem', padding: '0.35rem 0.75rem' }}
                            onClick={() => {
                              setDialNumber(appt.customerPhone);
                              setDialName(appt.customerName);
                            }}
                            title="Pre-fill dial pad with this number"
                          >
                            📞 Call
                          </button>
                          <button
                            className="btn"
                            style={{ fontSize: '0.72rem', padding: '0.35rem 0.75rem', background: '#dcfce7', color: '#15803d' }}
                            onClick={() => markApptDone(appt.id)}
                          >
                            ✓ Done
                          </button>
                          <button
                            className="btn"
                            style={{ fontSize: '0.72rem', padding: '0.35rem 0.75rem', background: '#fef2f2', color: '#b91c1c' }}
                            onClick={() => cancelAppt(appt.id)}
                          >
                            ✕ Cancel
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>
        </div>

        {/* ── ADD APPOINTMENT MODAL ── */}
        {showApptModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'white', borderRadius: 16, padding: '2rem', width: '100%', maxWidth: 480, boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontFamily: 'Outfit,sans-serif', fontWeight: 800, fontSize: '1.1rem', color: '#0f172a' }}>📅 Schedule Callback</h3>
                <button onClick={() => setShowApptModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '0.3rem' }}>Customer Name *</label>
                  <input className="input-field" placeholder="e.g. John Smith" value={apptForm.customerName} onChange={e => setApptForm(f => ({ ...f, customerName: e.target.value }))} />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '0.3rem' }}>Phone *</label>
                  <input className="input-field" placeholder="+1 555 000 0000" value={apptForm.customerPhone}
                    onChange={e => setApptForm(f => ({ ...f, customerPhone: e.target.value }))}
                    defaultValue={currentLead?.phone || ''} />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '0.3rem' }}>Email</label>
                  <input className="input-field" placeholder="customer@email.com" value={apptForm.customerEmail} onChange={e => setApptForm(f => ({ ...f, customerEmail: e.target.value }))} />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '0.3rem' }}>Date & Time *</label>
                  <input type="datetime-local" className="input-field" value={apptForm.scheduledAt} onChange={e => setApptForm(f => ({ ...f, scheduledAt: e.target.value }))} />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '0.3rem' }}>Notes</label>
                  <textarea className="input-field" rows={2} placeholder="What did they say? When are they free?" value={apptForm.notes} onChange={e => setApptForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button className="btn" style={{ flex: 1 }} onClick={() => setShowApptModal(false)}>Cancel</button>
                <button
                  className="btn btn-primary"
                  style={{ flex: 2 }}
                  onClick={saveAppointment}
                  disabled={apptSaving || !apptForm.customerName || !apptForm.customerPhone || !apptForm.scheduledAt}
                >
                  {apptSaving ? 'Saving...' : '✓ Save Callback'}
                </button>
              </div>
            </div>
          </div>
        )}

        </>)} {/* end !smsTab */}
      </div> {/* end page body */}

      <style>{`
        @keyframes pulse-red {
          0%, 100% { box-shadow: 0 6px 20px rgba(220,38,38,0.5); }
          50% { box-shadow: 0 6px 30px rgba(220,38,38,0.75); }
        }
        @keyframes pulse-ring {
          0%, 100% { box-shadow: 0 25px 60px rgba(0,0,0,0.6), 0 0 0 0 rgba(34,197,94,0.15); }
          50% { box-shadow: 0 25px 60px rgba(0,0,0,0.6), 0 0 0 16px rgba(34,197,94,0); }
        }
        .dialpad-key:hover { background: #f8fafc !important; border-color: #cbd5e1 !important; }
        .dialpad-key:active { background: #eff6ff !important; border-color: #6366f1 !important; transform: scale(0.95); }
        .dialpad-backspace:hover { background: #fef2f2 !important; border-color: #fca5a5 !important; color: #dc2626 !important; }
        .dialpad-backspace:active { transform: scale(0.95); }
      `}</style>
    </div>
  );
}



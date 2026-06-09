import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useSoftphoneContext } from '../context/SoftphoneContext';
import { API_URL, SIP_URI, SIP_PASSWORD, DEFAULT_OUTBOUND_NUMBER } from '../config/env';
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
    default: return null;
  }
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

export default function Agent() {
  const navigate = useNavigate();
  const { socket, isConnected, reconnect } = useSocket();
  const [agentId, setAgentId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [currentLead, setCurrentLead] = useState(null);
  const currentLeadRef = useRef(null); // Ref mirrors currentLead so auto-advance always has access even after hangup clears state
  const [callLogId, setCallLogId] = useState(null);
  const [callControlIdState, setCallControlIdState] = useState(null); // Track callControlId for VM drop
  const [notes, setNotes] = useState('');
  const [recentCalls, setRecentCalls] = useState([]);
  const [historyFeed, setHistoryFeed] = useState([]);
  const [historyStats, setHistoryStats] = useState({ missedCalls: 0, receivedCalls: 0, dialedCalls: 0, totalMessages: 0 });
  const [historyLoading, setHistoryLoading] = useState(false);
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

  useEffect(() => { autoDialRef.current = autoDial; }, [autoDial]);
  useEffect(() => { autoDialIndexRef.current = autoDialIndex; }, [autoDialIndex]);

  // SMS & Voicemail
  const [vmTemplates, setVmTemplates] = useState([]);
  const [smsTemplates, setSmsTemplates] = useState([]);
  const [showSmsPanel, setShowSmsPanel] = useState(false);
  const [smsMsg, setSmsMsg] = useState('');
  const [smsSending, setSmsSending] = useState(false);
  const [showVmDrop, setShowVmDrop] = useState(false);

  // SMS Messaging tab
  const [smsTab, setSmsTab] = useState(false);
  const [smsConversations, setSmsConversations] = useState([]);
  const [smsActiveThread, setSmsActiveThread] = useState(null);
  const [smsMessages, setSmsMessages] = useState([]);
  const [smsInput, setSmsInput] = useState('');
  const [smsSendingMsg, setSmsSendingMsg] = useState(false);
  const [callbackTime, setCallbackTime] = useState('');
  const [dealValue, setDealValue] = useState('');

  // Persist today's stats to localStorage whenever they change
  useEffect(() => {
    try { localStorage.setItem(todayKey, JSON.stringify(stats)); } catch { /* ignore */ }
  }, [stats, todayKey]);

  const HEARTBEAT_MS = 20000;

  const { callState, lastError, sipCause, callOutcome, makeCall, attachCall, hangup, registered, handleWebSocketCallUpdate, sendDTMF, updateCredentials, incomingCall, incomingCallInfo } = useSoftphoneContext();

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
        setCurrentLead(null);
        currentLeadRef.current = null;
        setCallLogId(null);
        setStatus('Idle');
        autoSkipRef.current = false;
        if (socket && agentId) socket.emit('agent:status', { agentId, status: 'available' });
      }, 2500);
      return () => clearTimeout(t);
    }
    // NOTE: handleDialLead intentionally excluded — it's defined later in the component
    // and including it in deps here causes a TDZ crash. The auto-advance is handled
    // by the callOutcome effect below which is defined after handleDialLead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callState, lastError, agentId, socket]);

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

  useEffect(() => {
    // Reconnect socket on mount to ensure fresh token is used
    if (reconnect) reconnect();

    // 1. Get current user profile
    fetchJson(`${API_URL}/auth/profile`).then(async (auth) => {
      if (auth?.userId) {
        setAgentId(auth.userId);
        try { localStorage.setItem('voxiq_agent_id', auth.userId); } catch { }
        // 2. Get full user details (number, lists)
        const fullUser = await fetchJson(`${API_URL}/users/${auth.userId}`);
        setProfile(fullUser);
        // Update global SIP credentials with profile-specific values
        updateCredentials({
          login: SIP_URI || fullUser?.sipUri || 'winfiagent',
          password: SIP_PASSWORD || fullUser?.sipPassword || 'WinFi2024',
          callerName: fullUser?.name || 'Voxiq Agent',
          callerNumber: fullUser?.callerNumber || DEFAULT_OUTBOUND_NUMBER || '+14422039259',
        });
        // 3. Fetch leads for this agent
        fetchLeads(auth.userId);
        fetchHistory();
      }
    });

    // Load voicemail and SMS templates
    const authHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('winfi_token') || ''}` };
    fetch(`${API_URL}/voicemail/templates`, { headers: authHeaders }).then(r => r.ok ? r.json() : []).then(d => setVmTemplates(Array.isArray(d) ? d : []));
    fetch(`${API_URL}/integrations/sms-templates`, { headers: authHeaders }).then(r => r.ok ? r.json() : []).then(d => setSmsTemplates(Array.isArray(d) ? d : []));
  }, [fetchLeads, fetchHistory]);

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
      socket.emit('agent:status', { agentId, status: 'available' });

      const heartbeat = setInterval(() => {
        socket.emit('agent:status', { agentId, status: 'available' });
      }, HEARTBEAT_MS);

      // Autodialer assigned a call to this agent
      socket.on('call:incoming', (data) => {
        console.log('Incoming call:', data);
        setCurrentLead(data.lead);
        setCallLogId(data.callLogId);
        setLocalCallActive(true);
        setStatus('Dialing Lead');
        attachCall(data.callLogId);
      });

      // Backend broadcasts this from Telnyx webhook when call is answered/ended
      socket.on('call:update', (data) => {
        console.log('Call update received:', data);
        handleWebSocketCallUpdate(data.callLogId, data.status);
        if (data.status === 'connected') {
          setStatus('On Call');
          setLocalCallActive(true);
        } else if (data.status === 'completed' || data.status === 'hangup') {
          setStatus('Idle');
          setLocalCallActive(false);
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
  }, [socket, isConnected, agentId, attachCall, handleWebSocketCallUpdate, profile, fetchHistory]);

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
    setStatus('Waiting for Lead...');
    if (socket && agentId) socket.emit('agent:status', { agentId, status: 'available' });
  };

  const handlePause = () => {
    setStatus('Paused');
    if (socket && agentId) socket.emit('agent:status', { agentId, status: 'paused' });
  };

  // Manually dial a lead from the queue
  const handleDialLead = useCallback(async (lead) => {
    hasDialedRef.current = true;

    // 1. Acquire distributed lock: prevent two agents dialing the same number
    //    The lock creates a RINGING callLog which blocks getNextLeadBatch for other agents.
    let logId = null;
    try {
      const lockRes = await fetchJson(`${API_URL}/dialer/call/lock`, {
        method: 'POST',
        body: JSON.stringify({ leadId: lead.id, agentId }),
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
    return true; // Success
  }, [makeCall, agentId]);

  const handleManualInputDial = useCallback(async (overrideNumber, overrideName) => {
    const rawNumber = (typeof overrideNumber === 'string' ? overrideNumber : null) || dialNumber;
    const numberToUse = rawNumber && !rawNumber.startsWith('+') ? dialCountryCode + rawNumber : rawNumber;
    if (!numberToUse) return;
    if (!agentId) {
      alert('Profile still loading — please wait a moment and try again.');
      return;
    }
    const originalNumber = numberToUse;
    const nameToUse = (typeof overrideName === 'string' ? overrideName : null) || dialName || '';
    setLastDialedNumber(originalNumber);
    try { localStorage.setItem('voxiq_last_dialed', originalNumber); } catch { /* ignore */ }

    // If a lead is currently selected, use it.
    if (currentLead) {
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
          setStatus('Dial Failed');
          setLocalCallActive(false);
          setCurrentLead(null);
          currentLeadRef.current = null;
          alert('Call failed to initiate. Please check your softphone registration.');
        }
      } catch (e) {
        console.warn('Manual dial process failed:', e);
        const result = await makeCall(originalNumber);
        if (result) {
          setDialNumber('');
          setDialName('');
        } else {
          setStatus('Error');
          setLocalCallActive(false);
          setCurrentLead(null);
          currentLeadRef.current = null;
          alert('Error: Could not connect the call. Check console for details.');
        }
      }
    }
  }, [dialNumber, dialCountryCode, dialName, currentLead, handleDialLead, makeCall, agentId]);

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

  // ── Smart lead reordering on call outcome ──────────────────────────────
  // outcome: 'answered' | 'no_answer' | 'voicemail' | 'invalid'
  const handleCallOutcome = useCallback((lead, outcome) => {
    if (!lead) return;

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

    fetchJson(`${API_URL}/leads/${lead.id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: backendStatus }),
    }).then(() => {
      // Force refresh the specific lead in the list from backend state
      console.log(`[Outcome] Lead ${lead.id} persisted as ${backendStatus}`);
    }).catch(e => console.warn('Lead status update failed:', e));

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
  }, [updateLeadStatus]);

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
    setStatus('Idle');
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
      const res = await fetch(`${API_URL}/integrations/sms/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`,
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

  const fetchSmsConversations = async () => {
    try {
      const token = localStorage.getItem('winfi_token');
      const data = await fetch(`${API_URL}/sms/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json());
      setSmsConversations(Array.isArray(data) ? data : []);
    } catch (e) { console.error('fetchSmsConversations:', e); }
  };

  const fetchSmsThread = async (contactNumber) => {
    try {
      const token = localStorage.getItem('winfi_token');
      const encoded = encodeURIComponent(contactNumber);
      const data = await fetch(`${API_URL}/sms/conversations/${encoded}`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json());
      setSmsMessages(Array.isArray(data) ? data : []);
    } catch (e) { console.error('fetchSmsThread:', e); }
  };

  const sendSmsMessage = async () => {
    if (!smsInput.trim() || !smsActiveThread) return;
    setSmsSendingMsg(true);
    try {
      const token = localStorage.getItem('winfi_token');
      const res = await fetch(`${API_URL}/sms/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ to: smsActiveThread, body: smsInput.trim() }),
      });
      if (!res.ok) throw new Error(await res.text());
      setSmsInput('');
      await fetchSmsThread(smsActiveThread);
      await fetchHistory();
    } catch (e) { alert('SMS failed: ' + e.message); }
    finally { setSmsSendingMsg(false); }
  };

  // End call - force resets everything regardless of SIP state
  const handleHangup = useCallback(() => {
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
    if (socket && agentId) socket.emit('agent:status', { agentId, status: 'available' });
  }, [hangup, agentId, socket]);

  const handleLogout = () => {
    clearToken();
    navigate('/login');
  };

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

    if (!callLogId) {
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
          callLogId,
          disposition,
          notes,
          ...(disposition === 'Callback' && callbackTime ? { callbackAt: callbackTime } : {}),
          ...(dealValue && !isNaN(parseFloat(dealValue)) ? { dealValue: parseFloat(dealValue) } : {})
        }),
      });

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
  }, [callLogId, notes, callbackTime, currentLead, handleHangup, dealValue, handleCallOutcome, fetchHistory]);

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

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column' }}>

      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <header style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1b2050 100%)',
        padding: '0 2rem',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          {profile && (
            <div style={{ padding: '4px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.38)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Agent</div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'white' }}>{profile.name || 'Agent'}</div>
            </div>
          )}
          <div style={{ padding: '4px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.38)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Caller ID</div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.9)', fontFamily: 'monospace' }}>
              {profile?.callerNumber || DEFAULT_OUTBOUND_NUMBER || '+14422039259'}
            </div>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '6px 14px', borderRadius: 8,
            background: isConnected ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
            border: `1px solid ${isConnected ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
          }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: isConnected ? '#10b981' : '#ef4444', boxShadow: isConnected ? '0 0 8px rgba(16,185,129,0.8)' : '0 0 8px rgba(239,68,68,0.8)' }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: isConnected ? '#34d399' : '#fca5a5' }}>
              {isConnected ? 'Online' : 'Offline'}
            </span>
          </div>
          <div style={{
            padding: '6px 12px', borderRadius: 8,
            background: registered ? 'rgba(16,185,129,0.1)' : 'rgba(251,191,36,0.1)',
            border: `1px solid ${registered ? 'rgba(16,185,129,0.25)' : 'rgba(251,191,36,0.25)'}`,
            fontSize: '0.73rem', fontWeight: 700,
            color: registered ? '#34d399' : '#fbbf24',
          }}>
            {registered ? '✓ SIP Ready' : '⚠ SIP...'}
          </div>
          <div style={{ padding: '5px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.73rem', fontWeight: 600, color: 'rgba(255,255,255,0.65)', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {status}
          </div>
          <button
            onClick={handleLogout}
            style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '9px 20px', background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)', color: 'white', border: '1px solid rgba(220,38,38,0.5)', borderRadius: 9, fontWeight: 700, fontSize: '0.85rem', fontFamily: 'inherit', cursor: 'pointer', boxShadow: '0 4px 14px rgba(220,38,38,0.4)', letterSpacing: '0.01em' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign Out
          </button>
        </div>
      </header>

      {/* ── PAGE BODY ──────────────────────────────────────────────── */}
      <div style={{ padding: '1.5rem 2rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {/* Tab Bar */}
        <div style={{ display: 'flex', gap: 8, borderBottom: '2px solid #e5e7eb', paddingBottom: 0, marginBottom: -8 }}>
          <button
            onClick={() => setSmsTab(false)}
            style={{ padding: '8px 18px', background: 'none', border: 'none', borderBottom: !smsTab ? '2px solid #6366f1' : '2px solid transparent', color: !smsTab ? '#6366f1' : '#64748b', fontWeight: !smsTab ? 700 : 500, cursor: 'pointer', fontSize: '0.9rem', marginBottom: -2, fontFamily: 'inherit' }}
          >
            Dialer
          </button>
          <button
            onClick={() => { setSmsTab(true); fetchSmsConversations(); }}
            style={{ padding: '8px 18px', background: 'none', border: 'none', borderBottom: smsTab ? '2px solid #6366f1' : '2px solid transparent', color: smsTab ? '#6366f1' : '#64748b', fontWeight: smsTab ? 700 : 500, cursor: 'pointer', fontSize: '0.9rem', marginBottom: -2, fontFamily: 'inherit' }}
          >
            Messages
          </button>
        </div>

        {/* ── SMS MESSAGES PANEL ── */}
        {smsTab && (
          <div style={{ display: 'flex', height: '65vh', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', background: '#fff', marginTop: 12 }}>
            {/* Left: conversation list */}
            <div style={{ width: 260, borderRight: '1px solid #e5e7eb', overflowY: 'auto', background: '#f9fafb', flexShrink: 0 }}>
              <div style={{ padding: '10px 14px', fontWeight: 700, borderBottom: '1px solid #e5e7eb', fontSize: 13 }}>Conversations</div>
              {smsConversations.length === 0 && (
                <div style={{ padding: 20, color: '#9ca3af', fontSize: 12, textAlign: 'center' }}>No messages yet</div>
              )}
              {smsConversations.map(c => (
                <div
                  key={c.contactNumber}
                  onClick={() => { setSmsActiveThread(c.contactNumber); fetchSmsThread(c.contactNumber); }}
                  style={{
                    padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6',
                    background: smsActiveThread === c.contactNumber ? '#eff6ff' : 'transparent',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 12 }}>{c.contactNumber}</div>
                  <div style={{ fontSize: 11, color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {c.direction === 'outbound' ? 'You: ' : '← '}{c.lastMessage}
                  </div>
                  <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>
                    {new Date(c.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>

            {/* Right: thread view */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              {!smsActiveThread ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 13 }}>
                  Select a conversation
                </div>
              ) : (
                <>
                  <div style={{ padding: '10px 14px', borderBottom: '1px solid #e5e7eb', fontWeight: 600, fontSize: 13 }}>
                    {smsActiveThread}
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {smsMessages.map(m => (
                      <div key={m.id} style={{ display: 'flex', justifyContent: m.direction === 'outbound' ? 'flex-end' : 'flex-start' }}>
                        <div style={{
                          maxWidth: '72%', padding: '7px 11px', borderRadius: 12,
                          background: m.direction === 'outbound' ? '#2563eb' : '#f3f4f6',
                          color: m.direction === 'outbound' ? '#fff' : '#111827',
                          fontSize: 13,
                        }}>
                          {m.body}
                          <div style={{ fontSize: 10, opacity: 0.65, marginTop: 3 }}>
                            {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                      placeholder="Type a message..."
                      style={{ flex: 1, padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, outline: 'none' }}
                    />
                    <button
                      onClick={sendSmsMessage}
                      disabled={smsSendingMsg || !smsInput.trim()}
                      style={{ padding: '7px 14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
          {[
            { label: 'Calls Today', value: stats.calls, accent: '#6366f1' },
            { label: 'Appointments', value: stats.appointments, accent: '#10b981' },
            { label: 'Conversion Rate', value: `${stats.calls > 0 ? ((stats.appointments / stats.calls) * 100).toFixed(1) : '0.0'}%`, accent: '#f59e0b' },
            { label: 'Leads in Queue', value: leads.length, accent: '#06b6d4' },
          ].map(({ label, value, accent }) => (
            <div key={label} className="card" style={{ padding: '1.25rem 1.5rem', borderLeft: `4px solid ${accent}` }}>
              <span className="stat-label">{label}</span>
              <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#0f172a', fontFamily: 'Outfit,sans-serif', letterSpacing: '-0.02em', lineHeight: 1.15, marginTop: '0.4rem' }}>
                {value}
              </div>
            </div>
          ))}
        </div>

        {/* Main 2-column grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1.25rem', alignItems: 'start' }}>

        {/* ── LEFT COLUMN ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Lead Profile Card */}
          <section className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 className="font-head" style={{ fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>👤</span> Lead Profile
              </h2>
              {currentLead && <span className="pill-status pill-success" style={{ fontSize: '0.65rem' }}>{currentLead.status}</span>}
            </div>

            {callState === 'failed' && lastError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1rem', color: '#dc2626', fontWeight: 600, fontSize: '0.9rem' }}>
                {errorLabel(lastError)} — auto-clearing in 2.5s...
              </div>
            )}

            {currentLead ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                <div>
                  <span className="stat-label">Contact Name</span>
                  <p style={{ fontWeight: 700, fontSize: '1.05rem', marginTop: '0.3rem', color: '#0f172a' }}>{currentLead.firstName} {currentLead.lastName}</p>
                </div>
                <div>
                  <span className="stat-label">Phone</span>
                  <p style={{ fontWeight: 700, fontSize: '1.05rem', fontFamily: 'monospace', marginTop: '0.3rem', color: '#0f172a' }}>{currentLead.phone}</p>
                </div>
                <div>
                  <span className="stat-label">Source List</span>
                  <p style={{ fontWeight: 700, fontSize: '1.05rem', color: '#6366f1', marginTop: '0.3rem' }}>{currentLead.list?.name || 'Manual Assignment'}</p>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <span className="stat-label">Address</span>
                  <p style={{ color: '#94a3b8', marginTop: '0.3rem' }}>{currentLead.address || 'Not provided'}</p>
                </div>
                {currentLead.metadata && Object.keys(currentLead.metadata).length > 0 && (
                  <div style={{ gridColumn: '1 / -1', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem' }}>
                    <span className="stat-label">Custom Fields</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.4rem' }}>
                      {Object.entries(currentLead.metadata).map(([k, v]) => (
                        <span key={k} style={{ background: '#eff6ff', borderRadius: 6, padding: '2px 8px', fontSize: '0.75rem', color: '#3730a3' }}>
                          <b>{k}:</b> {v}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: '#94a3b8' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem', opacity: 0.3 }}>👤</div>
                <p style={{ fontWeight: 600, color: '#64748b', fontSize: '0.95rem' }}>No lead selected</p>
                <p style={{ fontSize: '0.82rem', marginTop: '0.25rem' }}>Select from the queue below or start auto-dial</p>
              </div>
            )}

            <div style={{ marginTop: '1rem', padding: '0.875rem 1rem', background: '#f8fafc', borderRadius: 10, border: '1px dashed #e2e8f0' }}>
              <span className="stat-label">Live Script</span>
              <p style={{ marginTop: '0.4rem', color: '#64748b', fontStyle: 'italic', fontSize: '0.9rem', lineHeight: 1.55 }}>
                {currentLead
                  ? `"Hi ${currentLead.firstName}, calling from Voxiq. Hope you're having a great day..."`
                  : 'Script will appear here when a call is active.'}
              </p>
            </div>
          </section>

          {/* Disposition Card */}
          <section className="card">
            <h2 className="font-head mb-4" style={{ fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>📋</span> Disposition
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
              <button className="btn btn-primary" onClick={() => submitDisposition('Interested')} style={{ fontSize: '0.82rem' }}>✅ Interested <kbd style={{ opacity: 0.55, fontSize: '0.65rem', marginLeft: 4, background: 'rgba(255,255,255,0.2)', padding: '1px 5px', borderRadius: 3 }}>F1</kbd></button>
              <button className="btn" onClick={() => submitDisposition('Callback')} style={{ background: '#eff6ff', color: '#3730a3', border: '1px solid #c7d2fe', fontSize: '0.82rem' }}>📅 Callback <kbd style={{ opacity: 0.55, fontSize: '0.65rem', marginLeft: 4 }}>F2</kbd></button>
              <button className="btn" onClick={() => submitDisposition('Voicemail')} style={{ background: '#f5f3ff', color: '#6d28d9', border: '1px solid #ddd6fe', fontSize: '0.82rem' }}>📭 Voicemail <kbd style={{ opacity: 0.55, fontSize: '0.65rem', marginLeft: 4 }}>F3</kbd></button>
              <button className="btn" onClick={() => submitDisposition('No Answer')} style={{ background: '#fffbeb', color: '#92400e', border: '1px solid #fcd34d', fontSize: '0.82rem' }}>🔕 No Answer <kbd style={{ opacity: 0.55, fontSize: '0.65rem', marginLeft: 4 }}>F4</kbd></button>
              <button className="btn" onClick={() => submitDisposition('Unreachable')} style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fca5a5', fontSize: '0.82rem' }}>🚫 Unreachable <kbd style={{ opacity: 0.55, fontSize: '0.65rem', marginLeft: 4 }}>F5</kbd></button>
              <button className="btn" onClick={() => submitDisposition('DNC')} style={{ background: '#0f172a', color: 'white', border: 'none', fontSize: '0.82rem' }}>⛔ DNC</button>
            </div>
            <textarea
              className="input-field mb-3"
              placeholder="Interaction notes..."
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
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
        </div> {/* end LEFT COLUMN */}

        {/* ── RIGHT COLUMN ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Call Control / Softphone */}
          <section className="card" style={{ background: 'linear-gradient(160deg, #0f172a 0%, #1b2050 100%)', border: 'none', padding: '1.5rem' }}>
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
          <section className="card" style={{ border: '1.5px solid #e0e7ff' }}>
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
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              {/* Country code — manually typeable with datalist suggestions */}
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  list="country-codes-list"
                  value={dialCountryCode}
                  onChange={(e) => setDialCountryCode(e.target.value)}
                  style={{ width: '72px', height: '52px', borderRadius: 10, border: '2px solid #e0e7ff', textAlign: 'center', fontWeight: 700, fontSize: '0.95rem', fontFamily: 'monospace', background: '#f8fafc', color: '#0f172a', outline: 'none', boxSizing: 'border-box' }}
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
                style={{ flex: 1, fontSize: '1.1rem', height: '52px', borderRadius: 10, border: '2px solid #e0e7ff', textAlign: 'center', fontWeight: 700, letterSpacing: '0.06em', fontFamily: 'monospace' }}
              />
              <button
                style={{ height: '52px', padding: '0 1.25rem', fontSize: '1.3rem', borderRadius: 10, minWidth: '54px', border: 'none', cursor: callActive ? 'not-allowed' : 'pointer', fontFamily: 'inherit', background: dialNumber && !callActive ? 'linear-gradient(135deg,#10b981,#059669)' : '#f1f5f9', color: dialNumber && !callActive ? 'white' : '#94a3b8', boxShadow: dialNumber && !callActive ? '0 4px 14px rgba(16,185,129,0.4)' : 'none', transition: 'all 0.2s' }}
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

          <section className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <h2 className="font-head" style={{ fontSize: '1rem', marginBottom: 4 }}>Persistent History</h2>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <AgentHistoryBadge item={{ type: 'call', category: 'missed' }} /> <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{historyStats.missedCalls}</span>
                  <AgentHistoryBadge item={{ type: 'call', category: 'received' }} /> <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{historyStats.receivedCalls}</span>
                  <AgentHistoryBadge item={{ type: 'call', category: 'dialed' }} /> <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{historyStats.dialedCalls}</span>
                  <AgentHistoryBadge item={{ type: 'sms', category: 'dialed' }} /> <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{historyStats.totalMessages}</span>
                </div>
              </div>
              <button className="btn" style={{ fontSize: '0.75rem', background: '#f8fafc' }} onClick={fetchHistory} disabled={historyLoading}>
                {historyLoading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Lead / Contact</th>
                    <th>Number</th>
                    <th>Time</th>
                    <th>Status</th>
                    <th>Details</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {historyFeed.length > 0 ? historyFeed.map((item) => (
                    <tr key={`${item.type}-${item.id}`}>
                      <td><AgentHistoryBadge item={item} /></td>
                      <td style={{ fontWeight: 600 }}>
                        {(item.lead ? `${item.lead.firstName || ''} ${item.lead.lastName || ''}`.trim() : '') || item.agent?.name || 'Unknown'}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#64748b' }}>
                        {item.toNumber || item.fromNumber || item.lead?.phone || '—'}
                      </td>
                      <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                        {new Date(item.startedAt || item.createdAt).toLocaleString()}
                      </td>
                      <td>
                        <span className={`pill-status ${item.category === 'missed' ? 'pill-error' : 'pill-success'}`} style={{ fontSize: '0.65rem' }}>
                          {item.status || item.category}
                        </span>
                      </td>
                      <td>
                        <div style={{ color: '#64748b', fontSize: '0.75rem', maxWidth: 220, whiteSpace: 'pre-wrap' }}>
                          {item.type === 'call'
                            ? `${item.durationSeconds != null ? `${item.durationSeconds}s` : 'No duration'}${item.disposition ? ` • ${item.disposition}` : ''}`
                            : (item.body || '')}
                        </div>
                      </td>
                      <td>
                        {(item.toNumber || item.fromNumber || item.lead?.phone) && item.type === 'call' && (
                          <button
                            disabled={callActive}
                            onClick={() => {
                              const callNumber = item.toNumber || item.fromNumber || item.lead?.phone || '';
                              const num = callNumber.replace(/\D/g, '');
                              setDialNumber(num);
                              setDialName((item.lead ? `${item.lead.firstName || ''} ${item.lead.lastName || ''}`.trim() : '') || num);
                              setShowDialpad(true);
                            }}
                            style={{
                              background: callActive ? '#f1f5f9' : 'linear-gradient(135deg,#10b981,#059669)',
                              color: callActive ? '#94a3b8' : '#fff',
                              border: 'none', borderRadius: 8,
                              padding: '4px 10px', fontSize: '0.75rem',
                              cursor: callActive ? 'not-allowed' : 'pointer',
                              fontWeight: 700, whiteSpace: 'nowrap',
                            }}
                          >
                            Call Back
                          </button>
                        )}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '1.5rem 0', color: '#94a3b8', fontSize: '0.85rem' }}>No persistent history yet</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Recent Activity */}
          <section className="card">
            <h2 className="font-head mb-4" style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>🕐</span> Recent Activity
            </h2>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Caller / Lead</th>
                    <th>Number</th>
                    <th>Time</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {recentCalls.map((call, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>
                        {call.direction === 'inbound' ? '📲 ' : '📞 '}
                        {call.lead}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#64748b' }}>
                        {call.number || '—'}
                      </td>
                      <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{call.time}</td>
                      <td>
                        <span className={`pill-status ${call.disposition === 'Missed' ? 'pill-error' : 'pill-success'}`}
                          style={{ fontSize: '0.65rem' }}>
                          {call.disposition === 'Missed' ? '📵 Missed' : call.disposition === 'Received' ? '✅ Received' : call.disposition}
                        </span>
                      </td>
                      <td>
                        {call.number && (
                          <button
                            disabled={callActive}
                            onClick={() => {
                              const num = call.number.replace(/\D/g, '');
                              setDialNumber(num);
                              setDialName(call.lead || num);
                              setShowDialpad(true);
                            }}
                            style={{
                              background: callActive ? '#f1f5f9' : 'linear-gradient(135deg,#10b981,#059669)',
                              color: callActive ? '#94a3b8' : '#fff',
                              border: 'none', borderRadius: 8,
                              padding: '4px 10px', fontSize: '0.75rem',
                              cursor: callActive ? 'not-allowed' : 'pointer',
                              fontWeight: 700, whiteSpace: 'nowrap',
                            }}
                          >
                            📞 Call Back
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {recentCalls.length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '1.5rem 0', color: '#94a3b8', fontSize: '0.85rem' }}>No calls yet this session</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div> {/* end RIGHT COLUMN */}
        </div> {/* end main 2-col grid */}

        {/* ── LEAD QUEUE ── */}
        <section className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
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
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
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
                style={{ width: '180px', padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
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
        </section>
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

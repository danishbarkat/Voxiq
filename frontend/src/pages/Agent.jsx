import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useSoftphone } from '../hooks/useSoftphone';
import { API_URL } from '../config/env';
import { fetchJson } from '../lib/api';
import { clearToken, getToken } from '../lib/auth';

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
  const [status, setStatus] = useState('Idle');
  const [dialNumber, setDialNumber] = useState('');
  const [callTimer, setCallTimer] = useState(0);
  const [stats, setStats] = useState({ calls: 0, appointments: 0 });
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
  const [callbackTime, setCallbackTime] = useState('');
  const [dealValue, setDealValue] = useState('');

  const HEARTBEAT_MS = 20000;

  const { callState, lastError, callOutcome, makeCall, attachCall, hangup, registered, handleWebSocketCallUpdate, sendDTMF } = useSoftphone({
    username: 'winfiagent',
    password: 'WinFi2024',
    callerNumber: profile?.callerNumber || '+12623990007', // Use assigned number if available
    callerName: profile?.callerName || 'RMESSAGES LLC',
  });

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

  useEffect(() => {
    // Reconnect socket on mount to ensure fresh token is used
    if (reconnect) reconnect();

    // 1. Get current user profile
    fetchJson(`${API_URL}/auth/profile`).then(async (auth) => {
      if (auth?.userId) {
        setAgentId(auth.userId);
        // 2. Get full user details (number, lists)
        const fullUser = await fetchJson(`${API_URL}/users/${auth.userId}`);
        setProfile(fullUser);
        // 3. Fetch leads for this agent
        fetchLeads(auth.userId);
      }
    });

    // Load voicemail and SMS templates
    const authHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('winfi_token') || ''}` };
    fetch(`${API_URL}/voicemail/templates`, { headers: authHeaders }).then(r => r.ok ? r.json() : []).then(d => setVmTemplates(Array.isArray(d) ? d : []));
    fetch(`${API_URL}/integrations/sms-templates`, { headers: authHeaders }).then(r => r.ok ? r.json() : []).then(d => setSmsTemplates(Array.isArray(d) ? d : []));
  }, [fetchLeads]);

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
        }
      });

      return () => {
        clearInterval(heartbeat);
        socket.off('call:incoming');
        socket.off('call:update');
      };
    }
  }, [socket, isConnected, agentId, attachCall, handleWebSocketCallUpdate]);

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
        if (!autoDialRef.current) {
          setStatus(`⚠️ Already being dialed by another agent — skipping`);
          setTimeout(() => setStatus('Idle'), 2500);
        }
        return false; // Lock failed
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

  const handleManualInputDial = useCallback(async () => {
    if (!dialNumber) return;

    // If a lead is currently selected, use it. Otherwise, this is a "pure" manual call.
    // NOTE: Backend logCall currently requires a leadId.
    if (currentLead) {
      await handleDialLead(currentLead);
    } else {
      // Pure manual call without lead - WebRTC only for now
      makeCall(dialNumber);
    }
    setDialNumber('');
  }, [dialNumber, currentLead, handleDialLead, makeCall]);

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
      }
    } catch (e) { alert('SMS failed: ' + e.message); }
    finally { setSmsSending(false); }
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
        status: 'Connected',
        time: new Date().toLocaleTimeString(),
        disposition
      }, ...prev]);
      setStats(prev => ({
        ...prev,
        calls: prev.calls + 1,
        appointments: disposition === 'Interested' || disposition === 'Booked' ? prev.appointments + 1 : prev.appointments
      }));
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
        status: 'Connected',
        time: new Date().toLocaleTimeString(),
        disposition
      }, ...prev]);

      setStats(prev => ({
        ...prev,
        calls: prev.calls + 1,
        appointments: disposition === 'Interested' || disposition === 'Booked' ? prev.appointments + 1 : prev.appointments
      }));

      handleHangup();
    } catch (error) {
      console.error('Failed to submit disposition:', error);
      handleHangup();
    }
  }, [callLogId, notes, callbackTime, currentLead, handleHangup, dealValue, handleCallOutcome]);

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
    <div className="agent-workspace mt-4">
      {/* Header */}
      <div className="card full-width flex justify-between items-center" style={{ background: 'var(--grad-surface)' }}>
        <div className="flex items-center gap-4">
          <div style={{ width: 42, height: 42, background: 'var(--grad-brand)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '1.2rem', flexShrink: 0 }}>W</div>
          <div>
            <span className="stat-label">Agent Workspace</span>
            <h1 className="font-head" style={{ color: 'var(--brand-dark)' }}>WinFi Dialer</h1>
          </div>
        </div>
        <div className="flex gap-4 items-center">
          <div className="text-right">
            <span className="stat-label">Caller ID</span>
            <div className="pill-status" style={{ background: 'var(--indigo-50)', color: 'var(--primary)', fontWeight: 700 }}>
              {profile?.callerNumber || 'Default'}
              {` • ${profile?.callerName || 'RMESSAGES LLC'}`}
            </div>
          </div>
          <div className="text-right">
            <span className="stat-label">System</span>
            <div className={`pill-status ${isConnected ? 'pill-success' : 'pill-error'}`}>
              {isConnected ? 'Connected' : 'Offline'}
            </div>
          </div>
          <div className="text-right">
            <span className="stat-label">Status</span>
            <div className="pill-status" style={{ background: 'var(--slate-100)', color: 'var(--slate-600)' }}>{status}</div>
          </div>
          <button className="btn" style={{ background: 'var(--slate-100)', fontSize: '0.75rem' }} onClick={handleLogout}>Sign Out</button>
        </div>
      </div>

      {/* Stats */}
      <div className="dynamic-grid full-width">
        <div className="card stat-card">
          <span className="stat-label">Calls Today</span>
          <span className="stat-val">{stats.calls}</span>
        </div>
        <div className="card stat-card">
          <span className="stat-label">Appointments</span>
          <span className="stat-val">{stats.appointments}</span>
        </div>
        <div className="card stat-card">
          <span className="stat-label">Conversion Rate</span>
          <span className="stat-val">
            {stats.calls > 0 ? ((stats.appointments / stats.calls) * 100).toFixed(1) : '0.0'}%
          </span>
        </div>
        <div className="card stat-card">
          <span className="stat-label">Leads in Queue</span>
          <span className="stat-val">{leads.length}</span>
        </div>
      </div >

      {/* Main Controls */}
      < div className="flex flex-col gap-4" >
        <section className="card">
          <div className="justify-between flex items-center mb-4">
            <h2 className="font-head">Lead Profile</h2>
            {currentLead && <span className="pill-status pill-success">{currentLead.status}</span>}
          </div>

          {/* Error / failed state banner */}
          {callState === 'failed' && lastError && (
            <div style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '10px',
              padding: '0.75rem 1rem',
              marginBottom: '1rem',
              color: '#dc2626',
              fontWeight: 600,
              fontSize: '0.9rem'
            }}>
              {errorLabel(lastError)} — auto-clearing in 2.5s...
            </div>
          )}

          {currentLead ? (
            <div className="grid dynamic-grid">
              <div>
                <span className="stat-label">Contact Name</span>
                <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>{currentLead.firstName} {currentLead.lastName}</p>
              </div>
              <div>
                <span className="stat-label">Phone</span>
                <p style={{ fontWeight: 700, fontSize: '1.1rem', fontFamily: 'monospace' }}>{currentLead.phone}</p>
              </div>
              <div>
                <span className="stat-label">Source List</span>
                <p style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--primary)' }}>{currentLead.list?.name || 'Manual Assignment'}</p>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <span className="stat-label">Address</span>
                <p className="text-dim">{currentLead.address || 'Not Provided'}</p>
              </div>
              {currentLead.metadata && Object.keys(currentLead.metadata).length > 0 && (
                <div style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--slate-200)', paddingTop: '0.5rem' }}>
                  <span className="stat-label">Custom Fields</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.3rem' }}>
                    {Object.entries(currentLead.metadata).map(([k, v]) => (
                      <span key={k} style={{ background: 'var(--indigo-50)', borderRadius: '6px', padding: '2px 8px', fontSize: '0.75rem' }}>
                        <b>{k}:</b> {v}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-soft">Awaiting next lead assignment...</div>
          )}

          <div className="card mt-4" style={{ background: 'var(--slate-50)', borderStyle: 'dashed' }}>
            <span className="stat-label">Live Script</span>
            <p className="mt-2 text-dim" style={{ fontStyle: 'italic', fontSize: '0.95rem' }}>
              {currentLead
                ? `"Hi ${currentLead.firstName}, calling from WinFi. Hope you're having a great day..."`
                : 'The dynamic script will appear here once a call is active.'}
            </p>
          </div>
        </section>

        <section className="card">
          <h2 className="font-head mb-4">Disposition</h2>
          <div className="flex flex-wrap gap-2 mb-4">
            <button className="btn btn-primary" onClick={() => submitDisposition('Interested')}>Interested (F1)</button>
            <button className="btn" style={{ background: 'var(--slate-100)' }} onClick={() => submitDisposition('Callback')}>Callback (F2)</button>
            <button className="btn" style={{ background: 'var(--slate-100)' }} onClick={() => submitDisposition('Voicemail')}>Voicemail (F3)</button>
            <button className="btn" style={{ background: 'var(--slate-100)' }} onClick={() => submitDisposition('No Answer')}>No Answer (F4)</button>
            <button className="btn" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fca5a5' }} onClick={() => submitDisposition('Unreachable')}>Unreachable (F5)</button>
            <button className="btn pill-error" style={{ color: 'white' }} onClick={() => submitDisposition('DNC')}>DNC</button>
          </div>
          <textarea
            className="input-field mb-3"
            placeholder="Interaction notes here..."
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <div className="mb-3">
            <label className="text-dim" style={{ fontSize: '0.8rem', display: 'block', marginBottom: '4px' }}>Schedule Callback (Optional)</label>
            <input
              type="datetime-local"
              className="input-field"
              value={callbackTime}
              onChange={e => setCallbackTime(e.target.value)}
              style={{ maxWidth: '250px' }}
            />
          </div>
          <div className="mb-3">
            <label className="text-dim" style={{ fontSize: '0.8rem', display: 'block', marginBottom: '4px' }}>Deal Value ($) (Optional)</label>
            <input
              type="number"
              className="input-field"
              placeholder="e.g. 500.00"
              value={dealValue}
              onChange={e => setDealValue(e.target.value)}
              style={{ maxWidth: '250px' }}
            />
          </div>
          {/* SMS Follow-up */}
          <div className="flex gap-2 mb-2">
            <button
              className="btn"
              style={{ background: 'var(--indigo-50)', color: 'var(--primary)', fontSize: '0.8rem' }}
              onClick={() => setShowSmsPanel(!showSmsPanel)}
              disabled={!currentLead}
            >💬 SMS Follow-up</button>
            {callActive && vmTemplates.length > 0 && (
              <button
                className="btn"
                style={{ background: 'var(--amber-50)', color: '#d97706', fontSize: '0.8rem' }}
                onClick={() => setShowVmDrop(!showVmDrop)}
              >📬 Drop Voicemail</button>
            )}
          </div>
          {showSmsPanel && (
            <div style={{ background: 'var(--slate-50)', borderRadius: '8px', padding: '0.75rem', marginBottom: '0.5rem' }}>
              <p style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>SMS to: {currentLead?.phone}</p>
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
            <div style={{ background: 'var(--amber-50)', borderRadius: '8px', padding: '0.75rem' }}>
              <p style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem' }}>Select voicemail to drop:</p>
              <div className="flex flex-col gap-2">
                {vmTemplates.map(vm => (
                  <div key={vm.id} className="flex justify-between items-center">
                    <span style={{ fontSize: '0.82rem' }}>📬 {vm.name}</span>
                    <button className="btn" style={{ fontSize: '0.72rem', background: '#d97706', color: 'white' }} onClick={() => handleVmDrop(vm.id, vm.url)}>Drop</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div >

      <div className="flex flex-col gap-4">
        <section className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-head">Softphone</h2>
            <div className="pill-status" style={{
              background: callState === 'connected' ? 'rgba(16,185,129,0.15)' : callState === 'connecting' || callState === 'ringing' ? 'rgba(245,158,11,0.15)' : 'var(--indigo-50)',
              color: callState === 'connected' ? 'var(--emerald-500)' : callState === 'connecting' || callState === 'ringing' ? '#d97706' : 'var(--primary)',
            }}>
              {callState === 'connected'
                ? `ON AIR • ${String(Math.floor(callTimer / 60)).padStart(2, '0')}:${String(callTimer % 60).padStart(2, '0')}`
                : callState === 'connecting' ? '⏳ DIALING...'
                  : callState === 'ringing' ? '🔔 RINGING...'
                    : registered ? '✅ REGISTERED' : 'STANDBY'}
            </div>
          </div>

          <div className="text-center py-4 mb-4" style={{
            background: callActive ? 'rgba(16,185,129,0.08)' : 'var(--slate-50)',
            borderRadius: '8px',
            border: callActive ? '1px solid rgba(16,185,129,0.2)' : '1px solid transparent',
            transition: 'all 0.3s ease'
          }}>
            <span className="stat-label">Line Status</span>
            <div className="stat-val" style={{
              fontSize: '1.25rem',
              marginTop: '4px',
              color: callState === 'connected' ? 'var(--emerald-500)' : callState === 'failed' ? '#dc2626' : 'inherit'
            }}>
              {lineStatusText()}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {/* Campaign dialing controls */}
            {!callActive && !currentLead && status !== 'Waiting for Lead...' && (
              <button className="btn btn-primary w-full" style={{ padding: '1rem' }} onClick={handleStartDialing}>
                START CAMPAIGN DIALING
              </button>
            )}
            {!callActive && status === 'Waiting for Lead...' && (
              <button className="btn w-full" style={{ background: 'var(--amber-500)', color: 'white' }} onClick={handlePause}>
                PAUSE DIALING
              </button>
            )}

            {/* END CALL button - always visible and active when call in progress */}
            {callActive && (
              <button
                className="btn w-full"
                style={{
                  background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
                  color: 'white',
                  padding: '1rem',
                  fontSize: '1rem',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  boxShadow: '0 4px 15px rgba(220,38,38,0.4)',
                  animation: callState === 'connected' ? 'pulse-red 2s infinite' : 'none',
                }}
                onClick={handleHangup}
              >
                📵 END CALL
              </button>
            )}

            {/* DTMF Keypad - Auto Display when connected */}
            {callState === 'connected' && (
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--slate-100)' }}>
                <span className="stat-label block mb-3 text-center">Dial Pad</span>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '8px',
                  maxWidth: '240px',
                  margin: '0 auto'
                }}>
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map(key => (
                    <button
                      key={key}
                      onClick={() => sendDTMF(key)}
                      className="btn"
                      style={{
                        background: 'var(--slate-50)',
                        border: '1px solid var(--slate-200)',
                        fontSize: '1.25rem',
                        fontWeight: 700,
                        padding: '12px 0',
                        borderRadius: '12px',
                        color: 'var(--brand-dark)',
                        transition: 'all 0.1s ease',
                      }}
                    >
                      {key}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Manual dial */}
            {!callActive && (
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  className="input-field"
                  placeholder="Manual: +1 (555) 000-0000"
                  value={dialNumber}
                  onChange={(e) => setDialNumber(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleManualInputDial()}
                />
                <button
                  className="btn btn-primary"
                  onClick={handleManualInputDial}
                  disabled={!dialNumber}
                >
                  Dial
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="card">
          <h2 className="font-head mb-4">Recent Activity</h2>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Lead</th>
                  <th>Time</th>
                  <th>Outcome</th>
                </tr>
              </thead>
              <tbody>
                {recentCalls.map((call, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{call.lead}</td>
                    <td className="text-soft">{call.time}</td>
                    <td><span className="pill-status pill-success" style={{ fontSize: '0.65rem' }}>{call.disposition}</span></td>
                  </tr>
                ))}
                {recentCalls.length === 0 && (
                  <tr>
                    <td colSpan="3" className="text-center py-4 text-soft">No calls in current session</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Lead Queue */}
      <section className="card full-width" style={{ gridColumn: '1 / -1' }}>
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="font-head">Lead Queue</h2>
            <p className="text-dim" style={{ fontSize: '0.85rem' }}>
              {autoDial
                ? <><span style={{ color: 'var(--brand-orange)', fontWeight: 700 }}>⚡ Auto Dialing</span> — {autoDialIndex + 1} of {autoDialLeadsRef.current.length} leads{autoDialCountdown !== null ? <span style={{ marginLeft: 8, color: '#ef4444', fontWeight: 700 }}>Next in {autoDialCountdown}s...</span> : null}</>
                : <>{leads.length} leads available • Click a lead to dial</>}
            </p>
          </div>
          <div className="flex gap-2 items-center">
            {/* Power Dialer Controls */}
            <button
              className="btn"
              style={{
                fontSize: '0.8rem', fontWeight: 700, padding: '0.5rem 1rem',
                background: autoDial ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'linear-gradient(135deg,#10b981,#059669)',
                color: 'white', border: 'none', borderRadius: 8,
                boxShadow: autoDial ? '0 4px 12px rgba(239,68,68,0.35)' : '0 4px 12px rgba(16,185,129,0.35)',
              }}
              onClick={toggleAutoDial}
              title={autoDial ? 'Pause auto-dialing' : 'Start power dialer — auto-advances on no-answer'}
            >
              {autoDial ? '⏸ Pause' : autoDialLeadsRef.current.length > 0 && leadSearch.toLowerCase() === lastSearchRef.current ? '▶️ Resume' : '⚡ Auto Dial'}
            </button>
            {autoDial && (
              <button
                className="btn"
                style={{ fontSize: '0.75rem', background: 'var(--slate-100)', fontWeight: 600 }}
                onClick={handleAutoSkip}
                title="Skip to next lead"
              >
                Skip →
              </button>
            )}
            <input
              className="input-field"
              style={{ width: '180px', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
              placeholder="Search name or phone..."
              value={leadSearch}
              onChange={e => setLeadSearch(e.target.value)}
              disabled={autoDial}
            />
            <button className="btn" style={{ fontSize: '0.75rem', background: 'var(--slate-100)' }} onClick={() => fetchLeads(agentId)} disabled={autoDial}>
              {leadsLoading ? 'Loading...' : 'Refresh'}
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
                      <td><span className="pill-status" style={{ fontSize: '0.65rem', background: 'var(--indigo-50)' }}>{lead.list?.name || 'Unknown'}</span></td>
                      <td className="text-dim">{lead.address || '—'}</td>
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
                  <td colSpan="6" className="text-center py-6 text-soft">
                    {leadsLoading ? 'Loading leads...' : leads.length === 0 ? 'No leads found. Upload a CSV from Admin panel.' : 'No leads match your search.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Pulsing red animation for active call */}
      <style>{`
        @keyframes pulse-red {
          0%, 100% { box-shadow: 0 4px 15px rgba(220,38,38,0.4); }
          50% { box-shadow: 0 4px 25px rgba(220,38,38,0.7); }
        }
      `}</style>
    </div >
  );
}

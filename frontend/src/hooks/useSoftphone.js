/**
 * useSoftphone - Telnyx WebRTC browser softphone (v2.25.x)
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { TelnyxRTC } from '@telnyx/webrtc';
import { API_URL } from '../config/env';

const API_BASE = API_URL.replace(/\/api$/, '');
const AUDIO_ELEMENT_ID = 'telnyx-remote-audio';

// ── AudioContext unlock ───────────────────────────────────────────────────────
// Browsers require a user gesture (click, keydown) to start audio.
// We pre-emptively resume the AudioContext on the very first interaction so that
// subsequent call audio (which fires inside SDK event handlers, not user gestures)
// is already allowed by the browser.
let _audioCtxUnlocked = false;
function unlockAudioContext() {
    if (_audioCtxUnlocked) return;
    _audioCtxUnlocked = true;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') {
        ctx.resume().then(() => console.log('[Softphone] AudioContext unlocked ✅'));
    }
    // Also play a silent buffer to fully satisfy Safari's autoplay policy
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
}

// Create and inject the hidden audio element into the DOM immediately
// (must exist before TelnyxRTC constructor is called with remoteElement)
function ensureAudioElement() {
    if (!document.getElementById(AUDIO_ELEMENT_ID)) {
        const el = document.createElement('audio');
        el.id = AUDIO_ELEMENT_ID;
        el.autoplay = true;
        el.setAttribute('playsinline', '');
        el.style.display = 'none';
        document.body.appendChild(el);
        console.log('[Softphone] Created DOM audio element #' + AUDIO_ELEMENT_ID);
    }
    return document.getElementById(AUDIO_ELEMENT_ID);
}

// Attach AudioContext unlock to first user gesture globally
// NOTE: This is called inside the hook's useEffect, NOT at module level,
// to avoid Vite bundler Temporal Dead Zone (TDZ) initialization crashes.
function attachAudioUnlock() {
    if (typeof window === 'undefined') return;
    const _unlock = () => { unlockAudioContext(); };
    window.addEventListener('click', _unlock, { once: true, capture: true });
    window.addEventListener('keydown', _unlock, { once: true, capture: true });
    window.addEventListener('touchstart', _unlock, { once: true, capture: true });
}

export const useSoftphone = (config) => {
    const [callState, setCallState] = useState('disconnected');
    const [registered, setRegistered] = useState(false);
    const [lastError, setLastError] = useState(null);
    const [speakerDevices, setSpeakerDevices] = useState([]);
    const [speakerDeviceId, setSpeakerDeviceIdState] = useState(() => {
        try { return localStorage.getItem('voxiq_speaker_device_id') || 'default'; } catch { return 'default'; }
    });
    const [speakerError, setSpeakerError] = useState(null);
    const speakerSupported = typeof HTMLMediaElement !== 'undefined'
        && typeof HTMLMediaElement.prototype?.setSinkId === 'function';
    // sipCause: human-readable SIP rejection reason (e.g. "CALL_REJECTED", "UNALLOCATED_NUMBER")
    const [sipCause, setSipCause] = useState(null);
    const [callControlId, setCallControlId] = useState(null);
    // callOutcome: tracks WHY a call ended — 'invalid' | 'no_answer' | 'answered' | null
    const [callOutcome, setCallOutcome] = useState(null);
    // inbound call state
    const [incomingCall, setIncomingCall] = useState(null);
    const [incomingCallInfo, setIncomingCallInfo] = useState(null);
    const incomingCallRef = useRef(null);

    const clientRef = useRef(null);
    const registeredRef = useRef(false);
    const activeCallRef = useRef(null);
    const activeCallLogIdRef = useRef(null);
    const callControlIdRef = useRef(null);
    const recentlyFinishedCallIdsRef = useRef(new Set());
    const micStreamRef = useRef(null);
    const recorderRef = useRef(null);
    const recordingChunksRef = useRef([]);
    const recordingContextRef = useRef(null);
    const recordingDestinationRef = useRef(null);
    const recordingSourcesRef = useRef([]);
    const recordingUploadPromiseRef = useRef(Promise.resolve());
    const recordingCallIdRef = useRef(null);
    // Track which state the call reached before hangup
    const callReachedRingingRef = useRef(false);
    const callReachedActiveRef = useRef(false);
    // Guard against hangup + destroy double-fire for the same call
    const lastProcessedCallIdRef = useRef(null);
    // Timestamp when registration completed — used to enforce a post-registration
    // stabilization window before allowing calls (Telnyx WS session needs ~1-2s to fully initialize)
    const registeredAtRef = useRef(0);
    const webRtcProgressTimeoutRef = useRef(null);
    const fallbackInFlightRef = useRef(false);
    const manualHangupRef = useRef(false);
    const activeDialRequestRef = useRef(null);
    const backendStatusPollRef = useRef(null);

    // Attach AudioContext unlock on first mount (safe: runs after React init)
    useEffect(() => {
        attachAudioUnlock();
    }, []);

    const loadSpeakerDevices = useCallback(async () => {
        try {
            if (!navigator.mediaDevices?.enumerateDevices) {
                setSpeakerDevices([]);
                return [];
            }
            const devices = await navigator.mediaDevices.enumerateDevices();
            const outputs = devices
                .filter((device) => device.kind === 'audiooutput')
                .map((device, index) => ({
                    deviceId: device.deviceId || `audio-output-${index}`,
                    label: device.label || (index === 0 ? 'Default Speaker' : `Speaker ${index + 1}`),
                }));
            setSpeakerDevices(outputs);
            return outputs;
        } catch (err) {
            console.warn('[Softphone] Failed to enumerate speaker devices:', err);
            setSpeakerDevices([]);
            return [];
        }
    }, []);

    const applySpeakerDevice = useCallback(async (nextDeviceId) => {
        const audioEl = ensureAudioElement();
        if (!audioEl) return false;
        if (!speakerSupported || typeof audioEl.setSinkId !== 'function') {
            setSpeakerError('Speaker selection is not supported in this browser.');
            return false;
        }

        try {
            await audioEl.setSinkId(nextDeviceId || 'default');
            setSpeakerDeviceIdState(nextDeviceId || 'default');
            setSpeakerError(null);
            try { localStorage.setItem('voxiq_speaker_device_id', nextDeviceId || 'default'); } catch { }
            console.log('[Softphone] Speaker output set to:', nextDeviceId || 'default');
            return true;
        } catch (err) {
            console.error('[Softphone] Failed to set speaker output:', err);
            setSpeakerError(err?.message || 'Unable to switch speaker output.');
            return false;
        }
    }, [speakerSupported]);

    useEffect(() => {
        loadSpeakerDevices();
        const refresh = () => { loadSpeakerDevices(); };
        navigator.mediaDevices?.addEventListener?.('devicechange', refresh);
        return () => navigator.mediaDevices?.removeEventListener?.('devicechange', refresh);
    }, [loadSpeakerDevices]);

    useEffect(() => {
        ensureAudioElement();
        applySpeakerDevice(speakerDeviceId);
    }, [applySpeakerDevice, speakerDeviceId]);

    useEffect(() => { callControlIdRef.current = callControlId; }, [callControlId]);
    useEffect(() => { registeredRef.current = registered; }, [registered]);

    const cleanupRecordingGraph = useCallback(() => {
        recordingSourcesRef.current.forEach((source) => {
            try { source.disconnect(); } catch (_) { }
        });
        recordingSourcesRef.current = [];
        if (recordingDestinationRef.current) {
            try { recordingDestinationRef.current.disconnect?.(); } catch (_) { }
        }
        recordingDestinationRef.current = null;
        if (recordingContextRef.current) {
            try { recordingContextRef.current.close(); } catch (_) { }
        }
        recordingContextRef.current = null;
    }, []);

    const stopMicCapture = useCallback(() => {
        if (micStreamRef.current) {
            micStreamRef.current.getTracks().forEach((track) => {
                try { track.stop(); } catch (_) { }
            });
            micStreamRef.current = null;
        }
    }, []);

    const uploadCustomRecording = useCallback(async (blob, callLogId) => {
        if (!callLogId || !blob || blob.size === 0) return;

        const formData = new FormData();
        formData.append('callLogId', callLogId);
        formData.append('file', blob, `call-${callLogId}.webm`);

        try {
            const res = await fetch(`${API_BASE}/api/voip/custom-recording`, {
                method: 'POST',
                body: formData,
            });
            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || `Upload failed (${res.status})`);
            }
        } catch (err) {
            console.error('[Softphone] Custom recording upload failed:', err);
        }
    }, []);

    const stopCustomRecording = useCallback(() => {
        const recorder = recorderRef.current;
        if (!recorder) {
            cleanupRecordingGraph();
            stopMicCapture();
            return recordingUploadPromiseRef.current;
        }

        if (recorder.state === 'inactive') {
            recorderRef.current = null;
            cleanupRecordingGraph();
            stopMicCapture();
            return recordingUploadPromiseRef.current;
        }

        recorder.stop();
        recorderRef.current = null;
        return recordingUploadPromiseRef.current;
    }, [cleanupRecordingGraph, stopMicCapture]);

    const startCustomRecording = useCallback((remoteStream, callId) => {
        const localStream = micStreamRef.current;
        const callLogId = activeCallLogIdRef.current;

        if (!callId || !callLogId || !remoteStream || !localStream) return false;
        if (recorderRef.current && recorderRef.current.state !== 'inactive') return true;
        if (recordingCallIdRef.current === callId) return true;

        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx || typeof MediaRecorder === 'undefined') return false;

            const audioContext = new AudioCtx();
            
            // CRITICAL: Explicitly resume the context. Since this is NOT a direct user gesture,
            // standard browser policy might keep it 'suspended'.
            if (audioContext.state === 'suspended') {
                audioContext.resume().then(() => console.log('[Softphone] Custom recorder AudioContext resumed ✅'));
            }

            const destination = audioContext.createMediaStreamDestination();
            const remoteSource = audioContext.createMediaStreamSource(remoteStream);
            const localSource = audioContext.createMediaStreamSource(localStream);

            remoteSource.connect(destination);
            localSource.connect(destination);

            const mimeType = MediaRecorder.isTypeSupported?.('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : (MediaRecorder.isTypeSupported?.('audio/webm') ? 'audio/webm' : '');
            
            console.log('[Softphone] Initializing MediaRecorder with mimeType:', mimeType || 'default');
            
            const recorder = mimeType
                ? new MediaRecorder(destination.stream, { mimeType })
                : new MediaRecorder(destination.stream);

            recordingContextRef.current = audioContext;
            recordingDestinationRef.current = destination;
            recordingSourcesRef.current = [remoteSource, localSource];
            recordingChunksRef.current = [];
            recordingCallIdRef.current = callId;
            recorderRef.current = recorder;

            recorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    recordingChunksRef.current.push(event.data);
                }
            };

            recorder.onerror = (err) => {
                console.error('[Softphone] MediaRecorder error:', err);
            };

            recorder.onstop = () => {
                console.log('[Softphone] Custom recorder stopped. Finalizing blob...');
                const chunks = recordingChunksRef.current;
                const blob = chunks.length > 0 ? new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }) : null;
                recordingChunksRef.current = [];
                recordingCallIdRef.current = null;

                recordingUploadPromiseRef.current = (async () => {
                    if (blob && blob.size > 0) {
                        console.log(`[Softphone] Uploading recording (${Math.round(blob.size / 1024)} KB) for callLog: ${callLogId}`);
                        await uploadCustomRecording(blob, callLogId);
                    } else {
                        console.warn('[Softphone] No audio data captured, skipping upload.');
                    }
                    cleanupRecordingGraph();
                    stopMicCapture();
                })();
            };

            // Use a single finalized chunk instead of time-sliced chunks.
            // This produces more browser-friendly WebM metadata for playback.
            recorder.start();
            console.log('[Softphone] Custom recorder started for callLog:', callLogId);
            return true;
        } catch (err) {
            console.error('[Softphone] Failed to start custom recorder:', err);
            cleanupRecordingGraph();
            return false;
        }
    }, [cleanupRecordingGraph, stopMicCapture, uploadCustomRecording]);

    const ensureRecordingStarted = useCallback((call, attempt = 0) => {
        if (!call || recordingCallIdRef.current === call.id) return;

        const audioEl = document.getElementById(AUDIO_ELEMENT_ID);
        const remoteStream = call.remoteStream || (audioEl?.srcObject instanceof MediaStream ? audioEl.srcObject : null);
        if (remoteStream && startCustomRecording(remoteStream, call.id)) return;

        if (attempt < 8) {
            setTimeout(() => ensureRecordingStarted(call, attempt + 1), 300);
        }
    }, [startCustomRecording]);

    const rememberFinishedCallId = useCallback((id) => {
        if (!id) return;
        recentlyFinishedCallIdsRef.current.add(id);
        setTimeout(() => recentlyFinishedCallIdsRef.current.delete(id), 30000);
    }, []);

    const clearWebRtcProgressTimeout = useCallback(() => {
        if (webRtcProgressTimeoutRef.current) {
            clearTimeout(webRtcProgressTimeoutRef.current);
            webRtcProgressTimeoutRef.current = null;
        }
    }, []);

    const clearBackendStatusPoll = useCallback(() => {
        if (backendStatusPollRef.current) {
            clearInterval(backendStatusPollRef.current);
            backendStatusPollRef.current = null;
        }
    }, []);

    // ── Init TelnyxRTC ───────────────────────────────────────────────────────
    useEffect(() => {
        const login = config?.login || config?.username;
        const password = config?.password;
        if (!login || !password) return;

        // Ensure audio element exists in DOM BEFORE creating client
        ensureAudioElement();
        console.log('[Softphone] Connecting as:', login);

        const client = new TelnyxRTC({
            login,
            password,
            // Pass element ID so SDK auto-attaches remote audio stream
            remoteElement: AUDIO_ELEMENT_ID,
        });

        client.on('telnyx.ready', () => {
            console.log('[Softphone] ✅ Registered');
            setRegistered(true);
            registeredRef.current = true;
            registeredAtRef.current = Date.now(); // Record when we registered
        });

        client.on('telnyx.error', (err) => {
            console.error('[Softphone] ❌ Error:', err);
            setRegistered(false);
            registeredRef.current = false;
        });

        client.on('telnyx.notification', (notification) => {
            const { call } = notification;
            if (!call) return;

            console.log(`[Softphone] ${notification.type} → ${call.state}`, {
                remoteStream: call.remoteStream,
                hasStream: !!(call.remoteStream),
            });

            if (notification.type !== 'callUpdate') return;

            const telnyxCallControlId =
                call?.telnyxIDs?.telnyxCallControlId ||
                call?.options?.telnyxCallControlId ||
                call?.telnyxCallControlId ||
                null;

            // Link the DB CallLog to the real Telnyx call_control_id, not the SDK-local call.id.
            if (telnyxCallControlId && activeCallLogIdRef.current) {
                const logId = activeCallLogIdRef.current;
                const linkKey = `${telnyxCallControlId}:${logId}`;
                // Only send update ONCE per unique (callId+logId) pair to prevent 500 from concurrent PATCH
                if (!linkedControlIds.current.has(linkKey)) {
                    linkedControlIds.current.add(linkKey);
                    setCallControlId(telnyxCallControlId);
                    callControlIdRef.current = telnyxCallControlId;
                    console.log('[Softphone] Linking Telnyx call_control_id to CallLog:', telnyxCallControlId, logId);
                    fetch(`${API_BASE}/api/dialer/call/log/${logId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ callControlId: telnyxCallControlId }),
                    }).catch(err => console.error('[Softphone] Link failed:', err));
                }
            }

            switch (call.state) {
                case 'ringing': {
                    console.log('[Softphone] ringing — direction:', call.direction, 'remoteCallerNumber:', call.options?.remoteCallerNumber);
                    // Inbound: SDK sets direction='inbound' OR remoteCallerNumber is present at ringing
                    // (outbound calls never have remoteCallerNumber at ringing stage)
                    const isInbound = call.direction === 'inbound'
                        || !!call.options?.remoteCallerNumber;
                    if (isInbound) {
                        const from = call.options?.remoteCallerNumber || call.from || call.callerNumber || 'Unknown';
                        const callerName = call.options?.remoteCallerName || call.callerName || from;
                        console.log(`[Softphone] ✅ Incoming call from: ${from} (${callerName})`);
                        incomingCallRef.current = call;
                        setIncomingCall(call);
                        setIncomingCallInfo({ from, callerName });
                    }
                    break;
                }

                case 'new': {
                    // New call started — reset dedup guard so fresh call isn't
                    // misidentified as a duplicate of the previous call
                    lastProcessedCallIdRef.current = null;
                    activeCallRef.current = call;
                    isDialingRef.current = false; // Release mutex
                    setSipCause(null); // Clear previous failure reason
                    break;
                }

                case 'requesting':
                case 'trying':
                    // 'trying' is a LOCAL SDK state — Telnyx hasn't confirmed the call yet.
                    // Stay in 'connecting' so the UI shows "DIALING..." not "RINGING..."
                    setCallState('connecting');
                    break;

                case 'early': {
                    // 'early' = SIP 180/183 from the remote carrier — phone is actually ringing
                    clearWebRtcProgressTimeout();
                    setCallState('ringing');
                    callReachedRingingRef.current = true;
                    ensureRecordingStarted(call);
                    // Attach remote stream so agent hears ringback tone (tring tring)
                    const earlyAudioEl = document.getElementById(AUDIO_ELEMENT_ID);
                    if (earlyAudioEl && call.remoteStream) {
                        earlyAudioEl.srcObject = call.remoteStream;
                        earlyAudioEl.play().catch(() => {});
                    }
                    break;
                }

                case 'active': {
                    clearWebRtcProgressTimeout();
                    const isInbound = call.direction === 'inbound' || !!call.options?.remoteCallerNumber;
                    if (isInbound) {
                        setCallState('connected');
                        callReachedActiveRef.current = true;
                    } else {
                        // For outbound PSTN calls, SDK "active" can happen before we receive the
                        // definitive Telnyx webhook for the bridged/answered customer leg.
                        // Keep the UI in ringing until the backend confirms the actual answer.
                        setCallState(prev => (prev === 'connected' ? prev : 'ringing'));
                    }
                    // Belt + suspenders: try to manually attach stream in case SDK didn't
                    const audioEl = document.getElementById(AUDIO_ELEMENT_ID);
                    if (audioEl) {
                        if (call.remoteStream) {
                            console.log('[Softphone] Attaching remoteStream to audio element');
                            audioEl.srcObject = call.remoteStream;
                            audioEl.play()
                                .then(() => console.log('[Softphone] Audio playing ✅'))
                                .catch(e => console.error('[Softphone] Audio play error:', e));
                        } else {
                            // Try via internal peer connection as fallback
                            console.warn('[Softphone] call.remoteStream is', call.remoteStream, '— trying via peer');
                            try {
                                const pc = call.peer?.instance || call.peer;
                                if (pc) {
                                    // Watch for tracks immediately and in the future
                                    pc.ontrack = (ev) => {
                                        if (ev.streams?.[0]) {
                                            console.log('[Softphone] Got stream via ontrack');
                                            audioEl.srcObject = ev.streams[0];
                                            audioEl.play().catch(() => { });
                                        }
                                    };
                                    // Existing tracks polling
                                    const bindTracks = () => {
                                        const receivers = pc.getReceivers?.() || [];
                                        const tracks = receivers.map(r => r.track).filter(Boolean);
                                        if (tracks.length && !audioEl.srcObject) {
                                            const stream = new MediaStream(tracks);
                                            console.log('[Softphone] Got stream via getReceivers');
                                            audioEl.srcObject = stream;
                                            audioEl.play().catch(() => { });
                                        }
                                    };
                                    bindTracks();
                                    setTimeout(bindTracks, 500);
                                    setTimeout(bindTracks, 1000);
                                    setTimeout(bindTracks, 2000);
                                }
                            } catch (e) {
                                console.error('[Softphone] Peer fallback error:', e);
                            }
                        }
                    }
                    ensureRecordingStarted(call);
                    break;
                }

                case 'hangup':
                case 'destroy': {
                    // Clear incoming call banner if the rejected/missed call ended
                    if (incomingCallRef.current?.id === call.id) {
                        incomingCallRef.current = null;
                        setIncomingCall(null);
                        setIncomingCallInfo(null);
                    }

                    // ── Dedup guard ─────────────────────────────────────────
                    // Both 'hangup' AND 'destroy' fire for the same call.
                    // We only process the FIRST one; the second is ignored.
                    if (call && call.id) {
                        // Ignore events for OLD calls (force-hung-up before new dial)
                        if (activeCallRef.current && activeCallRef.current.id !== call.id) {
                            console.log(`[Softphone] Ignoring ${call.state} for old call ID: ${call.id}`);
                            break;
                        }
                        // Ignore duplicate hangup/destroy for SAME call
                        if (lastProcessedCallIdRef.current === call.id) {
                            console.log(`[Softphone] Ignoring duplicate ${call.state} for already-processed call: ${call.id}`);
                            break;
                        }
                        lastProcessedCallIdRef.current = call.id;
                    }

                    // Capture SIP cause for diagnostics (SDK exposes cause + causeCode on call object)
                    const cause = call?.cause || call?.causeCode || null;
                    if (cause) {
                        setSipCause(String(cause));
                        console.warn(`[Softphone] SIP cause: ${cause}`);
                    }

                    // Determine call outcome before resetting state
                    const shouldFallbackToBackend =
                        !manualHangupRef.current &&
                        !fallbackInFlightRef.current &&
                        !callReachedRingingRef.current &&
                        !callReachedActiveRef.current &&
                        !!activeDialRequestRef.current;
                    const outcome = callReachedActiveRef.current
                        ? 'answered'
                        : callReachedRingingRef.current
                            ? 'no_answer'
                            : 'invalid';
                    setCallOutcome(outcome);
                    console.log(`[Softphone] Call ended — outcome: ${outcome}`);
                    // Reset reach tracking for next call
                    callReachedRingingRef.current = false;
                    callReachedActiveRef.current = false;
                    clearWebRtcProgressTimeout();
                    rememberFinishedCallId(activeCallLogIdRef.current);
                    rememberFinishedCallId(callControlIdRef.current);
                    rememberFinishedCallId(call?.id);
                    setCallState('disconnected');
                    setLastError(cause === 'CALL_REJECTED' ? 'rejected' : null);
                    stopCustomRecording();
                    activeCallRef.current = null;
                    const finishedLogId = activeCallLogIdRef.current;
                    const finishedCtrlId = callControlIdRef.current;
                    setTimeout(() => {
                        if (activeCallLogIdRef.current === finishedLogId) {
                            activeCallLogIdRef.current = null;
                        }
                        if (callControlIdRef.current === finishedCtrlId) {
                            callControlIdRef.current = null;
                            setCallControlId(null);
                        }
                    }, 30000);
                    const audioEl = document.getElementById(AUDIO_ELEMENT_ID);
                    if (audioEl) audioEl.srcObject = null;
                    if (shouldFallbackToBackend) {
                        setTimeout(() => {
                            startBackendFallbackDial('webrtc_hangup_before_progress');
                        }, 0);
                    }
                    manualHangupRef.current = false;
                    break;
                }
                default:
                    break;
            }
        });

        client.connect();
        clientRef.current = client;

        return () => {
            clearBackendStatusPoll();
            stopCustomRecording();
            stopMicCapture();
            try { client.disconnect(); } catch (_) { }
            clientRef.current = null;
            setRegistered(false);
            registeredRef.current = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clearBackendStatusPoll, config?.login, config?.username, config?.password, clearWebRtcProgressTimeout, ensureRecordingStarted, stopCustomRecording, stopMicCapture]);

    // ── makeCall ─────────────────────────────────────────────────────────────
    const isDialingRef = useRef(false); // Mutex: prevent concurrent newCall() invocations
    const linkedControlIds = useRef(new Set()); // Track already-linked controlIds to skip duplicate PATCH

    const startBackendFallbackDial = useCallback(async (reason = 'webrtc_failed') => {
        const request = activeDialRequestRef.current;
        if (!request || fallbackInFlightRef.current) return null;

        fallbackInFlightRef.current = true;
        clearWebRtcProgressTimeout();
        clearBackendStatusPoll();
        isDialingRef.current = false;

        if (activeCallRef.current) {
            try { activeCallRef.current.hangup(); } catch (_) { }
            activeCallRef.current = null;
        }

        stopMicCapture();
        console.warn(`[Softphone] Falling back to backend dial (${reason}) for ${request.to}`);

        try {
            const res = await fetch(`${API_BASE}/api/dialer/call/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: request.to,
                    from: request.from,
                    callerName: request.callerName,
                    leadId: request.leadId,
                    callLogId: request.callLogId,
                }),
            });

            if (!res.ok) {
                throw new Error(`Backend dial failed (${res.status})`);
            }

            const data = await res.json();
            if (data?.error) {
                throw new Error(data.message || data.error);
            }

            if (data.callLogId || request.callLogId) {
                activeCallLogIdRef.current = data.callLogId || request.callLogId;
            }
            setCallControlId(data.callId);
            callControlIdRef.current = data.callId;
            setLastError(null);
            setSipCause(null);
            setCallOutcome(null);
            setCallState('ringing');

            let pollAttempts = 0;
            backendStatusPollRef.current = setInterval(async () => {
                pollAttempts += 1;
                const currentCallId = callControlIdRef.current;
                if (!currentCallId || currentCallId !== data.callId) {
                    clearBackendStatusPoll();
                    return;
                }

                try {
                    const statusRes = await fetch(`${API_BASE}/api/dialer/call/${currentCallId}/status`);
                    if (!statusRes.ok) return;
                    const statusData = await statusRes.json();
                    const remoteStatus = String(statusData?.status || '').toLowerCase();
                    if (!remoteStatus) return;

                    if (['active', 'bridged', 'answered', 'answering'].includes(remoteStatus)) {
                        clearBackendStatusPoll();
                        callReachedActiveRef.current = true;
                        setLastError(null);
                        setCallState('connected');
                        return;
                    }

                    if (['hangup', 'ended', 'completed', 'finished'].includes(remoteStatus)) {
                        clearBackendStatusPoll();
                        setCallState('disconnected');
                        return;
                    }
                } catch (_) {
                    // Let websocket or next poll settle the state.
                }

                if (pollAttempts >= 15) {
                    clearBackendStatusPoll();
                }
            }, 3000);

            setTimeout(() => {
                if (callControlIdRef.current === data.callId) {
                    clearBackendStatusPoll();
                    setCallState('disconnected');
                    setCallControlId(null);
                    callControlIdRef.current = null;
                }
            }, 30000);

            return { callId: data.callId, callLogId: data.callLogId || request.callLogId || null };
        } catch (err) {
            console.error('[Softphone] Backend fallback dial failed:', err);
            setLastError('error');
            setCallOutcome('invalid');
            setCallState('failed');
            return null;
        } finally {
            fallbackInFlightRef.current = false;
        }
    }, [clearBackendStatusPoll, clearWebRtcProgressTimeout, stopMicCapture]);

    const makeCall = useCallback(async (target, leadId, callLogId) => {
        // ── AudioContext unlock ───────────────────────────────────────────────
        // makeCall is always triggered by a user gesture (button click).
        // IMPORTANT: Do NOT use 'await' here — browsers expire the user-gesture
        // activation context after the first await in an async function. We must
        // create + resume AudioContext synchronously to stay inside the gesture window.
        try {
            const warmCtx = new (window.AudioContext || window.webkitAudioContext)();
            warmCtx.resume().then(() => warmCtx.close()).catch(() => { });
        } catch (_) { /* ignore */ }

        const digits = (target || '').replace(/\D/g, '');
        if (digits.length < 7) {
            setLastError('invalid_number');
            setCallOutcome('invalid'); // Let auto-advance effect handle next lead
            setCallState('failed');
            return null;
        }

        // ── MUTEX GUARD ───────────────────────────────────────────────────────
        // Prevent starting a new call while one is already being set up.
        // This was causing multiple simultaneous WebRTC calls from rapid auto-dial.
        if (isDialingRef.current) {
            console.warn('[Softphone] makeCall blocked — already dialing. Ignoring duplicate request.');
            return null;
        }
        isDialingRef.current = true;
        manualHangupRef.current = false;
        fallbackInFlightRef.current = false;
        clearWebRtcProgressTimeout();
        // ─────────────────────────────────────────────────────────────────────

        // Force hangup any existing active call before starting a new one
        if (activeCallRef.current) {
            console.log('[Softphone] Force-hanging up existing active call before new dial');
            try { activeCallRef.current.hangup(); } catch (_) { }
            activeCallRef.current = null;
            // Brief pause to let SDK clean up
            await new Promise(r => setTimeout(r, 300));
        }

        // ── Post-registration stabilization cooldown ──────────────────────────
        // The Telnyx WebSocket session needs ~1.5s after registration to fully
        // stabilize. If we dial too quickly, the first call gets an immediate  
        // SDK-level hangup with 'CALL DOES NOT EXIST' before even reaching ringing.
        const msSinceRegistered = Date.now() - registeredAtRef.current;
        if (msSinceRegistered < 2500) {
            const waitMs = 2500 - msSinceRegistered;
            console.log(`[Softphone] Waiting ${waitMs}ms for WebSocket stabilization before first call...`);
            await new Promise(r => setTimeout(r, waitMs));
        }
        setLastError(null);
        setSipCause(null); // Clear previous SIP error reason
        setCallState('connecting');
        setCallOutcome(null); // ← CRITICAL: Reset outcome so previous call's result doesn't interfere
        callReachedRingingRef.current = false;  // ← Reset for THIS call
        callReachedActiveRef.current = false;   // ← Reset for THIS call
        linkedControlIds.current.clear(); // Reset for each new call

        if (callLogId) {
            activeCallLogIdRef.current = callLogId;
        }

        if (clientRef.current && registeredRef.current) {
            try {
                // Force browser to request microphone right before dialing!
                // This guarantees the mic is active and bypasses strict autoplay blocks for incoming audio.
                try {
                    micStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
                    loadSpeakerDevices();
                } catch (micErr) {
                    console.error('[Softphone] Microphone access denied/failed:', micErr);
                    const micErrorName = micErr?.name || '';
                    const micBlocked =
                        micErrorName === 'NotAllowedError' ||
                        micErrorName === 'PermissionDeniedError' ||
                        micErrorName === 'NotFoundError' ||
                        micErrorName === 'NotReadableError' ||
                        micErrorName === 'NotSupportedError';
                    alert('Error: Microphone access is required to place WebRTC calls. Please allow mic access and confirm a working input device is selected.');
                    setLastError(micBlocked ? 'mic_permission' : 'error');
                    setCallOutcome('invalid');
                    setCallState('failed');
                    stopMicCapture();
                    isDialingRef.current = false;
                    return null;
                }

                const original = (target || '').trim();
                let to;
                if (original.startsWith('+')) {
                    // Explicit + prefix — already E.164
                    to = '+' + digits;
                } else if (digits.startsWith('0092')) {
                    // 0092... international dialing prefix → strip 00
                    to = '+' + digits.slice(2);
                } else if (digits.startsWith('92') && digits.length >= 12) {
                    // Pakistan country code without + (923XXXXXXXXX)
                    to = '+' + digits;
                } else if (digits.length === 11 && digits.startsWith('0')) {
                    // Any Pakistan number with leading 0: mobiles (03XX) and landlines (021, 042, 051...)
                    to = '+92' + digits.slice(1);
                } else if (digits.length === 10 && digits.startsWith('3')) {
                    // Pakistan mobile without leading 0: 3XXXXXXXXX
                    to = '+92' + digits;
                } else if (digits.length === 10) {
                    to = '+1' + digits;
                } else if (digits.length === 11 && digits.startsWith('1')) {
                    to = '+' + digits;
                } else {
                    to = '+' + digits;
                }

                const from = config?.callerNumber || '+14422039259';
                const callerName = config?.callerName || '';
                activeDialRequestRef.current = { to, from, callerName, leadId, callLogId };
                console.log('[Softphone] WebRTC newCall:', to, 'logId:', callLogId);
                const call = clientRef.current.newCall({
                    destinationNumber: to,
                    callerNumber: from,
                    callerName,
                    clientState: callLogId,
                    // Pass explicitly to SDK call options as well to force audio routing
                    audio: true,
                    video: false,
                    remoteElement: AUDIO_ELEMENT_ID,
                    localElement: 'telnyx-local-video', // Stub to avoid video routing bugs
                });
                activeCallRef.current = call;
                setCallState('connecting'); // Stay "DIALING..." until server confirms via 'early'/'active'
                webRtcProgressTimeoutRef.current = setTimeout(() => {
                    const currentCall = activeCallRef.current;
                    if (!currentCall || fallbackInFlightRef.current || manualHangupRef.current) return;
                    if (callReachedRingingRef.current || callReachedActiveRef.current) return;
                    console.warn('[Softphone] WebRTC progress timeout reached. Switching to backend dial fallback.');
                    startBackendFallbackDial('webrtc_progress_timeout');
                }, 20000);
                isDialingRef.current = false; // Release mutex after call is set up
                return { callId: null, callLogId: callLogId || null };
            } catch (err) {
                console.error('[Softphone] newCall error, falling back:', err);
                stopMicCapture();
                isDialingRef.current = false;
            }
        } else {
            stopMicCapture();
            isDialingRef.current = false;
        }

        console.log('[Softphone] WebRTC not available or failed, falling back to backend dial');
        return startBackendFallbackDial('webrtc_unavailable');
    }, [clearWebRtcProgressTimeout, config?.callerName, config?.callerNumber, startBackendFallbackDial]);

    const attachCall = useCallback((callLogId) => {
        console.log('[Softphone] Attaching campaign call, logId:', callLogId);
        activeCallLogIdRef.current = callLogId;
        setLastError(null);
        setCallState('ringing');
        // Capture mic early for campaign calls (makeCall is not used, so getUserMedia never fires)
        if (!micStreamRef.current) {
            navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false })
                .then(stream => { micStreamRef.current = stream; })
                .catch(err => console.warn('[Softphone] attachCall mic capture failed:', err));
        }
    }, []);

    const hangup = useCallback(async () => {
        manualHangupRef.current = true;
        clearWebRtcProgressTimeout();
        clearBackendStatusPoll();
        if (activeCallRef.current) {
            try { activeCallRef.current.hangup(); } catch (e) { console.warn(e); }
            activeCallRef.current = null;
        }
        const cid = callControlIdRef.current;
        rememberFinishedCallId(activeCallLogIdRef.current);
        rememberFinishedCallId(cid);
        if (cid) {
            try {
                await fetch(`${API_BASE}/api/dialer/call/hangup`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ callId: cid }),
                });
            } catch (e) { console.warn(e); }
            setCallControlId(null); callControlIdRef.current = null;
        }
        activeCallLogIdRef.current = null;
        stopCustomRecording();
        setCallState('disconnected');
        const audioEl = document.getElementById(AUDIO_ELEMENT_ID);
        if (audioEl) audioEl.srcObject = null;
    }, [clearBackendStatusPoll, clearWebRtcProgressTimeout, stopCustomRecording, rememberFinishedCallId]);

    const answerCall = useCallback(async () => {
        const call = incomingCallRef.current;
        if (!call) return;
        try {
            micStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
        } catch (e) {
            console.warn('[Softphone] Mic permission during answer:', e);
        }
        call.answer();
        activeCallRef.current = call;
        callReachedRingingRef.current = true;
        callReachedActiveRef.current = true;
        lastProcessedCallIdRef.current = null;
        incomingCallRef.current = null;
        setIncomingCall(null);
        setIncomingCallInfo(null);
        setCallState('connected');
        setLastError(null);
        setSipCause(null);
    }, []);

    const rejectCall = useCallback(() => {
        const call = incomingCallRef.current;
        if (!call) return;
        call.hangup();
        incomingCallRef.current = null;
        setIncomingCall(null);
        setIncomingCallInfo(null);
    }, []);

    const sendDTMF = useCallback((digit) => {
        if (activeCallRef.current) {
            console.log(`[Softphone] Sending DTMF: ${digit}`);
            try {
                activeCallRef.current.dtmf(digit);
            } catch (err) {
                console.error('[Softphone] Failed to send DTMF:', err);
            }
        }
    }, []);

    const handleWebSocketCallUpdate = useCallback((incomingLogId, status) => {
        console.log(`[Softphone] WS update: logId=${incomingLogId} status=${status}`);

        // STRICT match: for disconnect/hangup events, ONLY apply if the callLogId matches our active call.
        // This prevents dropped parallel-dial hangups or stale events from killing a live call.
        const activeLogId = activeCallLogIdRef.current;
        const activeCtrlId = callControlIdRef.current;

        const isOurCall =
            !incomingLogId || // No ID = broadcast to all (safe to apply)
            incomingLogId === activeLogId ||
            incomingLogId === activeCtrlId;
        const wasRecentlyFinished = incomingLogId && recentlyFinishedCallIdsRef.current.has(incomingLogId);

        if (status === 'connected') {
            // Only mark connected if it's our call or we have no active call tracked yet
            if (isOurCall || (!activeLogId && !activeCtrlId)) {
                clearBackendStatusPoll();
                clearWebRtcProgressTimeout();
                setCallState('connected');
                setLastError(null);
                callReachedActiveRef.current = true;
                if (activeCallRef.current) ensureRecordingStarted(activeCallRef.current);
            }
        } else if (status === 'completed' || status === 'hangup') {
            // CRITICAL: Only disconnect if this event is definitively about OUR call.
            // If incomingLogId doesn't match, this is a stale/parallel-dial hangup — ignore it!
            if (!isOurCall) {
                console.warn(`[Softphone] Ignoring hangup for ${incomingLogId} — active call is ${activeLogId}. Stale event dropped.`);
                return;
            }
            setCallState('disconnected');
            setCallControlId(null);
            callControlIdRef.current = null;
            clearBackendStatusPoll();
            stopCustomRecording();
            activeCallLogIdRef.current = null;
        }
    }, [clearBackendStatusPoll, clearWebRtcProgressTimeout, ensureRecordingStarted, stopCustomRecording]);

    return {
        registered,
        callState,
        lastError,
        sipCause,
        callOutcome,
        makeCall,
        attachCall,
        hangup,
        callControlId,
        handleWebSocketCallUpdate,
        sendDTMF,
        incomingCall,
        incomingCallInfo,
        answerCall,
        rejectCall,
        speakerDevices,
        speakerDeviceId,
        speakerSupported,
        speakerError,
        setSpeakerDevice: applySpeakerDevice,
        refreshSpeakerDevices: loadSpeakerDevices,
        ua: null,
        session: null,
    };
};

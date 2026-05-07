import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Telnyx from 'telnyx';

export interface CallOptions {
    to: string;
    from: string;
    callerName?: string;
    connectionId?: string;
    callControlAppId?: string;
    answeringMachineDetection?: 'detect' | 'detect_beep' | 'disabled';
    webhookUrl?: string;
    record?: 'none' | 'record-from-answer' | 'record-from-ringing';
    recordingChannels?: 'single' | 'dual';
}

export interface CallResult {
    callId: string;
    status: string;
    direction: string;
}

@Injectable()
export class VoipService {
    private readonly logger = new Logger(VoipService.name);
    private telnyx: Telnyx;
    private connectionId: string;
    private callControlAppId: string;
    private defaultWebhookUrl: string;

    constructor(private configService: ConfigService) {
        const apiKey = this.configService.get<string>('TELNYX_API_KEY');
        this.connectionId = this.configService.get<string>(
            'TELNYX_SIP_CONNECTION_ID',
        ) || '';
        this.callControlAppId = this.configService.get<string>('TELNYX_CALL_CONTROL_APP_ID') || '';
        this.defaultWebhookUrl =
            this.configService.get<string>('TELNYX_WEBHOOK_URL') ||
            `${this.configService.get<string>('PUBLIC_BASE_URL') || ''}/voip/telnyx/webhook`;

        if (!apiKey) {
            this.logger.warn(
                'TELNYX_API_KEY not configured. VoIP functionality will be disabled.',
            );
            return;
        }

        this.telnyx = new Telnyx(apiKey);
        this.logger.log('Telnyx VoIP service initialized');
    }

    /**
     * Initiate an outbound call (with failover retry)
     */
    async initiateCall(options: CallOptions): Promise<CallResult> {
        const apiKey = this.configService.get<string>('TELNYX_API_KEY');
        const primaryId = options.callControlAppId || options.connectionId || this.callControlAppId || this.connectionId;
        const fallbackId = this.configService.get<string>('TELNYX_FALLBACK_CONNECTION_ID');
        const connectionIds = [primaryId, fallbackId].filter(Boolean) as string[];

        let lastError: Error | null = null;
        for (const connectionId of connectionIds) {
            try {
                this.logger.log(`Initiating call to ${options.to} from ${options.from} via ${connectionId}`);
                const body: any = { to: options.to, from: options.from, connection_id: connectionId };
                if (options.callerName?.trim()) body.from_display_name = options.callerName.trim();
                if (options.webhookUrl) body.webhook_url = options.webhookUrl;
                if (options.answeringMachineDetection && options.answeringMachineDetection !== 'disabled') {
                    body.answering_machine_detection = options.answeringMachineDetection;
                }
                if (options.record && options.record !== 'none') {
                    body.record = options.record;
                    body.recording_channels = options.recordingChannels || 'single';
                }
                const response = await fetch('https://api.telnyx.com/v2/calls', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                });
                const json = await response.json() as any;
                if (!response.ok) {
                    const detail = json?.errors?.[0]?.detail || JSON.stringify(json);
                    throw new Error(`Telnyx ${response.status}: ${detail}`);
                }
                const data = json.data;
                this.logger.log(`Call initiated: ${data.call_control_id}`);
                return { callId: data.call_control_id, status: data.is_alive ? 'active' : 'initiating', direction: 'outbound' };
            } catch (error) {
                lastError = error;
                this.logger.warn(`Call attempt failed (${connectionId}): ${error.message}`);
                if (connectionIds.indexOf(connectionId) < connectionIds.length - 1) {
                    await new Promise(r => setTimeout(r, 1000)); // 1s delay before failover
                }
            }
        }
        this.logger.error(`All call attempts failed: ${lastError?.message}`);
        throw lastError;
    }

    /**
     * Send an SMS message
     */
    async sendSms(to: string, from: string, text: string): Promise<any> {
        try {
            this.logger.log(`Sending SMS to ${to} from ${from}`);
            const apiKey = this.configService.get<string>('TELNYX_API_KEY');

            // Format numbers to E.164 if they aren't already
            const formattedTo = to.startsWith('+') ? to : `+1${to.replace(/\D/g, '').slice(-10)}`;
            const formattedFrom = from.startsWith('+') ? from : `+1${from.replace(/\D/g, '').slice(-10)}`;

            const response = await fetch('https://api.telnyx.com/v2/messages', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    to: formattedTo,
                    from: formattedFrom,
                    text: text
                })
            });

            const json = await response.json() as any;

            if (!response.ok) {
                const detail = json?.errors?.[0]?.detail || JSON.stringify(json);
                throw new Error(detail);
            }

            return json.data;
        } catch (error) {
            this.logger.error(`Failed to send SMS: ${error.message}`);
            throw error;
        }
    }

    /**
     * Terminate an active call
     */
    async terminateCall(callId: string): Promise<void> {
        try {
            this.logger.log(`Terminating call: ${callId}`);
            await this.telnyx.calls.hangup(callId, {} as any);
            this.logger.log(`Call terminated: ${callId}`);
        } catch (error) {
            // Telnyx returns 422/404 when the call was already ended by the carrier.
            // This is expected behaviour for no-answer/rejected calls — don't throw 500.
            this.logger.warn(`Hangup skipped (call already ended): ${error.message}`);
        }
    }

    /**
     * Transfer call to an agent (SIP endpoint)
     */
    async transferCall(callId: string, sipUri: string): Promise<void> {
        try {
            this.logger.log(`Transferring call ${callId} to ${sipUri}`);
            await this.telnyx.calls.transfer(callId, {
                to: sipUri,
            } as any);
            this.logger.log(`Call transferred: ${callId}`);
        } catch (error) {
            this.logger.error(`Failed to transfer call: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Play audio file (for voicemail drop)
     */
    async playAudio(callId: string, audioUrl: string): Promise<void> {
        try {
            this.logger.log(`Playing audio on call ${callId}: ${audioUrl}`);
            await this.telnyx.calls.playbackStart(callId, {
                audio_url: audioUrl,
            } as any);
            this.logger.log(`Audio playback started: ${callId}`);
        } catch (error) {
            this.logger.error(`Failed to play audio: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Get call status
     */
    async getCallStatus(callId: string): Promise<any> {
        try {
            const call = await this.telnyx.calls.retrieve(callId);
            if (!call || !call.data) {
                throw new Error('Call not found');
            }
            return {
                callId: call.data.call_control_id,
                status: (call.data as any).state,
                direction: (call.data as any).direction,
                startTime: (call.data as any).start_time,
                answerTime: (call.data as any).answer_time,
            };
        } catch (error) {
            this.logger.error(`Failed to get call status: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Handle answering machine detection result
     */
    async handleAmdResult(
        callId: string,
        result: 'human' | 'machine',
    ): Promise<void> {
        this.logger.log(`AMD result for call ${callId}: ${result}`);
    }

    /**
     * Supervisor action: listen, whisper, or barge on a live call
     */
    async supervisorAction(
        callControlId: string,
        mode: 'listen' | 'whisper' | 'barge',
        supervisorCallControlId: string,
    ): Promise<{ success: boolean }> {
        const apiKey = this.configService.get<string>('TELNYX_API_KEY');
        // Telnyx Call Control: fork the call audio to supervisor
        const body = mode === 'listen'
            ? { type: 'rx', target: supervisorCallControlId }
            : mode === 'whisper'
                ? { type: 'tx', target: supervisorCallControlId }
                : { type: 'rxtx', target: supervisorCallControlId }; // barge = full duplex

        const res = await fetch(
            `https://api.telnyx.com/v2/calls/${callControlId}/actions/fork_start`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            },
        );

        if (!res.ok) {
            const err = await res.json();
            throw new Error(`Telnyx supervisor action failed: ${JSON.stringify(err)}`);
        }
        this.logger.log(`Supervisor ${mode} on ${callControlId}`);
        return { success: true };
    }
}

"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var VoipService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoipService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const telnyx_1 = __importDefault(require("telnyx"));
let VoipService = VoipService_1 = class VoipService {
    configService;
    logger = new common_1.Logger(VoipService_1.name);
    maxDialAttemptsPerConnection = 2;
    telnyx;
    connectionId;
    callControlAppId;
    defaultWebhookUrl;
    constructor(configService) {
        this.configService = configService;
        const apiKey = this.configService.get('TELNYX_API_KEY');
        this.connectionId = this.configService.get('TELNYX_SIP_CONNECTION_ID') || '';
        this.callControlAppId = this.configService.get('TELNYX_CALL_CONTROL_APP_ID') || '';
        this.defaultWebhookUrl =
            this.configService.get('TELNYX_WEBHOOK_URL') ||
                `${this.configService.get('PUBLIC_BASE_URL') || ''}/voip/telnyx/webhook`;
        if (!apiKey) {
            this.logger.warn('TELNYX_API_KEY not configured. VoIP functionality will be disabled.');
            return;
        }
        this.telnyx = new telnyx_1.default(apiKey);
        this.logger.log('Telnyx VoIP service initialized');
    }
    async initiateCall(options) {
        const apiKey = this.configService.get('TELNYX_API_KEY');
        const primaryId = options.callControlAppId || options.connectionId || this.callControlAppId || this.connectionId;
        const fallbackId = this.configService.get('TELNYX_FALLBACK_CONNECTION_ID');
        const connectionIds = [primaryId, fallbackId].filter(Boolean);
        let lastError = null;
        for (const connectionId of connectionIds) {
            for (let attempt = 1; attempt <= this.maxDialAttemptsPerConnection; attempt++) {
                try {
                    this.logger.log(`Initiating call to ${options.to} from ${options.from} via ${connectionId} (attempt ${attempt}/${this.maxDialAttemptsPerConnection})`);
                    const body = { to: options.to, from: options.from, connection_id: connectionId };
                    if (options.callerName?.trim())
                        body.from_display_name = options.callerName.trim();
                    if (options.webhookUrl)
                        body.webhook_url = options.webhookUrl;
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
                    const json = await response.json();
                    if (!response.ok) {
                        const detail = json?.errors?.[0]?.detail || JSON.stringify(json);
                        throw new Error(`Telnyx ${response.status}: ${detail}`);
                    }
                    const data = json.data;
                    this.logger.log(`Call initiated: ${data.call_control_id}`);
                    return { callId: data.call_control_id, status: data.is_alive ? 'active' : 'initiating', direction: 'outbound' };
                }
                catch (error) {
                    lastError = error;
                    const transient = this.isTransientDialError(error);
                    this.logger.warn(`Call attempt failed (${connectionId}, attempt ${attempt}): ${error.message}`);
                    if (!transient || attempt >= this.maxDialAttemptsPerConnection) {
                        break;
                    }
                    await new Promise(r => setTimeout(r, 750 * attempt));
                }
            }
            if (connectionIds.indexOf(connectionId) < connectionIds.length - 1) {
                await new Promise(r => setTimeout(r, 1000));
            }
        }
        this.logger.error(`All call attempts failed: ${lastError?.message}`);
        throw lastError;
    }
    isTransientDialError(error) {
        const message = String(error?.message || '').toLowerCase();
        return (message.includes('timeout') ||
            message.includes('temporar') ||
            message.includes('rate limit') ||
            message.includes('too many requests') ||
            message.includes('bad gateway') ||
            message.includes('gateway timeout') ||
            message.includes('service unavailable') ||
            message.includes('network') ||
            message.includes('fetch failed') ||
            message.includes('econnreset') ||
            message.includes('socket hang up') ||
            message.includes('telnyx 429') ||
            message.includes('telnyx 500') ||
            message.includes('telnyx 502') ||
            message.includes('telnyx 503') ||
            message.includes('telnyx 504'));
    }
    async sendSms(to, from, text) {
        try {
            this.logger.log(`Sending SMS to ${to} from ${from}`);
            const apiKey = this.configService.get('TELNYX_API_KEY');
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
            const json = await response.json();
            if (!response.ok) {
                const detail = json?.errors?.[0]?.detail || JSON.stringify(json);
                throw new Error(detail);
            }
            return json.data;
        }
        catch (error) {
            this.logger.error(`Failed to send SMS: ${error.message}`);
            throw error;
        }
    }
    async terminateCall(callId) {
        try {
            this.logger.log(`Terminating call: ${callId}`);
            await this.telnyx.calls.hangup(callId, {});
            this.logger.log(`Call terminated: ${callId}`);
        }
        catch (error) {
            this.logger.warn(`Hangup skipped (call already ended): ${error.message}`);
        }
    }
    async transferCall(callId, sipUri) {
        try {
            this.logger.log(`Transferring call ${callId} to ${sipUri}`);
            await this.telnyx.calls.transfer(callId, {
                to: sipUri,
            });
            this.logger.log(`Call transferred: ${callId}`);
        }
        catch (error) {
            this.logger.error(`Failed to transfer call: ${error.message}`, error.stack);
            throw error;
        }
    }
    async playAudio(callId, audioUrl) {
        try {
            this.logger.log(`Playing audio on call ${callId}: ${audioUrl}`);
            await this.telnyx.calls.playbackStart(callId, {
                audio_url: audioUrl,
            });
            this.logger.log(`Audio playback started: ${callId}`);
        }
        catch (error) {
            this.logger.error(`Failed to play audio: ${error.message}`, error.stack);
            throw error;
        }
    }
    async getCallStatus(callId) {
        try {
            const call = await this.telnyx.calls.retrieve(callId);
            if (!call || !call.data) {
                throw new Error('Call not found');
            }
            return {
                callId: call.data.call_control_id,
                status: call.data.state,
                direction: call.data.direction,
                startTime: call.data.start_time,
                answerTime: call.data.answer_time,
            };
        }
        catch (error) {
            this.logger.error(`Failed to get call status: ${error.message}`, error.stack);
            throw error;
        }
    }
    async handleAmdResult(callId, result) {
        this.logger.log(`AMD result for call ${callId}: ${result}`);
    }
    async supervisorAction(callControlId, mode, supervisorCallControlId) {
        const apiKey = this.configService.get('TELNYX_API_KEY');
        const body = mode === 'listen'
            ? { type: 'rx', target: supervisorCallControlId }
            : mode === 'whisper'
                ? { type: 'tx', target: supervisorCallControlId }
                : { type: 'rxtx', target: supervisorCallControlId };
        const res = await fetch(`https://api.telnyx.com/v2/calls/${callControlId}/actions/fork_start`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(`Telnyx supervisor action failed: ${JSON.stringify(err)}`);
        }
        this.logger.log(`Supervisor ${mode} on ${callControlId}`);
        return { success: true };
    }
};
exports.VoipService = VoipService;
exports.VoipService = VoipService = VoipService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], VoipService);
//# sourceMappingURL=voip.service.js.map
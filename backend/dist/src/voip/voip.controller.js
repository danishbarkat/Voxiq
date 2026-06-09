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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var VoipController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoipController = void 0;
const common_1 = require("@nestjs/common");
const common_2 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const config_1 = require("@nestjs/config");
const fs_1 = require("fs");
const path_1 = require("path");
const websocket_gateway_1 = require("../websocket/websocket.gateway");
const voip_service_1 = require("./voip.service");
const sms_service_1 = require("../sms/sms.service");
const platform_express_1 = require("@nestjs/platform-express");
let VoipController = VoipController_1 = class VoipController {
    prisma;
    config;
    ws;
    voipService;
    smsService;
    logger = new common_1.Logger(VoipController_1.name);
    constructor(prisma, config, ws, voipService, smsService) {
        this.prisma = prisma;
        this.config = config;
        this.ws = ws;
        this.voipService = voipService;
        this.smsService = smsService;
    }
    getPublicBaseUrl() {
        const configured = this.config.get('PUBLIC_BASE_URL')?.trim();
        if (configured)
            return configured.replace(/\/$/, '');
        const webhookUrl = this.config.get('TELNYX_WEBHOOK_URL')?.trim();
        if (webhookUrl) {
            try {
                const origin = new URL(webhookUrl).origin;
                if (origin)
                    return origin.replace(/\/$/, '');
            }
            catch (_) { }
        }
        const port = this.config.get('PORT') || 3000;
        return `http://localhost:${port}`;
    }
    buildUploadsUrl(relativePath) {
        const normalized = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
        return `${this.getPublicBaseUrl()}${normalized}`;
    }
    normalizePhoneVariants(value) {
        const raw = typeof value === 'string' ? value.trim() : '';
        if (!raw)
            return [];
        const digits = raw.replace(/\D/g, '');
        const variants = new Set([raw]);
        if (digits) {
            variants.add(digits);
            variants.add(`+${digits}`);
            if (digits.length >= 10) {
                variants.add(digits.slice(-10));
                variants.add(`+1${digits.slice(-10)}`);
                variants.add(`1${digits.slice(-10)}`);
            }
        }
        return [...variants].filter(Boolean);
    }
    decodeClientState(rawClientState) {
        if (typeof rawClientState !== 'string' || !rawClientState.trim())
            return null;
        const direct = rawClientState.trim();
        if (/^[0-9a-f-]{36}$/i.test(direct))
            return direct;
        try {
            const decoded = Buffer.from(direct, 'base64').toString('utf8').trim();
            if (/^[0-9a-f-]{36}$/i.test(decoded))
                return decoded;
        }
        catch (_) { }
        return null;
    }
    async resolveCallLogs(callId, payload) {
        const select = {
            id: true,
            recordingUrl: true,
            callStatus: true,
            direction: true,
            startedAt: true,
        };
        const exactLogs = await this.prisma.callLog.findMany({
            where: { callControlId: callId },
            select,
        });
        if (exactLogs.length > 0)
            return exactLogs;
        const clientStateId = this.decodeClientState(payload?.client_state);
        if (clientStateId) {
            const byClientState = await this.prisma.callLog.findUnique({
                where: { id: clientStateId },
                select,
            });
            if (byClientState) {
                await this.prisma.callLog.update({
                    where: { id: byClientState.id },
                    data: {
                        callControlId: callId,
                        fromNumber: typeof payload?.from === 'string' ? payload.from : undefined,
                        toNumber: typeof payload?.to === 'string' ? payload.to : undefined,
                        direction: typeof payload?.direction === 'string' ? payload.direction : undefined,
                    },
                });
                this.logger.log(`[Webhook Match] Resolved ${callId} via client_state -> callLog ${byClientState.id}`);
                return [{ ...byClientState }];
            }
        }
        const direction = typeof payload?.direction === 'string' ? payload.direction : undefined;
        const fromVariants = this.normalizePhoneVariants(payload?.from);
        const toVariants = this.normalizePhoneVariants(payload?.to);
        const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
        const candidates = await this.prisma.callLog.findMany({
            where: {
                endedAt: null,
                startedAt: { gte: sixHoursAgo },
                ...(direction ? { direction } : {}),
                OR: [
                    ...(fromVariants.length ? [{ fromNumber: { in: fromVariants } }] : []),
                    ...(toVariants.length ? [{ toNumber: { in: toVariants } }] : []),
                    ...(toVariants.length ? [{ lead: { is: { phone: { in: toVariants } } } }] : []),
                    ...(fromVariants.length ? [{ agent: { is: { callerNumber: { in: fromVariants } } } }] : []),
                ],
            },
            orderBy: { startedAt: 'desc' },
            take: 3,
            select,
        });
        if (candidates.length === 0) {
            return [];
        }
        const [bestCandidate] = candidates;
        await this.prisma.callLog.update({
            where: { id: bestCandidate.id },
            data: {
                callControlId: callId,
                fromNumber: typeof payload?.from === 'string' ? payload.from : undefined,
                toNumber: typeof payload?.to === 'string' ? payload.to : undefined,
                direction: typeof payload?.direction === 'string' ? payload.direction : undefined,
            },
        });
        this.logger.warn(`[Webhook Match] Resolved ${callId} via fallback candidate ${bestCandidate.id}` +
            ` (from=${payload?.from || 'n/a'} to=${payload?.to || 'n/a'} dir=${direction || 'n/a'})`);
        return [{ ...bestCandidate }];
    }
    async persistCustomRecording(file, callLogId) {
        try {
            const callLog = await this.prisma.callLog.findUnique({
                where: { id: callLogId },
                select: { id: true, recordingUrl: true },
            });
            if (!callLog) {
                this.logger.error(`[Custom Recording] Invalid callLogId: ${callLogId}`);
                throw new common_1.BadRequestException('Invalid callLogId');
            }
            const safeExt = (0, path_1.extname)(file.originalname || '').toLowerCase() || '.webm';
            const filename = `${callLogId}-${Date.now()}${safeExt}`;
            const relativeDir = (0, path_1.join)('uploads', 'recordings');
            const absoluteDir = (0, path_1.join)(process.cwd(), relativeDir);
            const absolutePath = (0, path_1.join)(absoluteDir, filename);
            const publicPath = `/uploads/recordings/${filename}`;
            this.logger.log(`[Custom Recording] Persisting to ${absolutePath}`);
            await fs_1.promises.mkdir(absoluteDir, { recursive: true });
            await fs_1.promises.writeFile(absolutePath, file.buffer);
            const recordingUrl = this.buildUploadsUrl(publicPath);
            const currentRecording = callLog.recordingUrl || '';
            const isExistingLocalRecording = currentRecording.includes('/uploads/recordings/');
            if (!currentRecording || isExistingLocalRecording) {
                await this.prisma.callLog.update({
                    where: { id: callLogId },
                    data: { recordingUrl },
                });
            }
            return recordingUrl;
        }
        catch (err) {
            this.logger.error(`[Custom Recording] Persistence failed for ${callLogId}: ${err.message}`, err.stack);
            throw err;
        }
    }
    async uploadCustomRecording(file, callLogId) {
        if (!file) {
            this.logger.warn('[Custom Recording] No file received in request');
            throw new common_1.BadRequestException('Recording file is required');
        }
        if (!callLogId) {
            this.logger.warn('[Custom Recording] No callLogId received in request');
            throw new common_1.BadRequestException('callLogId is required');
        }
        try {
            const recordingUrl = await this.persistCustomRecording(file, callLogId);
            this.logger.log(`[Custom Recording] Success for ${callLogId}: ${recordingUrl}`);
            return { success: true, recordingUrl };
        }
        catch (err) {
            this.logger.error(`[Custom Recording] Upload handler failed: ${err.message}`);
            throw err;
        }
    }
    async voicemailDrop(body) {
        const { callControlId, audioUrl, callLogId } = body;
        const apiKey = this.config.get('TELNYX_API_KEY');
        await fetch(`https://api.telnyx.com/v2/calls/${callControlId}/actions/play_audio`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ audio_url: audioUrl }),
        });
        if (callLogId) {
            try {
                await this.prisma.callLog.update({
                    where: { id: callLogId },
                    data: { vmRecordingUrl: audioUrl },
                });
                this.logger.log(`[VM Drop] Saved vmRecordingUrl for callLog ${callLogId}`);
            }
            catch (err) {
                this.logger.warn(`[VM Drop] Could not save vmRecordingUrl: ${err?.message}`);
            }
        }
        return { success: true };
    }
    async supervisorListen(body) {
        return this.voipService.supervisorAction(body.callControlId, 'listen', body.supervisorCallControlId);
    }
    async supervisorWhisper(body) {
        return this.voipService.supervisorAction(body.callControlId, 'whisper', body.supervisorCallControlId);
    }
    async supervisorBarge(body) {
        return this.voipService.supervisorAction(body.callControlId, 'barge', body.supervisorCallControlId);
    }
    async handleWebhook(body, signature, timestamp, _pubHeader) {
        const pubKey = this.config.get('TELNYX_PUBLIC_KEY');
        if (pubKey) {
            if (!signature || !timestamp) {
                throw new common_1.UnauthorizedException('Missing Telnyx signature headers');
            }
            try {
                const { verify } = await import('crypto');
                const message = Buffer.from(timestamp + '|' + JSON.stringify(body));
                const keyBuffer = Buffer.from(pubKey, 'base64');
                const sigBuffer = Buffer.from(signature, 'base64');
                const valid = verify(null, message, { key: keyBuffer, format: 'der', type: 'spki' }, sigBuffer);
                if (!valid) {
                    throw new common_1.UnauthorizedException('Invalid Telnyx signature');
                }
            }
            catch (err) {
                if (err instanceof common_1.UnauthorizedException)
                    throw err;
                this.logger.warn(`Webhook signature check skipped (crypto error): ${err.message}`);
            }
        }
        const event = body?.data?.event_type;
        const callId = body?.data?.payload?.call_control_id;
        if (event === 'message.received') {
            const payload = body?.data?.payload;
            const from = payload?.from?.phone_number || payload?.from || '';
            const to = payload?.to?.[0]?.phone_number || payload?.to || '';
            const text = payload?.text || payload?.body || '';
            const msgId = body?.data?.id || null;
            this.logger.log(`[SMS] Inbound from=${from} to=${to} text="${text.slice(0, 50)}"`);
            try {
                const accountId = await this.smsService.findAccountByNumber(to);
                const saved = await this.smsService.saveInbound(from, to, text, msgId, accountId || 'unknown');
                if (accountId) {
                    this.ws.broadcastSmsReceived(accountId, {
                        id: saved.id, fromNumber: from, toNumber: to, body: text, createdAt: saved.createdAt,
                    });
                }
            }
            catch (err) {
                this.logger.warn(`[SMS] Failed to save inbound: ${err?.message}`);
            }
            return { received: true };
        }
        if (!callId) {
            this.logger.debug('Webhook received without call_control_id', event);
            return { received: true };
        }
        const hangupCause = body?.data?.payload?.hangup_cause;
        const sipHangupCause = body?.data?.payload?.sip_hangup_cause;
        const direction = body?.data?.payload?.direction;
        const fromNum = body?.data?.payload?.from;
        const toNum = body?.data?.payload?.to;
        this.logger.log(`Telnyx Webhook: ${event} | call=${callId} | dir=${direction} | from=${fromNum} | to=${toNum}${hangupCause ? ` | hangup_cause=${hangupCause}` : ''}${sipHangupCause ? ` | sip_cause=${sipHangupCause}` : ''}`);
        const recordingUrl = body?.data?.payload?.public_recording_urls?.mp3 ||
            body?.data?.payload?.public_recording_urls?.wav ||
            body?.data?.payload?.recording_urls?.[0] ||
            body?.data?.payload?.recording_url;
        if (event === 'call.initiated' && direction === 'inbound') {
            this.logger.log(`[Inbound] call.initiated from=${fromNum} to=${toNum}`);
            try {
                const apiKey = this.config.get('TELNYX_API_KEY');
                const answerRes = await fetch(`https://api.telnyx.com/v2/calls/${callId}/actions/answer`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({}),
                });
                if (!answerRes.ok) {
                    const err = await answerRes.json();
                    this.logger.error(`[Inbound] Failed to answer call ${callId}: ${JSON.stringify(err?.errors?.[0])}`);
                }
                else {
                    this.logger.log(`[Inbound] Answered call ${callId}`);
                }
            }
            catch (err) {
                this.logger.error(`[Inbound] Answer action threw: ${err?.message}`);
            }
            try {
                const ownerUser = await this.prisma.user.findFirst({
                    where: { callerNumber: toNum },
                    select: { id: true, accountId: true },
                });
                const lead = await this.prisma.lead.findFirst({
                    where: {
                        OR: [
                            { phone: { in: [fromNum, fromNum?.replace(/\D/g, '')] } },
                            ...(ownerUser?.accountId ? [{ accountId: ownerUser.accountId, phone: { in: [fromNum, fromNum?.replace(/\D/g, '')] } }] : []),
                        ],
                    },
                    select: { id: true, firstName: true, lastName: true, accountId: true },
                });
                const fallbackCampaign = ownerUser?.accountId
                    ? await this.prisma.campaign.findFirst({
                        where: { accountId: ownerUser.accountId },
                        select: { id: true },
                    })
                    : null;
                const ownerAgentId = ownerUser?.id ?? null;
                const campaignId = fallbackCampaign?.id ?? null;
                const callerName = lead
                    ? `${lead.firstName || ''} ${lead.lastName || ''}`.trim()
                    : null;
                await this.prisma.callLog.create({
                    data: {
                        callControlId: callId,
                        startedAt: new Date(),
                        callStatus: client_1.CallStatus.RINGING,
                        direction: 'inbound',
                        fromNumber: fromNum,
                        toNumber: toNum,
                        callerName,
                        leadId: lead?.id ?? null,
                        agentId: ownerAgentId,
                        campaignId,
                    },
                });
                this.logger.log(`[Inbound] CallLog created for ${callId}`);
            }
            catch (err) {
                this.logger.warn(`[Inbound] Could not create CallLog: ${err?.message}`);
            }
        }
        if (event === 'call.answered') {
            try {
                const apiKey = this.config.get('TELNYX_API_KEY');
                await fetch(`https://api.telnyx.com/v2/calls/${callId}/actions/record_start`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ format: 'mp3', channels: 'dual' })
                });
                this.logger.log(`Forced record_start on answered call ${callId}`);
            }
            catch (err) {
                this.logger.error(`Failed to force record_start: ${err.message}`);
            }
            const updatedLogs = await this.resolveCallLogs(callId, body?.data?.payload);
            if (updatedLogs.length === 0) {
                this.logger.warn(`No CallLog found for callControlId: ${callId} on answered event`);
            }
            for (const log of updatedLogs) {
                await this.prisma.callLog.update({
                    where: { id: log.id },
                    data: {
                        callStatus: client_1.CallStatus.CONNECTED,
                        fromNumber: typeof fromNum === 'string' ? fromNum : undefined,
                        toNumber: typeof toNum === 'string' ? toNum : undefined,
                        direction: typeof direction === 'string' ? direction : undefined,
                    },
                });
            }
            for (const log of updatedLogs) {
                this.ws.broadcastCallUpdate(log.id, { status: 'connected', callControlId: callId });
            }
            this.ws.broadcastCallUpdate(callId, { status: 'connected' });
        }
        if (event === 'call.hangup' || event === 'call.ended') {
            const endedLogs = await this.resolveCallLogs(callId, body?.data?.payload);
            const telnyxDuration = body?.data?.payload?.call_duration ?? null;
            const telnyxEndTime = body?.data?.payload?.end_time ?? null;
            const endedAt = telnyxEndTime ? new Date(telnyxEndTime) : new Date();
            for (const log of endedLogs) {
                const finalRecordingUrl = log.recordingUrl || recordingUrl;
                const wasNeverAnswered = log.callStatus === client_1.CallStatus.RINGING;
                const isInbound = log.direction === 'inbound';
                const finalStatus = wasNeverAnswered && isInbound ? client_1.CallStatus.MISSED : client_1.CallStatus.COMPLETED;
                const durationSeconds = telnyxDuration !== null
                    ? telnyxDuration
                    : log.startedAt
                        ? (endedAt.getTime() - new Date(log.startedAt).getTime()) / 1000
                        : null;
                await this.prisma.callLog.update({
                    where: { id: log.id },
                    data: {
                        callStatus: finalStatus,
                        endedAt,
                        durationSeconds: durationSeconds !== null ? Math.max(0, durationSeconds) : undefined,
                        recordingUrl: finalRecordingUrl || undefined,
                        fromNumber: typeof fromNum === 'string' ? fromNum : undefined,
                        toNumber: typeof toNum === 'string' ? toNum : undefined,
                        direction: typeof direction === 'string' ? direction : undefined,
                    },
                });
                const statusLabel = finalStatus === client_1.CallStatus.MISSED ? 'missed' : 'completed';
                this.ws.broadcastCallUpdate(log.id, { status: statusLabel, recordingUrl: finalRecordingUrl });
            }
            this.ws.broadcastCallUpdate(callId, { status: 'completed', recordingUrl });
            this.logger.log(`Call ${callId} ended. Recording URL: ${recordingUrl || 'None'}`);
        }
        if (event === 'call.machine.detection.ended' || event === 'call.recording.saved' || event === 'recording.saved') {
            if (recordingUrl) {
                this.logger.log(`Recording saved for call ${callId}: ${recordingUrl}`);
                const logs = await this.resolveCallLogs(callId, body?.data?.payload);
                for (const log of logs) {
                    await this.prisma.callLog.update({
                        where: { id: log.id },
                        data: {
                            recordingUrl,
                            fromNumber: typeof fromNum === 'string' ? fromNum : undefined,
                            toNumber: typeof toNum === 'string' ? toNum : undefined,
                            direction: typeof direction === 'string' ? direction : undefined,
                        },
                    });
                }
                this.ws.broadcastCallUpdate(callId, { recordingUrl });
            }
        }
        return { received: true };
    }
};
exports.VoipController = VoipController;
__decorate([
    (0, common_1.Post)('custom-recording'),
    (0, common_2.SetMetadata)('isPublic', true),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)('callLogId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], VoipController.prototype, "uploadCustomRecording", null);
__decorate([
    (0, common_1.Post)('voicemail-drop'),
    (0, common_2.SetMetadata)('isPublic', true),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], VoipController.prototype, "voicemailDrop", null);
__decorate([
    (0, common_1.Post)('supervisor/listen'),
    (0, common_2.SetMetadata)('isPublic', true),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], VoipController.prototype, "supervisorListen", null);
__decorate([
    (0, common_1.Post)('supervisor/whisper'),
    (0, common_2.SetMetadata)('isPublic', true),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], VoipController.prototype, "supervisorWhisper", null);
__decorate([
    (0, common_1.Post)('supervisor/barge'),
    (0, common_2.SetMetadata)('isPublic', true),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], VoipController.prototype, "supervisorBarge", null);
__decorate([
    (0, common_2.SetMetadata)('isPublic', true),
    (0, common_1.Post)('telnyx/webhook'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)('telnyx-signature-ed25519')),
    __param(2, (0, common_1.Headers)('telnyx-timestamp')),
    __param(3, (0, common_1.Headers)('telnyx-public-key')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], VoipController.prototype, "handleWebhook", null);
exports.VoipController = VoipController = VoipController_1 = __decorate([
    (0, common_1.Controller)('voip'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService,
        websocket_gateway_1.WebsocketGateway,
        voip_service_1.VoipService,
        sms_service_1.SmsService])
], VoipController);
//# sourceMappingURL=voip.controller.js.map
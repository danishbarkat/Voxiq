import { BadRequestException, Body, Controller, Headers, HttpCode, Logger, Post, UnauthorizedException, UploadedFile, UseInterceptors } from '@nestjs/common';
import { SetMetadata } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CallStatus } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import { extname, join } from 'path';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { VoipService } from './voip.service';
import { SmsService } from '../sms/sms.service';
import { FileInterceptor } from '@nestjs/platform-express';

interface TelnyxEvent {
    data?: {
        id?: string;
        event_type?: string;
        payload?: {
            call_control_id?: string;
            recording_urls?: string[];
            recording_url?: string;
            public_recording_urls?: {
                mp3?: string;
                wav?: string;
            };
        };
    };
}

@Controller('voip')
export class VoipController {
    private readonly logger = new Logger(VoipController.name);

    constructor(
        private prisma: PrismaService,
        private config: ConfigService,
        private ws: WebsocketGateway,
        private voipService: VoipService,
        private smsService: SmsService,
    ) { }

    private getPublicBaseUrl(): string {
        const configured = this.config.get<string>('PUBLIC_BASE_URL')?.trim();
        if (configured) return configured.replace(/\/$/, '');

        const webhookUrl = this.config.get<string>('TELNYX_WEBHOOK_URL')?.trim();
        if (webhookUrl) {
            try {
                const origin = new URL(webhookUrl).origin;
                if (origin) return origin.replace(/\/$/, '');
            } catch (_) { }
        }

        const port = this.config.get<number>('PORT') || 3000;
        return `http://localhost:${port}`;
    }

    private buildUploadsUrl(relativePath: string): string {
        const normalized = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
        return `${this.getPublicBaseUrl()}${normalized}`;
    }

    private async persistCustomRecording(file: Express.Multer.File, callLogId: string): Promise<string> {
        try {
            const callLog = await this.prisma.callLog.findUnique({
                where: { id: callLogId },
                select: { id: true, recordingUrl: true },
            });
            if (!callLog) {
                this.logger.error(`[Custom Recording] Invalid callLogId: ${callLogId}`);
                throw new BadRequestException('Invalid callLogId');
            }

            const safeExt = extname(file.originalname || '').toLowerCase() || '.webm';
            const filename = `${callLogId}-${Date.now()}${safeExt}`;
            const relativeDir = join('uploads', 'recordings');
            const absoluteDir = join(process.cwd(), relativeDir);
            const absolutePath = join(absoluteDir, filename);
            const publicPath = `/uploads/recordings/${filename}`;

            this.logger.log(`[Custom Recording] Persisting to ${absolutePath}`);
            await fs.mkdir(absoluteDir, { recursive: true });
            await fs.writeFile(absolutePath, file.buffer);

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
        } catch (err) {
            this.logger.error(`[Custom Recording] Persistence failed for ${callLogId}: ${err.message}`, err.stack);
            throw err;
        }
    }

    @Post('custom-recording')
    @SetMetadata('isPublic', true)
    @UseInterceptors(FileInterceptor('file'))
    async uploadCustomRecording(
        @UploadedFile() file: Express.Multer.File,
        @Body('callLogId') callLogId: string,
    ) {
        if (!file) {
            this.logger.warn('[Custom Recording] No file received in request');
            throw new BadRequestException('Recording file is required');
        }
        if (!callLogId) {
            this.logger.warn('[Custom Recording] No callLogId received in request');
            throw new BadRequestException('callLogId is required');
        }

        try {
            const recordingUrl = await this.persistCustomRecording(file, callLogId);
            this.logger.log(`[Custom Recording] Success for ${callLogId}: ${recordingUrl}`);
            return { success: true, recordingUrl };
        } catch (err) {
            this.logger.error(`[Custom Recording] Upload handler failed: ${err.message}`);
            throw err;
        }
    }

    // ─── Voicemail Drop ─────────────────────────────────────────────────────
    @Post('voicemail-drop')
    @SetMetadata('isPublic', true)
    async voicemailDrop(@Body() body: { callControlId: string; audioUrl: string; callLogId?: string }) {
        const { callControlId, audioUrl, callLogId } = body;
        const apiKey = this.config.get<string>('TELNYX_API_KEY');
        await fetch(`https://api.telnyx.com/v2/calls/${callControlId}/actions/play_audio`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ audio_url: audioUrl }),
        });

        // Save the voicemail audio URL against this call log so it shows in Recordings tab
        if (callLogId) {
            try {
                await this.prisma.callLog.update({
                    where: { id: callLogId },
                    data: { vmRecordingUrl: audioUrl } as any,
                });
                this.logger.log(`[VM Drop] Saved vmRecordingUrl for callLog ${callLogId}`);
            } catch (err) {
                this.logger.warn(`[VM Drop] Could not save vmRecordingUrl: ${err?.message}`);
            }
        }
        return { success: true };
    }

    // ─── Supervisor: Listen ─────────────────────────────────────────────────
    @Post('supervisor/listen')
    @SetMetadata('isPublic', true)
    async supervisorListen(@Body() body: { callControlId: string; supervisorCallControlId: string }) {
        return this.voipService.supervisorAction(body.callControlId, 'listen', body.supervisorCallControlId);
    }

    // ─── Supervisor: Whisper ────────────────────────────────────────────────
    @Post('supervisor/whisper')
    @SetMetadata('isPublic', true)
    async supervisorWhisper(@Body() body: { callControlId: string; supervisorCallControlId: string }) {
        return this.voipService.supervisorAction(body.callControlId, 'whisper', body.supervisorCallControlId);
    }

    // ─── Supervisor: Barge ──────────────────────────────────────────────────
    @Post('supervisor/barge')
    @SetMetadata('isPublic', true)
    async supervisorBarge(@Body() body: { callControlId: string; supervisorCallControlId: string }) {
        return this.voipService.supervisorAction(body.callControlId, 'barge', body.supervisorCallControlId);
    }

    // ─── Telnyx Webhook ─────────────────────────────────────────────────────
    @SetMetadata('isPublic', true)
    @Post('telnyx/webhook')
    @HttpCode(200)
    async handleWebhook(
        @Body() body: TelnyxEvent,
        @Headers('telnyx-signature-ed25519') signature: string,
        @Headers('telnyx-timestamp') timestamp: string,
        @Headers('telnyx-public-key') _pubHeader: string,
    ) {
        // Verify Ed25519 signature if public key is configured
        const pubKey = this.config.get<string>('TELNYX_PUBLIC_KEY');
        if (pubKey) {
            if (!signature || !timestamp) {
                throw new UnauthorizedException('Missing Telnyx signature headers');
            }
            try {
                const { verify } = await import('crypto');
                const message = Buffer.from(timestamp + '|' + JSON.stringify(body));
                const keyBuffer = Buffer.from(pubKey, 'base64');
                const sigBuffer = Buffer.from(signature, 'base64');
                const valid = verify(
                    null,
                    message,
                    { key: keyBuffer, format: 'der', type: 'spki' },
                    sigBuffer,
                );
                if (!valid) {
                    throw new UnauthorizedException('Invalid Telnyx signature');
                }
            } catch (err) {
                if (err instanceof UnauthorizedException) throw err;
                this.logger.warn(`Webhook signature check skipped (crypto error): ${err.message}`);
            }
        }

        const event = body?.data?.event_type;
        const callId = body?.data?.payload?.call_control_id;

        // ── Inbound SMS — handle before call_control_id guard ────────────────
        if (event === 'message.received') {
            const payload = body?.data?.payload as any;
            const from: string = payload?.from?.phone_number || payload?.from || '';
            const to: string = payload?.to?.[0]?.phone_number || payload?.to || '';
            const text: string = payload?.text || payload?.body || '';
            const msgId: string | null = (body?.data as any)?.id || null;
            this.logger.log(`[SMS] Inbound from=${from} to=${to} text="${text.slice(0, 50)}"`);
            try {
                const accountId = await this.smsService.findAccountByNumber(to);
                const saved = await this.smsService.saveInbound(from, to, text, msgId, accountId || 'unknown');
                if (accountId) {
                    this.ws.broadcastSmsReceived(accountId, {
                        id: saved.id, fromNumber: from, toNumber: to, body: text, createdAt: saved.createdAt,
                    });
                }
            } catch (err) {
                this.logger.warn(`[SMS] Failed to save inbound: ${err?.message}`);
            }
            return { received: true };
        }

        if (!callId) {
            this.logger.debug('Webhook received without call_control_id', event);
            return { received: true };
        }

        const hangupCause = (body?.data?.payload as any)?.hangup_cause;
        const sipHangupCause = (body?.data?.payload as any)?.sip_hangup_cause;
        const direction = (body?.data?.payload as any)?.direction;
        const fromNum = (body?.data?.payload as any)?.from;
        const toNum = (body?.data?.payload as any)?.to;
        this.logger.log(`Telnyx Webhook: ${event} | call=${callId} | dir=${direction} | from=${fromNum} | to=${toNum}${hangupCause ? ` | hangup_cause=${hangupCause}` : ''}${sipHangupCause ? ` | sip_cause=${sipHangupCause}` : ''}`);

        const recordingUrl =
            body?.data?.payload?.public_recording_urls?.mp3 ||
            body?.data?.payload?.public_recording_urls?.wav ||
            body?.data?.payload?.recording_urls?.[0] ||
            body?.data?.payload?.recording_url;

        // ── Inbound call initiated — answer it and create CallLog ────────────
        if (event === 'call.initiated' && direction === 'inbound') {
            this.logger.log(`[Inbound] call.initiated from=${fromNum} to=${toNum}`);

            // Answer the call so Telnyx doesn't clear it (Q.850 code 16)
            try {
                const apiKey = this.config.get<string>('TELNYX_API_KEY');
                const answerRes = await fetch(`https://api.telnyx.com/v2/calls/${callId}/actions/answer`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({}),
                });
                if (!answerRes.ok) {
                    const err = await answerRes.json() as any;
                    this.logger.error(`[Inbound] Failed to answer call ${callId}: ${JSON.stringify(err?.errors?.[0])}`);
                } else {
                    this.logger.log(`[Inbound] Answered call ${callId}`);
                }
            } catch (err) {
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
                        callStatus: CallStatus.RINGING,
                        direction: 'inbound',
                        fromNumber: fromNum,
                        toNumber: toNum,
                        callerName,
                        leadId: lead?.id ?? null,
                        agentId: ownerAgentId,
                        campaignId,
                    } as any,
                });
                this.logger.log(`[Inbound] CallLog created for ${callId}`);
            } catch (err) {
                this.logger.warn(`[Inbound] Could not create CallLog: ${err?.message}`);
            }
        }

        if (event === 'call.answered') {
            // EXPLICITLY start recording for WebRTC outbound calls which missed the initial flag
            try {
                const apiKey = this.config.get<string>('TELNYX_API_KEY');
                await fetch(`https://api.telnyx.com/v2/calls/${callId}/actions/record_start`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ format: 'mp3', channels: 'dual' })
                });
                this.logger.log(`Forced record_start on answered call ${callId}`);
            } catch (err) {
                this.logger.error(`Failed to force record_start: ${err.message}`);
            }

            const updatedLogs = await this.prisma.callLog.findMany({
                where: { callControlId: callId },
                select: { id: true },
            });

            if (updatedLogs.length === 0) {
                this.logger.warn(`No CallLog found for callControlId: ${callId} on answered event`);
            }

            await this.prisma.callLog.updateMany({
                where: { callControlId: callId },
                data: { callStatus: CallStatus.CONNECTED },
            });

            // Broadcast with both the Telnyx callControlId AND the db callLog.id
            // so the frontend can correlate regardless of which ID it has
            for (const log of updatedLogs) {
                this.ws.broadcastCallUpdate(log.id, { status: 'connected', callControlId: callId });
            }
            // Also broadcast with the raw Telnyx ID for manual calls using callControlId
            this.ws.broadcastCallUpdate(callId, { status: 'connected' });
        }

        if (event === 'call.hangup' || event === 'call.ended') {
            const endedLogs = await this.prisma.callLog.findMany({
                where: { callControlId: callId },
                select: { id: true, recordingUrl: true, callStatus: true, direction: true, startedAt: true },
            });

            // Use Telnyx's reported duration (seconds) when available
            const telnyxDuration: number | null = (body?.data?.payload as any)?.call_duration ?? null;
            const telnyxEndTime: string | null = (body?.data?.payload as any)?.end_time ?? null;
            const endedAt = telnyxEndTime ? new Date(telnyxEndTime) : new Date();

            for (const log of endedLogs) {
                const finalRecordingUrl = log.recordingUrl || recordingUrl;
                // Inbound calls that were still RINGING (never answered) → MISSED
                const wasNeverAnswered = log.callStatus === CallStatus.RINGING;
                const isInbound = (log as any).direction === 'inbound';
                const finalStatus = wasNeverAnswered && isInbound ? CallStatus.MISSED : CallStatus.COMPLETED;

                // Calculate duration: prefer Telnyx's value, fallback to timestamp diff
                const durationSeconds: number | null = telnyxDuration !== null
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
                    },
                });
                const statusLabel = finalStatus === CallStatus.MISSED ? 'missed' : 'completed';
                this.ws.broadcastCallUpdate(log.id, { status: statusLabel, recordingUrl: finalRecordingUrl });
            }
            this.ws.broadcastCallUpdate(callId, { status: 'completed', recordingUrl });

            this.logger.log(`Call ${callId} ended. Recording URL: ${recordingUrl || 'None'}`);
        }

        if (event === 'call.machine.detection.ended' || event === 'call.recording.saved' || event === 'recording.saved') {
            if (recordingUrl) {
                this.logger.log(`Recording saved for call ${callId}: ${recordingUrl}`);
                const logs = await this.prisma.callLog.findMany({
                    where: { callControlId: callId },
                    select: { id: true, recordingUrl: true },
                });
                for (const log of logs) {
                    await this.prisma.callLog.update({
                        where: { id: log.id },
                        data: { recordingUrl },
                    });
                }
                this.ws.broadcastCallUpdate(callId, { recordingUrl });
            }
        }

        return { received: true };
    }
}

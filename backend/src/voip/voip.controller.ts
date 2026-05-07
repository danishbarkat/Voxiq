import { BadRequestException, Body, Controller, Headers, HttpCode, Logger, Post, UnauthorizedException, UploadedFile, UseInterceptors } from '@nestjs/common';
import { SetMetadata } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CallStatus } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { createVerify } from 'crypto';
import { promises as fs } from 'fs';
import { extname, join } from 'path';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { VoipService } from './voip.service';
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
    ) { }

    private getPublicBaseUrl(): string {
        const configured = this.config.get<string>('PUBLIC_BASE_URL')?.trim();
        if (configured) return configured.replace(/\/$/, '');

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
                select: { id: true },
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
            await this.prisma.callLog.update({
                where: { id: callLogId },
                data: { recordingUrl },
            });

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
        // Verify signature if public key is configured
        const pubKey = this.config.get<string>('TELNYX_PUBLIC_KEY');
        if (pubKey) {
            if (!signature || !timestamp) {
                throw new UnauthorizedException('Missing Telnyx signature headers');
            }
            const verifier = createVerify('SHA256');
            verifier.update(timestamp + JSON.stringify(body));
            verifier.end();
            const valid = verifier.verify(
                Buffer.from(pubKey, 'base64'),
                Buffer.from(signature, 'base64'),
            );
            if (!valid) {
                throw new UnauthorizedException('Invalid Telnyx signature');
            }
        }

        const event = body?.data?.event_type;
        const callId = body?.data?.payload?.call_control_id;

        if (!callId) {
            this.logger.debug('Webhook received without call_control_id', event);
            return { received: true };
        }

        this.logger.log(`Telnyx Webhook: ${event} for call ${callId}`);

        const recordingUrl =
            body?.data?.payload?.public_recording_urls?.mp3 ||
            body?.data?.payload?.public_recording_urls?.wav ||
            body?.data?.payload?.recording_urls?.[0] ||
            body?.data?.payload?.recording_url;

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
                select: { id: true, recordingUrl: true },
            });

            for (const log of endedLogs) {
                const finalRecordingUrl = log.recordingUrl || recordingUrl;
                await this.prisma.callLog.update({
                    where: { id: log.id },
                    data: {
                        callStatus: CallStatus.COMPLETED,
                        endedAt: new Date(),
                        recordingUrl: finalRecordingUrl || undefined,
                    },
                });
                this.ws.broadcastCallUpdate(log.id, { status: 'completed', recordingUrl: finalRecordingUrl });
            }
            this.ws.broadcastCallUpdate(callId, { status: 'completed', recordingUrl });

            this.logger.log(`Call ${callId} completed. Recording URL: ${recordingUrl || 'None'}`);
        }

        if (event === 'call.machine.detection.ended' || event === 'call.recording.saved' || event === 'recording.saved') {
            if (recordingUrl) {
                this.logger.log(`Recording saved for call ${callId}: ${recordingUrl}`);
                const logs = await this.prisma.callLog.findMany({
                    where: { callControlId: callId },
                    select: { id: true, recordingUrl: true },
                });
                for (const log of logs) {
                    if (log.recordingUrl) continue;
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

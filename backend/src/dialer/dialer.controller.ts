import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Param,
    Body,
    Query,
    Req,
    SetMetadata,
} from '@nestjs/common';
import { Request } from 'express';
import { DialerService } from './dialer.service';
import { VoipService } from '../voip/voip.service';
import { PrismaService } from '../prisma/prisma.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { CallStatus } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

// TODO: Add authentication guard
// @UseGuards(JwtAuthGuard)
@Controller('dialer')
export class DialerController {
    constructor(
        private dialerService: DialerService,
        private voipService: VoipService,
        private prisma: PrismaService,
        private config: ConfigService,
    ) { }

    private getDefaultCallerName(): string {
        return (this.config.get<string>('DEFAULT_OUTBOUND_CALLER_NAME') || 'RMESSAGES LLC').trim() || 'RMESSAGES LLC';
    }

    private normalizeComparablePhone(phone?: string | null): string | null {
        const digits = (phone || '').replace(/\D/g, '');
        if (!digits) return null;
        return digits.length > 10 ? digits.slice(-10) : digits;
    }

    @SetMetadata('isPublic', true)
    @Post('call/start')
    async startCall(
        @Body() body: { to: string; from?: string; callerName?: string; leadId?: string; agentId?: string },
    ) {
        const to = this.normalizeToE164(body.to);
        const from = this.normalizeToE164(
            body.from || this.config.get<string>('DEFAULT_OUTBOUND_NUMBER') || '+12623990007'
        );
        const callerName = body.callerName?.trim() || this.getDefaultCallerName();

        // ── DUPLICATE CALL GUARD ──────────────────────────────────────────────
        // Before placing the call, check if this phone number is already being called right now.
        // This prevents double-dialing the same customer (e.g. two agents on same list, or race conditions).
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const activeLead = await this.prisma.lead.findFirst({
            where: { phone: { in: [to, body.to?.trim()] } },
            select: { id: true },
        });
        if (activeLead) {
            const activeCallLog = await this.prisma.callLog.findFirst({
                where: {
                    leadId: activeLead.id,
                    callStatus: { in: [CallStatus.RINGING, CallStatus.CONNECTED] },
                    startedAt: { gte: fiveMinutesAgo },
                },
                select: { id: true, callStatus: true },
            });
            if (activeCallLog) {
                console.warn(`[Dialer] DUPLICATE CALL BLOCKED: ${to} already has an active call (log: ${activeCallLog.id}, status: ${activeCallLog.callStatus})`);
                return {
                    error: 'duplicate_call',
                    message: `This number (${to}) is already in an active call. Duplicate call blocked.`,
                    existingCallLogId: activeCallLog.id,
                };
            }
        }
        // ─────────────────────────────────────────────────────────────────────

        const result = await this.voipService.initiateCall({
            to,
            from,
            callerName,
            callControlAppId: this.config.get<string>('TELNYX_CALL_CONTROL_APP_ID'),
            webhookUrl: this.config.get<string>('TELNYX_WEBHOOK_URL'),
            answeringMachineDetection: 'disabled',
            record: 'record-from-answer',
            recordingChannels: 'dual',
        });

        // Create call log if leadId provided (optional - don't block call if DB fails)
        let callLogId: string | null = null;
        if (body.leadId) {
            try {
                const user = await this.prisma.user.findFirst({ select: { id: true } });
                // Find or use a default campaign to satisfy FK constraint
                const campaign = await this.prisma.campaign.findFirst({ select: { id: true } });
                if (user && campaign) {
                    const log = await this.prisma.callLog.create({
                        data: {
                            leadId: body.leadId,
                            agentId: user.id,
                            campaignId: campaign.id,
                            startedAt: new Date(),
                            callStatus: CallStatus.RINGING,
                            callControlId: result.callId,
                        },
                    });
                    callLogId = log.id;
                }
            } catch (logErr) {
                // Log creation failed - don't block the call
                console.warn('callLog create skipped:', logErr?.message);
            }
        }

        return { callId: result.callId, status: result.status, callLogId };
    }

    @SetMetadata('isPublic', true)
    @Post('call/hangup')
    async hangupCall(@Body() body: { callId: string }) {
        await this.voipService.terminateCall(body.callId);
        return { message: 'Call terminated' };
    }

    @Roles('Admin', 'Manager')
    @Post('campaign/:id/start')
    async startCampaign(@Param('id') id: string) {
        await this.dialerService.startCampaign(id);
        return { message: 'Campaign started successfully' };
    }

    @Roles('Admin', 'Manager')
    @Post('campaign/:id/pause')
    async pauseCampaign(@Param('id') id: string) {
        await this.dialerService.pauseCampaign(id);
        return { message: 'Campaign paused successfully' };
    }

    @SetMetadata('isPublic', true)
    @Post('call/disposition')
    async handleDisposition(
        @Body()
        body: {
            callLogId: string;
            disposition: string;
            notes?: string;
            callbackAt?: string;
            dealValue?: number;
        },
    ) {
        await this.dialerService.handleDisposition(
            body.callLogId,
            body.disposition,
            body.notes,
            body.callbackAt,
            body.dealValue,
        );
        return { message: 'Disposition recorded successfully' };
    }

    @SetMetadata('isPublic', true)
    @Patch('call/log/:id')
    async updateCallLog(
        @Param('id') id: string,
        @Body() body: { callControlId?: string; disposition?: string; notes?: string }
    ) {
        return this.prisma.callLog.update({
            where: { id },
            data: body as any,
        });
    }

    @SetMetadata('isPublic', true)
    @Post('call/log')
    async logCall(
        @Body() body: { leadId?: string; agentId: string; callControlId?: string; campaignId?: string; manualNumber?: string; manualName?: string; isManual?: boolean }
    ) {
        return this.dialerService.logCall(body);
    }

    /**
     * Lead lock: atomically reserve a lead for one agent before dialing.
     * Call this BEFORE makeCall() to prevent two agents dialing the same number.
     *
     * Returns:
     *   { locked: true, callLogId } — lead is yours, callLog (RINGING) already created
     *   { locked: false, reason }  — another agent is already dialing this lead
     */
    @SetMetadata('isPublic', true)
    @Post('call/lock')
    async lockLead(@Body() body: { leadId?: string; agentId: string; phone?: string; manualNumber?: string }) {
        const { leadId, agentId } = body;
        if (!agentId || (!leadId && !body.phone && !body.manualNumber)) {
            return { locked: false, reason: 'agentId and leadId or phone are required' };
        }

        const lead = leadId
            ? await this.prisma.lead.findUnique({
                where: { id: leadId },
                select: { id: true, phone: true },
            })
            : null;
        const targetPhone = this.normalizeComparablePhone(body.phone || body.manualNumber || lead?.phone);
        if (!targetPhone) {
            return { locked: false, reason: 'invalid_phone' };
        }

        // Window: treat any RINGING/CONNECTED callLog created in the last 5 min as an active lock
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

        const existing = await this.prisma.callLog.findFirst({
            where: {
                callStatus: { in: [CallStatus.RINGING, CallStatus.CONNECTED] },
                startedAt: { gte: fiveMinutesAgo },
                OR: [
                    { toNumber: { endsWith: targetPhone } },
                    { lead: { is: { phone: { endsWith: targetPhone } } } },
                ],
            },
            select: { id: true, agentId: true },
        });

        if (existing) {
            const lockedBySelf = existing.agentId === agentId;
            if (lockedBySelf) {
                // If same agent is re-dialing, just reuse/refresh the existing lock
                console.log(`[Dialer] LOCK RE-ACQUIRED: phone ${targetPhone} already locked by SAME agent ${agentId}`);
                return { locked: true, callLogId: existing.id };
            }

            console.warn(`[Dialer] LOCK DENIED: phone ${targetPhone} already locked by agent ${existing.agentId}`);
            return {
                locked: false,
                reason: 'already_dialing_other_agent',
            };
        }

        // No active lock — create a RINGING callLog to claim the lead
        try {
            const callLog = await this.dialerService.logCall({
                leadId: lead?.id,
                agentId,
                manualNumber: !lead?.id ? (body.phone || body.manualNumber) : undefined,
                isManual: !lead?.id,
            });
            console.log(`[Dialer] LOCK ACQUIRED: lead ${leadId} → agent ${agentId} (callLogId: ${callLog.id})`);
            return { locked: true, callLogId: callLog.id };
        } catch (err) {
            console.error(`[Dialer] LOCK CREATE FAILED: ${err?.message}`);
            return { locked: false, reason: 'db_error' };
        }
    }

    /**
     * One-click DNC: add a phone number to the DNC registry immediately.
     * Agents can call this without needing to go through the full disposition flow.
     */
    @SetMetadata('isPublic', true)
    @Post('dnc')
    async addToDnc(@Body() body: { phone: string; accountId?: string; reason?: string }) {
        const phone = body.phone?.trim();
        if (!phone) return { error: 'phone is required' };

        // Upsert into DNC registry
        await this.prisma.dncRegistry.upsert({
            where: { phone },
            update: { source: body.reason || 'agent_request' },
            create: {
                phone,
                accountId: body.accountId || '',
                source: body.reason || 'agent_request',
            },
        });

        // Also update the lead status if the lead exists
        const lead = await this.prisma.lead.findFirst({ where: { phone } });
        if (lead) {
            await this.prisma.lead.update({
                where: { id: lead.id },
                data: { status: 'DNC' as any },
            });
        }

        console.log(`[DNC] Added ${phone} to DNC registry`);
        return { success: true, phone };
    }

    /**
     * DNC a specific lead by their leadId (cleaner for agent UI integration)
     */
    @SetMetadata('isPublic', true)
    @Post('dnc/lead/:leadId')
    async addLeadToDnc(
        @Param('leadId') leadId: string,
        @Body() body: { reason?: string }
    ) {
        const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
        if (!lead) return { error: 'Lead not found' };

        // Upsert DNC registry
        await this.prisma.dncRegistry.upsert({
            where: { phone: lead.phone },
            update: { source: body.reason || 'agent_request' },
            create: {
                phone: lead.phone,
                accountId: lead.accountId,
                source: body.reason || 'agent_request',
            },
        });

        // Mark the lead as DNC
        await this.prisma.lead.update({
            where: { id: leadId },
            data: { status: 'DNC' as any },
        });

        console.log(`[DNC] Lead ${leadId} (${lead.phone}) added to DNC registry`);
        return { success: true, leadId, phone: lead.phone };
    }


    // ── Scheduled Callbacks ────────────────────────────────────────────────

    @Get('scheduled-callbacks')
    async getScheduledCallbacks(@Req() req: Request & { user?: any }, @Query('agentId') agentId?: string) {
        const aid = agentId || req.user?.userId;
        return this.prisma.scheduledCallback.findMany({
            where: { agentId: aid, status: 'PENDING' },
            orderBy: { scheduledAt: 'asc' },
        });
    }

    @Post('scheduled-callbacks')
    async createScheduledCallback(
        @Req() req: Request & { user?: any },
        @Body() body: {
            agentId?: string;
            accountId?: string;
            customerName: string;
            customerPhone: string;
            customerEmail?: string;
            scheduledAt: string;
            notes?: string;
        },
    ) {
        const agentId = body.agentId || req.user?.userId;
        const accountId = body.accountId || req.user?.accountId;
        return this.prisma.scheduledCallback.create({
            data: {
                agentId,
                accountId,
                customerName: body.customerName,
                customerPhone: body.customerPhone,
                customerEmail: body.customerEmail,
                scheduledAt: new Date(body.scheduledAt),
                notes: body.notes,
            },
        });
    }

    @Patch('scheduled-callbacks/:id')
    async updateScheduledCallback(
        @Param('id') id: string,
        @Body() body: { status?: 'PENDING' | 'DONE' | 'CANCELLED'; notes?: string; scheduledAt?: string },
    ) {
        return this.prisma.scheduledCallback.update({
            where: { id },
            data: {
                ...(body.status && { status: body.status }),
                ...(body.notes !== undefined && { notes: body.notes }),
                ...(body.scheduledAt && { scheduledAt: new Date(body.scheduledAt) }),
            },
        });
    }

    @Delete('scheduled-callbacks/:id')
    async deleteScheduledCallback(@Param('id') id: string) {
        await this.prisma.scheduledCallback.delete({ where: { id } });
        return { success: true };
    }

    // ─────────────────────────────────────────────────────────────────────

    /** Convert any phone format to E.164 (+12345678900) */
    private normalizeToE164(phone: string): string {
        let d = (phone || '').trim();
        // 1. If it starts with +, treat as already international but strip non-digits after +
        if (d.startsWith('+')) {
            return '+' + d.slice(1).replace(/\D/g, '');
        }

        // 2. Clear all non-digits
        d = d.replace(/\D/g, '');
        if (!d) return '';

        // 3. Handle 00 international prefix
        if (d.startsWith('00')) d = d.slice(2);

        // 4. US Logic: 10 digits -> +1, 11 digits starting with 1 -> +
        if (d.length === 10) return '+1' + d;
        if (d.length === 11 && d.startsWith('1')) return '+' + d;

        // 5. Pakistan Logic (User context indicates this might be relevant)
        if (d.length === 10 && (d.startsWith('3') || d.startsWith('03'))) {
            // Likely PK mobile without prefix
            return '+92' + (d.startsWith('0') ? d.slice(1) : d);
        }
        if (d.length >= 12 && d.startsWith('92')) return '+' + d;

        // 6. Fallback: if long enough, assume it's already international, just add +
        if (d.length >= 11) return '+' + d;

        // Default to US +1 if it looks like a local number
        return '+1' + d;
    }
}

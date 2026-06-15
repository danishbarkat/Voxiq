import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import * as Bull from 'bull';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { VoipService } from '../voip/voip.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { CampaignMode, CampaignStatus, LeadStatus, CallStatus, UserStatus } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

interface ParallelDialJob {
    campaignId: string;
    leadIds: string[];
    agentId?: string;
}

@Injectable()
export class DialerService {
    private readonly logger = new Logger(DialerService.name);
    private activeCampaigns: Map<string, NodeJS.Timeout> = new Map();
    private readonly ringingLockWindowMs = 90 * 1000;
    private readonly connectedLockWindowMs = 2 * 60 * 60 * 1000;

    constructor(
        @InjectQueue('dialer') private dialerQueue: Bull.Queue,
        private prisma: PrismaService,
        private voipService: VoipService,
        private websocketGateway: WebsocketGateway,
        private configService: ConfigService,
    ) { }

    @Cron('*/1 * * * *')
    async cleanupStaleRingingCalls(): Promise<void> {
        const cutoff = new Date(Date.now() - this.ringingLockWindowMs);
        const staleCalls = await this.prisma.callLog.findMany({
            where: {
                callStatus: CallStatus.RINGING,
                startedAt: { lt: cutoff },
                endedAt: null,
            },
            select: { id: true },
            take: 500,
        });

        if (staleCalls.length === 0) {
            return;
        }

        const staleIds = staleCalls.map((call) => call.id);
        await this.prisma.callLog.updateMany({
            where: { id: { in: staleIds } },
            data: {
                callStatus: CallStatus.FAILED,
                endedAt: new Date(),
            },
        });

        for (const id of staleIds) {
            this.websocketGateway.broadcastCallUpdate(id, { status: 'hangup' });
        }

        this.logger.warn(`Cleaned up ${staleIds.length} stale ringing call logs older than ${this.ringingLockWindowMs / 1000}s`);
    }

    @Cron('*/2 * * * *')
    async reconcileRecentActiveCalls(): Promise<void> {
        const recentCutoff = new Date(Date.now() - this.connectedLockWindowMs);
        const activeCalls = await this.prisma.callLog.findMany({
            where: {
                callControlId: { not: null },
                endedAt: null,
                startedAt: { gte: recentCutoff },
                callStatus: { in: [CallStatus.RINGING, CallStatus.CONNECTED] },
            },
            select: {
                id: true,
                callControlId: true,
                callStatus: true,
                startedAt: true,
            },
            take: 100,
            orderBy: { startedAt: 'asc' },
        });

        for (const call of activeCalls) {
            if (!call.callControlId) continue;

            try {
                const remote = await this.voipService.getCallStatus(call.callControlId);
                const remoteState = String(remote?.status || '').toLowerCase();
                if (!remoteState) continue;

                if (['active', 'bridged', 'answered', 'answering'].includes(remoteState) && call.callStatus !== CallStatus.CONNECTED) {
                    await this.prisma.callLog.update({
                        where: { id: call.id },
                        data: { callStatus: CallStatus.CONNECTED },
                    });
                    this.websocketGateway.broadcastCallUpdate(call.id, { status: 'connected', callControlId: call.callControlId });
                    continue;
                }

                if (['hangup', 'ended', 'completed', 'finished'].includes(remoteState)) {
                    await this.prisma.callLog.update({
                        where: { id: call.id },
                        data: {
                            callStatus: call.callStatus === CallStatus.CONNECTED ? CallStatus.COMPLETED : CallStatus.FAILED,
                            endedAt: new Date(),
                        },
                    });
                    this.websocketGateway.broadcastCallUpdate(call.id, { status: 'hangup', callControlId: call.callControlId });
                }
            } catch (error) {
                const message = String(error?.message || '');
                if (message.toLowerCase().includes('not found')) {
                    await this.prisma.callLog.update({
                        where: { id: call.id },
                        data: {
                            callStatus: call.callStatus === CallStatus.CONNECTED ? CallStatus.COMPLETED : CallStatus.FAILED,
                            endedAt: new Date(),
                        },
                    });
                    this.websocketGateway.broadcastCallUpdate(call.id, { status: 'hangup', callControlId: call.callControlId });
                }
            }
        }
    }

    /**
     * Start a campaign
     */
    async startCampaign(campaignId: string): Promise<void> {
        const campaign = await this.prisma.campaign.findUnique({
            where: { id: campaignId },
            include: { account: true },
        });

        if (!campaign) {
            throw new NotFoundException('Campaign not found');
        }

        // Update campaign status
        await this.prisma.campaign.update({
            where: { id: campaignId },
            data: { status: CampaignStatus.ACTIVE },
        });

        this.logger.log(`Starting campaign: ${campaign.name} (${campaignId})`);

        // Start campaign execution based on mode
        if (campaign.mode === CampaignMode.PREDICTIVE) {
            await this.startPredictiveDialing(campaignId);
        } else if (campaign.mode === CampaignMode.POWER) {
            await this.startPowerDialing(campaignId);
        } else if (campaign.mode === CampaignMode.PREVIEW) {
            await this.startPreviewDialing(campaignId);
        }

        this.websocketGateway.broadcastCampaignUpdate(campaignId, {
            status: 'active',
        });
    }

    private async resolveAgentId(agentId?: string): Promise<string | null> {
        if (!agentId) return null;
        const user = await this.prisma.user.findUnique({
            where: { id: agentId },
            select: { id: true },
        });
        if (user) return user.id;

        // Fallback to any active user to avoid FK failures (better: map socket agent to user)
        const fallback = await this.prisma.user.findFirst({
            where: { status: UserStatus.ACTIVE },
            select: { id: true },
        });
        return fallback?.id || null;
    }

    /**
     * Pause a campaign
     */
    async pauseCampaign(campaignId: string): Promise<void> {
        this.logger.log(`Pausing campaign: ${campaignId}`);

        // Clear interval if exists
        const interval = this.activeCampaigns.get(campaignId);
        if (interval) {
            clearInterval(interval);
            this.activeCampaigns.delete(campaignId);
        }

        await this.prisma.campaign.update({
            where: { id: campaignId },
            data: { status: CampaignStatus.PAUSED },
        });

        this.websocketGateway.broadcastCampaignUpdate(campaignId, {
            status: 'paused',
        });
    }

    /**
     * Predictive dialing: parallel calls with auto-drop
     */
    private async startPredictiveDialing(campaignId: string): Promise<void> {
        this.logger.log(`Starting predictive dialing for campaign ${campaignId}`);
        // Strict Singleton Enforcement
        const existingInterval = this.activeCampaigns.get(campaignId);
        if (existingInterval) {
            this.logger.warn(`Campaign ${campaignId} already has an active interval. Clearing old interval.`);
            clearInterval(existingInterval);
            this.activeCampaigns.delete(campaignId);
        }

        const campaign = await this.prisma.campaign.findUnique({
            where: { id: campaignId },
        });

        if (!campaign) {
            this.logger.error(`Cannot start predictive dialer: Campaign ${campaignId} not found`);
            throw new NotFoundException('Campaign not found');
        }

        // Prevent overlapping batch dispatches if processing takes longer than pacing
        let isProcessing = false;

        // Execute dialing at pacing interval
        const interval = setInterval(async () => {
            if (isProcessing) {
                this.logger.debug(`Skipping interval for ${campaignId} - previous batch still processing`);
                return;
            }

            isProcessing = true;
            try {
                const availableAgents = this.websocketGateway.getAvailableAgents();

                if (availableAgents.length === 0) {
                    this.logger.debug('No available agents, skipping batch');
                    return;
                }

                // Get next batch of leads (2 per available agent to prevent aggressive over-dialing and skipped numbers)
                const batchSize = Math.max(1, availableAgents.length * 2);
                const leads = await this.getNextLeadBatch(campaignId, batchSize);

                if (leads.length === 0) {
                    this.logger.log(`No more leads for campaign ${campaignId}, pausing campaign`);
                    await this.pauseCampaign(campaignId);
                    return;
                }

                this.logger.log(`Dispatching ${leads.length} leads to predictive dialer for ${availableAgents.length} agents`);
                // Add to queue for parallel dialing
                await this.dialerQueue.add('parallel-dial', {
                    campaignId,
                    leadIds: leads.map((l) => l.id),
                    // Assign to primary agent conceptually, though first one to answer gets the live caller
                    agentId: availableAgents[0],
                }, {
                    removeOnComplete: true, // Prevent Redis memory leak
                    removeOnFail: true
                });
            } catch (error) {
                this.logger.error(`Error in predictive dialing interval: ${error.message}`);
            } finally {
                isProcessing = false;
            }
        }, campaign.pacing * 1000);

        this.activeCampaigns.set(campaignId, interval);
    }

    /**
     * Power dialing: sequential calls with configurable pacing
     */
    private async startPowerDialing(campaignId: string): Promise<void> {
        this.logger.log(`Starting power dialing for campaign ${campaignId}`);
        // Strict Singleton Enforcement
        const existingInterval = this.activeCampaigns.get(campaignId);
        if (existingInterval) {
            this.logger.warn(`Campaign ${campaignId} already has an active interval. Clearing old interval.`);
            clearInterval(existingInterval);
            this.activeCampaigns.delete(campaignId);
        }

        const campaign = await this.prisma.campaign.findUnique({
            where: { id: campaignId },
        });

        if (!campaign) {
            this.logger.error(`Cannot start power dialer: Campaign ${campaignId} not found`);
            throw new NotFoundException('Campaign not found');
        }

        let isProcessing = false;

        const interval = setInterval(async () => {
            if (isProcessing) {
                this.logger.debug(`Skipping interval for ${campaignId} - previous lead still processing`);
                return;
            }

            isProcessing = true;
            try {
                const availableAgents = this.websocketGateway.getAvailableAgents();

                if (availableAgents.length === 0) {
                    return;
                }

                const leads = await this.getNextLeadBatch(campaignId, 1);

                if (leads.length === 0) {
                    this.logger.log(`No more leads for campaign ${campaignId}, pausing campaign`);
                    await this.pauseCampaign(campaignId);
                    return;
                }

                await this.dialerQueue.add('single-dial', {
                    campaignId,
                    leadId: leads[0].id,
                    agentId: availableAgents[0],
                }, {
                    removeOnComplete: true,
                    removeOnFail: true
                });
            } catch (error) {
                this.logger.error(`Error in power dialing interval: ${error.message}`);
            } finally {
                isProcessing = false;
            }
        }, (campaign.pacing || 1) * 1000);

        this.activeCampaigns.set(campaignId, interval);
    }

    /**
     * Preview dialing: manual agent-initiated calls
     */
    private async startPreviewDialing(campaignId: string): Promise<void> {
        // Preview mode doesn't auto-dial, agents manually initiate
        this.logger.log(`Preview mode active for campaign ${campaignId}`);
    }

    /**
     * Execute parallel 3-way dialing
     */
    async executeParallelDial(job: ParallelDialJob): Promise<void> {
        this.logger.log(
            `Executing parallel dial for ${job.leadIds.length} leads`,
        );

        const clientSideDial = this.configService.get<boolean>('CLIENT_SIDE_DIAL');

        const campaign = await this.prisma.campaign.findUnique({
            where: { id: job.campaignId },
            include: { account: true },
        });

        // Feature gate: check outbound call permission + trial expiry + monthly limit
        if (campaign?.account) {
            const acc = campaign.account as any;
            if (!acc.canOutboundCall) {
                this.logger.warn(`Account ${acc.id} does not have outbound call permission`);
                return;
            }
            if (acc.isTrial && acc.trialEndsAt && new Date(acc.trialEndsAt) < new Date()) {
                this.logger.warn(`Account ${acc.id} trial expired on ${acc.trialEndsAt}`);
                return;
            }
            if (acc.monthlyCallLimit !== null) {
                const monthStart = new Date();
                monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
                const used = await this.prisma.callLog.count({
                    where: { agent: { accountId: acc.id }, startedAt: { gte: monthStart } },
                });
                if (used >= acc.monthlyCallLimit) {
                    this.logger.warn(`Account ${acc.id} reached monthly call limit (${used}/${acc.monthlyCallLimit})`);
                    return;
                }
            }
        }

        const leads = await this.prisma.lead.findMany({
            where: { id: { in: job.leadIds } },
            include: { list: true },
        });

        // Check compliance for all leads
        const validLeads: any[] = [];
        for (const lead of leads) {
            const isCompliant = await this.checkCompliance(lead.phone, campaign?.accountId || '');
            if (isCompliant) {
                validLeads.push(lead);
            } else {
                this.logger.warn(`Lead ${lead.id} failed compliance check`);
            }
        }

        if (validLeads.length === 0) {
            return;
        }

        if (clientSideDial) {
            for (const lead of validLeads) {
                const resolvedAgentId = await this.resolveAgentId(job.agentId);
                if (!resolvedAgentId) continue;

                // Use local presence if enabled
                const callerIdentity = campaign?.localPresence
                    ? this.getLocalCallerIdentity(lead.phone, campaign)
                    : {
                        number: this.configService.get<string>('DEFAULT_OUTBOUND_NUMBER') || '+1234567890',
                        callerName: this.getDefaultCallerName(),
                    };

                const callLog = await this.prisma.callLog.create({
                    data: {
                        leadId: lead.id,
                        agentId: resolvedAgentId,
                        campaignId: job.campaignId,
                        startedAt: new Date(),
                        callStatus: CallStatus.RINGING,
                    },
                });
                this.websocketGateway.notifyIncomingCall(resolvedAgentId, {
                    callId: null,
                    lead,
                    callLogId: callLog.id,
                    callerNumber: callerIdentity.number,
                    callerName: callerIdentity.callerName,
                });
            }
            return;
        }

        // Server-side dialing (Telnyx)
        const callPromises = validLeads.map(async (lead) => {
            const resolvedAgentId = await this.resolveAgentId(job.agentId);
            if (!resolvedAgentId) return null;

            const callLog = await this.prisma.callLog.create({
                data: {
                    leadId: lead.id,
                    agentId: resolvedAgentId,
                    campaignId: job.campaignId,
                    startedAt: new Date(),
                    callStatus: CallStatus.RINGING,
                },
            });

            try {
                const callerIdentity = campaign?.localPresence
                    ? this.getLocalCallerIdentity(lead.phone, campaign)
                    : {
                        number: this.configService.get<string>('DEFAULT_OUTBOUND_NUMBER') || '+1234567890',
                        callerName: this.getDefaultCallerName(),
                    };

                const result = await this.voipService.initiateCall({
                    to: this.normalizePhone(lead.phone),
                    from: callerIdentity.number,
                    callerName: callerIdentity.callerName,
                    connectionId: process.env.TELNYX_SIP_CONNECTION_ID || '',
                    callControlAppId: process.env.TELNYX_CALL_CONTROL_APP_ID || '',
                    webhookUrl: process.env.TELNYX_WEBHOOK_URL || undefined,
                    answeringMachineDetection: 'detect',
                    record: campaign?.record ? 'record-from-answer' : 'none',
                    recordingChannels: 'dual',
                });

                // Save call control id for webhooks
                await this.prisma.callLog.update({
                    where: { id: callLog.id },
                    data: { callControlId: result.callId },
                });

                return { lead, callLog, callId: result.callId };
            } catch (error) {
                await this.prisma.callLog.update({
                    where: { id: callLog.id },
                    data: { callStatus: CallStatus.FAILED, endedAt: new Date() },
                });
                return null;
            }
        });

        const results = await Promise.all(callPromises);
        const successfulCalls = results.filter((r) => r !== null);

        // Wait for first answer (simulated - in production, this comes from webhooks)
        // For now, we'll just connect the first call
        if (successfulCalls.length > 0) {
            const firstCall = successfulCalls[0];

            // Drop remaining calls
            for (let i = 1; i < successfulCalls.length; i++) {
                await this.voipService.terminateCall(successfulCalls[i].callId);
                await this.prisma.callLog.update({
                    where: { id: successfulCalls[i].callLog.id },
                    data: { callStatus: CallStatus.FAILED, endedAt: new Date() },
                });
            }

            // Connect first call to agent
            await this.prisma.callLog.update({
                where: { id: firstCall.callLog.id },
                data: { callStatus: CallStatus.CONNECTED },
            });

            // Notify agent
            const resolvedAgentId = await this.resolveAgentId(job.agentId);
            if (resolvedAgentId) {
                this.websocketGateway.notifyIncomingCall(resolvedAgentId, {
                    callId: firstCall.callId,
                    lead: firstCall.lead,
                    callLogId: firstCall.callLog.id,
                });
            }
        }
    }

    /**
     * Get next batch of leads for campaign
     */
    private async getNextLeadBatch(
        campaignId: string,
        batchSize: number,
    ): Promise<any[]> {
        const campaign = await this.prisma.campaign.findUnique({
            where: { id: campaignId },
            include: {
                account: true,
                lists: true,
            },
        });

        const assignedListIds =
            campaign?.lists?.map((cl) => cl.listId).filter(Boolean) || [];

        // Build today's date range (midnight to midnight) to block same-day re-dialing
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        // ── Lead Locking ──────────────────────────────────────────────────────
        // Exclude leads that are CURRENTLY being dialed by any other agent.
        // This prevents two agents on the same list from dialing the same number simultaneously.
        // We check CallLogs created in the last 10 minutes with RINGING or CONNECTED status.
        const activeCallLogs = await this.prisma.callLog.findMany({
            where: {
                OR: [
                    {
                        callStatus: CallStatus.RINGING,
                        startedAt: { gte: new Date(Date.now() - this.ringingLockWindowMs) },
                    },
                    {
                        callStatus: CallStatus.CONNECTED,
                        startedAt: { gte: new Date(Date.now() - this.connectedLockWindowMs) },
                    },
                ],
            },
            select: { leadId: true },
        });
        const currentlyBeingDialed = activeCallLogs.map(cl => cl.leadId).filter((id): id is string => id !== null);
        this.logger.debug(`Leads currently locked by active calls: ${currentlyBeingDialed.length}`);
        // ─────────────────────────────────────────────────────────────────────

        // Build the "not currently being dialed" exclusion filter
        const notBeingDialed = currentlyBeingDialed.length > 0
            ? { id: { notIn: currentlyBeingDialed } }
            : {};

        // Priority 1: Fresh leads (NEW, CALLBACK, NO_ANSWER) — these get dialed first
        const freshLeads = await this.prisma.lead.findMany({
            where: {
                accountId: campaign?.accountId || '',
                status: { in: [LeadStatus.NEW, LeadStatus.CALLBACK, LeadStatus.NO_ANSWER] },
                ...(assignedListIds.length > 0 ? { listId: { in: assignedListIds } } : {}),
                ...notBeingDialed, // Exclude leads currently being dialed by other agents
            },
            take: batchSize,
            orderBy: [
                { status: 'asc' },   // NEW before CALLBACK before NO_ANSWER
                { updatedAt: 'asc' }, // Oldest first within each status group
            ],
            include: { list: true },
        });

        if (freshLeads.length >= batchSize) {
            return freshLeads;
        }

        // Priority 2: CONTACTED leads from PREVIOUS days (not today) — only if fresh pool is exhausted
        const previouslyContactedLeads = await this.prisma.lead.findMany({
            where: {
                accountId: campaign?.accountId || '',
                status: LeadStatus.CONTACTED,
                updatedAt: { lt: todayStart }, // Only leads contacted BEFORE today
                ...(assignedListIds.length > 0 ? { listId: { in: assignedListIds } } : {}),
                ...notBeingDialed, // Exclude leads currently being dialed by other agents
            },
            take: batchSize - freshLeads.length,
            orderBy: { updatedAt: 'asc' }, // Oldest contacted leads first
            include: { list: true },
        });

        if (freshLeads.length === 0 && previouslyContactedLeads.length === 0) {
            this.logger.log(`No more dialable leads for campaign ${campaign?.id} today`);
        }

        return [...freshLeads, ...previouslyContactedLeads];
    }

    /**
     * Check compliance (DNC, quiet hours)
     */
    private async checkCompliance(
        phone: string,
        accountId: string,
    ): Promise<boolean> {
        // Check DNC registry
        const dncEntry = await this.prisma.dncRegistry.findUnique({
            where: { phone },
        });

        if (dncEntry) {
            this.logger.warn(`Phone ${phone} is in DNC registry`);
            return false;
        }

        // Quiet hours (server-local or lead-local if timezone known)
        const quietEnabled = this.configService.get<boolean>('QUIET_HOURS_ENABLED');
        if (quietEnabled === false) {
            return true;
        }

        const quietStart = this.configService.get<number>('QUIET_HOURS_START') ?? 21;
        const quietEnd = this.configService.get<number>('QUIET_HOURS_END') ?? 8;

        // If start == end, treat as disabled
        if (quietStart === quietEnd) {
            return true;
        }
        const nowHour = new Date().getHours();

        // Quiet hours logic: if window spans midnight, block when hour >= start OR < end
        const inQuiet =
            quietStart < quietEnd
                ? nowHour >= quietStart && nowHour < quietEnd
                : nowHour >= quietStart || nowHour < quietEnd;

        if (inQuiet) {
            this.logger.warn(`Quiet hours active, blocking call to ${phone}`);
            return false;
        }

        return true;
    }

    /**
     * Get local presence number based on lead's area code
     */
    private getDefaultCallerName(): string | undefined {
        const callerName = this.configService.get<string>('DEFAULT_OUTBOUND_CALLER_NAME') || 'RMESSAGES LLC';
        return callerName.trim() || 'RMESSAGES LLC';
    }

    private getLocalCallerIdentity(leadPhone: string, campaign?: any): { number: string; callerName?: string } {
        const defaultNumber =
            this.configService.get<string>('DEFAULT_OUTBOUND_NUMBER') || '+1234567890';
        const defaultCallerName = this.getDefaultCallerName();
        const areaCode = leadPhone?.replace(/\D/g, '').slice(0, 3);

        const localMap: Record<string, { number: string; callerName?: string }> = {};

        // 1. First priority: Campaign's specific number pool
        if (campaign?.numberPool && Array.isArray(campaign.numberPool) && campaign.numberPool.length > 0) {
            campaign.numberPool.forEach((entry: any) => {
                if (entry.number && entry.areaCode) {
                    localMap[entry.areaCode.replace(/\D/g, '')] = {
                        number: entry.number,
                        callerName: entry.callerName?.trim() || defaultCallerName,
                    };
                }
            });
        }

        // 2. Second priority: Account's specific number pool (if campaign pool is empty or doesn't match)
        // We'll only check account pool if the area code hasn't been found yet
        if (!localMap[areaCode || ''] && campaign?.account?.numberPool && Array.isArray(campaign.account.numberPool)) {
            campaign.account.numberPool.forEach((entry: any) => {
                const ac = (entry.areaCode || '').replace(/\D/g, '');
                if (entry.number && ac && !localMap[ac]) {
                    localMap[ac] = {
                        number: entry.number,
                        callerName: entry.callerName?.trim() || defaultCallerName,
                    };
                }
            });
        }

        // 3. Third priority: Fallback to ENV CSV (if not found in campaign pool)
        if (!localMap[areaCode || '']) {
            const mapEnv = this.configService.get<string>('LOCAL_PRESENCE_NUMBERS') || '';
            mapEnv
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
                .forEach((entry) => {
                    const [num] = entry.split(':');
                    if (num?.startsWith('+') && num.length >= 8) {
                        // Use first 3 digits after country code as area heuristic
                        const ac = num.replace('+', '').slice(-10, -7);
                        // Only add if not already overridden by campaign pool
                        if (!localMap[ac]) {
                            localMap[ac] = {
                                number: num,
                                callerName: defaultCallerName,
                            };
                        }
                    }
                });
        }

        const selected = (areaCode && localMap[areaCode]) ? localMap[areaCode] : null;
        return selected
            ? selected
            : { number: defaultNumber, callerName: defaultCallerName };
    }

    private normalizePhone(phone: string): string {
        const original = (phone || '').trim();
        if (original.startsWith('+')) return '+' + original.slice(1).replace(/\D/g, '');
        let d = original.replace(/\D/g, '');
        if (!d) return original;
        if (d.startsWith('0092')) d = d.slice(2);
        else if (d.startsWith('92') && d.length >= 12) return '+' + d;
        else if (d.length === 11 && d.startsWith('0')) return '+92' + d.slice(1);
        else if (d.length === 10 && d.startsWith('3')) return '+92' + d;
        else if (d.length === 10) return '+1' + d;
        else if (d.length === 11 && d.startsWith('1')) return '+' + d;
        return '+' + d;
    }

    /**
     * Handle call disposition
     */
    async handleDisposition(
        callLogId: string,
        disposition: string,
        notes?: string,
        callbackAt?: string,
        dealValue?: number,
    ): Promise<void> {
        const callLog = await this.prisma.callLog.findUnique({
            where: { id: callLogId },
            include: { lead: true },
        });

        if (!callLog) {
            throw new NotFoundException('Call log not found');
        }

        // Update call log
        await this.prisma.callLog.update({
            where: { id: callLogId },
            data: {
                disposition,
                notes,
                dealValue,
                endedAt: new Date(),
                callStatus: CallStatus.COMPLETED,
            } as any,
        });

        // Update lead status based on disposition
        // Normalize disposition string: lowercase + spaces to underscores
        const normalizedDisp = disposition.toLowerCase().replace(/ /g, '_');
        let leadStatus: LeadStatus;
        switch (normalizedDisp) {
            case 'interested':
            case 'booked':
            case 'sale':
                leadStatus = LeadStatus.BOOKED;
                break;
            case 'callback':
                leadStatus = LeadStatus.CALLBACK;
                break;
            case 'no_answer':
                leadStatus = LeadStatus.NO_ANSWER;
                break;
            case 'voicemail':
                // Voicemail = no answer for recycle purposes — will be attempted again next cycle
                leadStatus = LeadStatus.NO_ANSWER;
                break;
            case 'not_interested':
            case 'contacted':
            case 'wrong_number':
                // Successfully contacted but not interested or wrong number: mark CONTACTED so they don't recycle
                leadStatus = LeadStatus.CONTACTED;
                break;
            case 'dnc':
                leadStatus = LeadStatus.DNC;
                // Add to DNC registry (upsert to avoid unique constraint failure)
                if (callLog.lead) {
                    await this.prisma.dncRegistry.upsert({
                        where: { phone: callLog.lead.phone },
                        update: {
                            accountId: callLog.lead.accountId,
                            source: 'agent_request',
                        },
                        create: {
                            phone: callLog.lead.phone,
                            accountId: callLog.lead.accountId,
                            source: 'agent_request',
                        },
                    });
                }
                break;
            default:
                // Unknown dispositions: mark CONTACTED to prevent unlimited recycling
                this.logger.warn(`Unknown disposition '${disposition}' → marking CONTACTED to stop recycling`);
                leadStatus = LeadStatus.CONTACTED;
        }

        if (callLog.leadId) {
            await this.prisma.lead.update({
                where: { id: callLog.leadId },
                data: {
                    status: leadStatus,
                    ...(callbackAt && leadStatus === LeadStatus.CALLBACK ? { callbackAt: new Date(callbackAt) } : {})
                },
            });
        }

        this.logger.log(`Call ${callLogId} dispositioned as ${disposition}`);
    }

    /**
     * Create a call log entry for a manual or client-side initiated call
     */
    async logCall(data: { leadId?: string; agentId: string; callControlId?: string; campaignId?: string; manualNumber?: string; manualName?: string; isManual?: boolean }): Promise<any> {
        let campaignId = data.campaignId;
        let leadId = data.leadId;
        let targetPhone = data.manualNumber || null;

        // If it's a manual call and no leadId is provided, we find or create a "Manual" lead
        if (data.isManual && !leadId && data.manualNumber) {
            const agent = await this.prisma.user.findUnique({
                where: { id: data.agentId },
                select: { accountId: true }
            });
            
            if (agent) {
                // Find or create a default "Manual Leads" list for this account
                let list = await this.prisma.list.findFirst({
                    where: { accountId: agent.accountId, name: 'Manual Leads' }
                });
                
                if (!list) {
                    list = await this.prisma.list.create({
                        data: {
                            name: 'Manual Leads',
                            accountId: agent.accountId,
                            description: 'Auto-created list for manual dials'
                        }
                    });
                }

                // Parse name if provided
                const nameParts = (data.manualName || '').trim().split(' ');
                const firstName = nameParts[0] || 'Manual';
                const lastName = nameParts.slice(1).join(' ') || 'Dial';

                // Check if this number already exists as a lead
                let lead = await this.prisma.lead.findFirst({
                    where: { phone: data.manualNumber, accountId: agent.accountId }
                });

                if (!lead) {
                    lead = await this.prisma.lead.create({
                        data: {
                            firstName,
                            lastName,
                            phone: data.manualNumber,
                            accountId: agent.accountId,
                            listId: list.id,
                            customFields: {}
                        }
                    });
                } else if (data.manualName && (lead.firstName === 'Manual' || !lead.firstName)) {
                    // Update name if it was a placeholder and agent now provided a real name
                    lead = await this.prisma.lead.update({
                        where: { id: lead.id },
                        data: { firstName, lastName }
                    });
                }
                leadId = lead.id;
                targetPhone = lead.phone;
            }
        }

        if (!leadId) {
            throw new Error('leadId or manualNumber is required to log a call');
        }

        // If no campaignId provided, try to find one associated with the lead's account
        if (!campaignId) {
            const lead = await this.prisma.lead.findUnique({
                where: { id: leadId },
                select: { accountId: true },
            });
            if (lead) {
                const campaign = await this.prisma.campaign.findFirst({
                    where: { accountId: lead.accountId },
                    select: { id: true },
                });
                campaignId = campaign?.id;
            }
        }

        if (!campaignId) {
            const fallback = await this.prisma.campaign.findFirst({ select: { id: true } });
            campaignId = fallback?.id;
        }

        if (!campaignId) {
            // No campaign at all — auto-create a default one so the FK is satisfied
            const agent = await this.prisma.user.findUnique({
                where: { id: data.agentId },
                select: { accountId: true },
            });
            if (!agent) throw new Error('Agent not found');
            const defaultCampaign = await this.prisma.campaign.create({
                data: {
                    name: 'Default Campaign',
                    accountId: agent.accountId,
                    status: CampaignStatus.ACTIVE,
                    mode: CampaignMode.PREVIEW,
                    pacing: 1,
                },
            });
            campaignId = defaultCampaign.id;
            this.logger.log(`Auto-created default campaign ${campaignId} for account ${agent.accountId}`);
        }

        const [lead, agent] = await Promise.all([
            leadId
                ? this.prisma.lead.findUnique({
                    where: { id: leadId },
                    select: { phone: true },
                })
                : Promise.resolve(null),
            this.prisma.user.findUnique({
                where: { id: data.agentId },
                select: { callerNumber: true },
            }),
        ]);

        return this.prisma.callLog.create({
            data: {
                leadId,
                agentId: data.agentId,
                campaignId,
                callControlId: data.callControlId,
                startedAt: new Date(),
                callStatus: CallStatus.RINGING,
                direction: 'outbound',
                fromNumber: agent?.callerNumber || null,
                toNumber: targetPhone || lead?.phone || null,
            },
        });
    }
}

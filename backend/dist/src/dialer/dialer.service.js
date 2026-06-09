"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var DialerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DialerService = void 0;
const common_1 = require("@nestjs/common");
const bull_1 = require("@nestjs/bull");
const Bull = __importStar(require("bull"));
const prisma_service_1 = require("../prisma/prisma.service");
const voip_service_1 = require("../voip/voip.service");
const websocket_gateway_1 = require("../websocket/websocket.gateway");
const client_1 = require("@prisma/client");
const config_1 = require("@nestjs/config");
let DialerService = DialerService_1 = class DialerService {
    dialerQueue;
    prisma;
    voipService;
    websocketGateway;
    configService;
    logger = new common_1.Logger(DialerService_1.name);
    activeCampaigns = new Map();
    constructor(dialerQueue, prisma, voipService, websocketGateway, configService) {
        this.dialerQueue = dialerQueue;
        this.prisma = prisma;
        this.voipService = voipService;
        this.websocketGateway = websocketGateway;
        this.configService = configService;
    }
    async startCampaign(campaignId) {
        const campaign = await this.prisma.campaign.findUnique({
            where: { id: campaignId },
            include: { account: true },
        });
        if (!campaign) {
            throw new common_1.NotFoundException('Campaign not found');
        }
        await this.prisma.campaign.update({
            where: { id: campaignId },
            data: { status: client_1.CampaignStatus.ACTIVE },
        });
        this.logger.log(`Starting campaign: ${campaign.name} (${campaignId})`);
        if (campaign.mode === client_1.CampaignMode.PREDICTIVE) {
            await this.startPredictiveDialing(campaignId);
        }
        else if (campaign.mode === client_1.CampaignMode.POWER) {
            await this.startPowerDialing(campaignId);
        }
        else if (campaign.mode === client_1.CampaignMode.PREVIEW) {
            await this.startPreviewDialing(campaignId);
        }
        this.websocketGateway.broadcastCampaignUpdate(campaignId, {
            status: 'active',
        });
    }
    async resolveAgentId(agentId) {
        if (!agentId)
            return null;
        const user = await this.prisma.user.findUnique({
            where: { id: agentId },
            select: { id: true },
        });
        if (user)
            return user.id;
        const fallback = await this.prisma.user.findFirst({
            where: { status: client_1.UserStatus.ACTIVE },
            select: { id: true },
        });
        return fallback?.id || null;
    }
    async pauseCampaign(campaignId) {
        this.logger.log(`Pausing campaign: ${campaignId}`);
        const interval = this.activeCampaigns.get(campaignId);
        if (interval) {
            clearInterval(interval);
            this.activeCampaigns.delete(campaignId);
        }
        await this.prisma.campaign.update({
            where: { id: campaignId },
            data: { status: client_1.CampaignStatus.PAUSED },
        });
        this.websocketGateway.broadcastCampaignUpdate(campaignId, {
            status: 'paused',
        });
    }
    async startPredictiveDialing(campaignId) {
        this.logger.log(`Starting predictive dialing for campaign ${campaignId}`);
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
            throw new common_1.NotFoundException('Campaign not found');
        }
        let isProcessing = false;
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
                const batchSize = Math.max(1, availableAgents.length * 2);
                const leads = await this.getNextLeadBatch(campaignId, batchSize);
                if (leads.length === 0) {
                    this.logger.log(`No more leads for campaign ${campaignId}, pausing campaign`);
                    await this.pauseCampaign(campaignId);
                    return;
                }
                this.logger.log(`Dispatching ${leads.length} leads to predictive dialer for ${availableAgents.length} agents`);
                await this.dialerQueue.add('parallel-dial', {
                    campaignId,
                    leadIds: leads.map((l) => l.id),
                    agentId: availableAgents[0],
                }, {
                    removeOnComplete: true,
                    removeOnFail: true
                });
            }
            catch (error) {
                this.logger.error(`Error in predictive dialing interval: ${error.message}`);
            }
            finally {
                isProcessing = false;
            }
        }, campaign.pacing * 1000);
        this.activeCampaigns.set(campaignId, interval);
    }
    async startPowerDialing(campaignId) {
        this.logger.log(`Starting power dialing for campaign ${campaignId}`);
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
            throw new common_1.NotFoundException('Campaign not found');
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
            }
            catch (error) {
                this.logger.error(`Error in power dialing interval: ${error.message}`);
            }
            finally {
                isProcessing = false;
            }
        }, (campaign.pacing || 1) * 1000);
        this.activeCampaigns.set(campaignId, interval);
    }
    async startPreviewDialing(campaignId) {
        this.logger.log(`Preview mode active for campaign ${campaignId}`);
    }
    async executeParallelDial(job) {
        this.logger.log(`Executing parallel dial for ${job.leadIds.length} leads`);
        const clientSideDial = this.configService.get('CLIENT_SIDE_DIAL');
        const campaign = await this.prisma.campaign.findUnique({
            where: { id: job.campaignId },
            include: { account: true },
        });
        if (campaign?.account) {
            const acc = campaign.account;
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
                monthStart.setDate(1);
                monthStart.setHours(0, 0, 0, 0);
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
        const validLeads = [];
        for (const lead of leads) {
            const isCompliant = await this.checkCompliance(lead.phone, campaign?.accountId || '');
            if (isCompliant) {
                validLeads.push(lead);
            }
            else {
                this.logger.warn(`Lead ${lead.id} failed compliance check`);
            }
        }
        if (validLeads.length === 0) {
            return;
        }
        if (clientSideDial) {
            for (const lead of validLeads) {
                const resolvedAgentId = await this.resolveAgentId(job.agentId);
                if (!resolvedAgentId)
                    continue;
                const callerIdentity = campaign?.localPresence
                    ? this.getLocalCallerIdentity(lead.phone, campaign)
                    : {
                        number: this.configService.get('DEFAULT_OUTBOUND_NUMBER') || '+1234567890',
                        callerName: this.getDefaultCallerName(),
                    };
                const callLog = await this.prisma.callLog.create({
                    data: {
                        leadId: lead.id,
                        agentId: resolvedAgentId,
                        campaignId: job.campaignId,
                        startedAt: new Date(),
                        callStatus: client_1.CallStatus.RINGING,
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
        const callPromises = validLeads.map(async (lead) => {
            const resolvedAgentId = await this.resolveAgentId(job.agentId);
            if (!resolvedAgentId)
                return null;
            const callLog = await this.prisma.callLog.create({
                data: {
                    leadId: lead.id,
                    agentId: resolvedAgentId,
                    campaignId: job.campaignId,
                    startedAt: new Date(),
                    callStatus: client_1.CallStatus.RINGING,
                },
            });
            try {
                const callerIdentity = campaign?.localPresence
                    ? this.getLocalCallerIdentity(lead.phone, campaign)
                    : {
                        number: this.configService.get('DEFAULT_OUTBOUND_NUMBER') || '+1234567890',
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
                await this.prisma.callLog.update({
                    where: { id: callLog.id },
                    data: { callControlId: result.callId },
                });
                return { lead, callLog, callId: result.callId };
            }
            catch (error) {
                await this.prisma.callLog.update({
                    where: { id: callLog.id },
                    data: { callStatus: client_1.CallStatus.FAILED, endedAt: new Date() },
                });
                return null;
            }
        });
        const results = await Promise.all(callPromises);
        const successfulCalls = results.filter((r) => r !== null);
        if (successfulCalls.length > 0) {
            const firstCall = successfulCalls[0];
            for (let i = 1; i < successfulCalls.length; i++) {
                await this.voipService.terminateCall(successfulCalls[i].callId);
                await this.prisma.callLog.update({
                    where: { id: successfulCalls[i].callLog.id },
                    data: { callStatus: client_1.CallStatus.FAILED, endedAt: new Date() },
                });
            }
            await this.prisma.callLog.update({
                where: { id: firstCall.callLog.id },
                data: { callStatus: client_1.CallStatus.CONNECTED },
            });
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
    async getNextLeadBatch(campaignId, batchSize) {
        const campaign = await this.prisma.campaign.findUnique({
            where: { id: campaignId },
            include: {
                account: true,
                lists: true,
            },
        });
        const assignedListIds = campaign?.lists?.map((cl) => cl.listId).filter(Boolean) || [];
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        const activeCallLogs = await this.prisma.callLog.findMany({
            where: {
                callStatus: { in: [client_1.CallStatus.RINGING, client_1.CallStatus.CONNECTED] },
                startedAt: { gte: tenMinutesAgo },
            },
            select: { leadId: true },
        });
        const currentlyBeingDialed = activeCallLogs.map(cl => cl.leadId).filter((id) => id !== null);
        this.logger.debug(`Leads currently locked by active calls: ${currentlyBeingDialed.length}`);
        const notBeingDialed = currentlyBeingDialed.length > 0
            ? { id: { notIn: currentlyBeingDialed } }
            : {};
        const freshLeads = await this.prisma.lead.findMany({
            where: {
                accountId: campaign?.accountId || '',
                status: { in: [client_1.LeadStatus.NEW, client_1.LeadStatus.CALLBACK, client_1.LeadStatus.NO_ANSWER] },
                ...(assignedListIds.length > 0 ? { listId: { in: assignedListIds } } : {}),
                ...notBeingDialed,
            },
            take: batchSize,
            orderBy: [
                { status: 'asc' },
                { updatedAt: 'asc' },
            ],
            include: { list: true },
        });
        if (freshLeads.length >= batchSize) {
            return freshLeads;
        }
        const previouslyContactedLeads = await this.prisma.lead.findMany({
            where: {
                accountId: campaign?.accountId || '',
                status: client_1.LeadStatus.CONTACTED,
                updatedAt: { lt: todayStart },
                ...(assignedListIds.length > 0 ? { listId: { in: assignedListIds } } : {}),
                ...notBeingDialed,
            },
            take: batchSize - freshLeads.length,
            orderBy: { updatedAt: 'asc' },
            include: { list: true },
        });
        if (freshLeads.length === 0 && previouslyContactedLeads.length === 0) {
            this.logger.log(`No more dialable leads for campaign ${campaign?.id} today`);
        }
        return [...freshLeads, ...previouslyContactedLeads];
    }
    async checkCompliance(phone, accountId) {
        const dncEntry = await this.prisma.dncRegistry.findUnique({
            where: { phone },
        });
        if (dncEntry) {
            this.logger.warn(`Phone ${phone} is in DNC registry`);
            return false;
        }
        const quietEnabled = this.configService.get('QUIET_HOURS_ENABLED');
        if (quietEnabled === false) {
            return true;
        }
        const quietStart = this.configService.get('QUIET_HOURS_START') ?? 21;
        const quietEnd = this.configService.get('QUIET_HOURS_END') ?? 8;
        if (quietStart === quietEnd) {
            return true;
        }
        const nowHour = new Date().getHours();
        const inQuiet = quietStart < quietEnd
            ? nowHour >= quietStart && nowHour < quietEnd
            : nowHour >= quietStart || nowHour < quietEnd;
        if (inQuiet) {
            this.logger.warn(`Quiet hours active, blocking call to ${phone}`);
            return false;
        }
        return true;
    }
    getDefaultCallerName() {
        const callerName = this.configService.get('DEFAULT_OUTBOUND_CALLER_NAME') || 'RMESSAGES LLC';
        return callerName.trim() || 'RMESSAGES LLC';
    }
    getLocalCallerIdentity(leadPhone, campaign) {
        const defaultNumber = this.configService.get('DEFAULT_OUTBOUND_NUMBER') || '+1234567890';
        const defaultCallerName = this.getDefaultCallerName();
        const areaCode = leadPhone?.replace(/\D/g, '').slice(0, 3);
        const localMap = {};
        if (campaign?.numberPool && Array.isArray(campaign.numberPool) && campaign.numberPool.length > 0) {
            campaign.numberPool.forEach((entry) => {
                if (entry.number && entry.areaCode) {
                    localMap[entry.areaCode.replace(/\D/g, '')] = {
                        number: entry.number,
                        callerName: entry.callerName?.trim() || defaultCallerName,
                    };
                }
            });
        }
        if (!localMap[areaCode || ''] && campaign?.account?.numberPool && Array.isArray(campaign.account.numberPool)) {
            campaign.account.numberPool.forEach((entry) => {
                const ac = (entry.areaCode || '').replace(/\D/g, '');
                if (entry.number && ac && !localMap[ac]) {
                    localMap[ac] = {
                        number: entry.number,
                        callerName: entry.callerName?.trim() || defaultCallerName,
                    };
                }
            });
        }
        if (!localMap[areaCode || '']) {
            const mapEnv = this.configService.get('LOCAL_PRESENCE_NUMBERS') || '';
            mapEnv
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
                .forEach((entry) => {
                const [num] = entry.split(':');
                if (num?.startsWith('+') && num.length >= 8) {
                    const ac = num.replace('+', '').slice(-10, -7);
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
    normalizePhone(phone) {
        const original = (phone || '').trim();
        if (original.startsWith('+'))
            return '+' + original.slice(1).replace(/\D/g, '');
        let d = original.replace(/\D/g, '');
        if (!d)
            return original;
        if (d.startsWith('0092'))
            d = d.slice(2);
        else if (d.startsWith('92') && d.length >= 12)
            return '+' + d;
        else if (d.length === 11 && d.startsWith('0'))
            return '+92' + d.slice(1);
        else if (d.length === 10 && d.startsWith('3'))
            return '+92' + d;
        else if (d.length === 10)
            return '+1' + d;
        else if (d.length === 11 && d.startsWith('1'))
            return '+' + d;
        return '+' + d;
    }
    async handleDisposition(callLogId, disposition, notes, callbackAt, dealValue) {
        const callLog = await this.prisma.callLog.findUnique({
            where: { id: callLogId },
            include: { lead: true },
        });
        if (!callLog) {
            throw new common_1.NotFoundException('Call log not found');
        }
        await this.prisma.callLog.update({
            where: { id: callLogId },
            data: {
                disposition,
                notes,
                dealValue,
                endedAt: new Date(),
                callStatus: client_1.CallStatus.COMPLETED,
            },
        });
        const normalizedDisp = disposition.toLowerCase().replace(/ /g, '_');
        let leadStatus;
        switch (normalizedDisp) {
            case 'interested':
            case 'booked':
            case 'sale':
                leadStatus = client_1.LeadStatus.BOOKED;
                break;
            case 'callback':
                leadStatus = client_1.LeadStatus.CALLBACK;
                break;
            case 'no_answer':
                leadStatus = client_1.LeadStatus.NO_ANSWER;
                break;
            case 'voicemail':
                leadStatus = client_1.LeadStatus.NO_ANSWER;
                break;
            case 'not_interested':
            case 'contacted':
            case 'wrong_number':
                leadStatus = client_1.LeadStatus.CONTACTED;
                break;
            case 'dnc':
                leadStatus = client_1.LeadStatus.DNC;
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
                this.logger.warn(`Unknown disposition '${disposition}' → marking CONTACTED to stop recycling`);
                leadStatus = client_1.LeadStatus.CONTACTED;
        }
        if (callLog.leadId) {
            await this.prisma.lead.update({
                where: { id: callLog.leadId },
                data: {
                    status: leadStatus,
                    ...(callbackAt && leadStatus === client_1.LeadStatus.CALLBACK ? { callbackAt: new Date(callbackAt) } : {})
                },
            });
        }
        this.logger.log(`Call ${callLogId} dispositioned as ${disposition}`);
    }
    async logCall(data) {
        let campaignId = data.campaignId;
        let leadId = data.leadId;
        let targetPhone = data.manualNumber || null;
        if (data.isManual && !leadId && data.manualNumber) {
            const agent = await this.prisma.user.findUnique({
                where: { id: data.agentId },
                select: { accountId: true }
            });
            if (agent) {
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
                const nameParts = (data.manualName || '').trim().split(' ');
                const firstName = nameParts[0] || 'Manual';
                const lastName = nameParts.slice(1).join(' ') || 'Dial';
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
                }
                else if (data.manualName && (lead.firstName === 'Manual' || !lead.firstName)) {
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
            const agent = await this.prisma.user.findUnique({
                where: { id: data.agentId },
                select: { accountId: true },
            });
            if (!agent)
                throw new Error('Agent not found');
            const defaultCampaign = await this.prisma.campaign.create({
                data: {
                    name: 'Default Campaign',
                    accountId: agent.accountId,
                    status: client_1.CampaignStatus.ACTIVE,
                    mode: client_1.CampaignMode.PREVIEW,
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
                callStatus: client_1.CallStatus.RINGING,
                direction: 'outbound',
                fromNumber: agent?.callerNumber || null,
                toNumber: targetPhone || lead?.phone || null,
            },
        });
    }
};
exports.DialerService = DialerService;
exports.DialerService = DialerService = DialerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, bull_1.InjectQueue)('dialer')),
    __metadata("design:paramtypes", [Object, prisma_service_1.PrismaService,
        voip_service_1.VoipService,
        websocket_gateway_1.WebsocketGateway,
        config_1.ConfigService])
], DialerService);
//# sourceMappingURL=dialer.service.js.map
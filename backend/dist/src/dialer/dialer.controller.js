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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DialerController = void 0;
const common_1 = require("@nestjs/common");
const dialer_service_1 = require("./dialer.service");
const voip_service_1 = require("../voip/voip.service");
const prisma_service_1 = require("../prisma/prisma.service");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const client_1 = require("@prisma/client");
const config_1 = require("@nestjs/config");
let DialerController = class DialerController {
    dialerService;
    voipService;
    prisma;
    config;
    constructor(dialerService, voipService, prisma, config) {
        this.dialerService = dialerService;
        this.voipService = voipService;
        this.prisma = prisma;
        this.config = config;
    }
    getDefaultCallerName() {
        return (this.config.get('DEFAULT_OUTBOUND_CALLER_NAME') || 'RMESSAGES LLC').trim() || 'RMESSAGES LLC';
    }
    async startCall(body) {
        const to = this.normalizeToE164(body.to);
        const from = this.normalizeToE164(body.from || this.config.get('DEFAULT_OUTBOUND_NUMBER') || '+12623990007');
        const callerName = body.callerName?.trim() || this.getDefaultCallerName();
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const activeLead = await this.prisma.lead.findFirst({
            where: { phone: { in: [to, body.to?.trim()] } },
            select: { id: true },
        });
        if (activeLead) {
            const activeCallLog = await this.prisma.callLog.findFirst({
                where: {
                    leadId: activeLead.id,
                    callStatus: { in: [client_1.CallStatus.RINGING, client_1.CallStatus.CONNECTED] },
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
        const result = await this.voipService.initiateCall({
            to,
            from,
            callerName,
            callControlAppId: this.config.get('TELNYX_CALL_CONTROL_APP_ID'),
            webhookUrl: this.config.get('TELNYX_WEBHOOK_URL'),
            answeringMachineDetection: 'disabled',
            record: 'record-from-answer',
            recordingChannels: 'dual',
        });
        let callLogId = null;
        if (body.leadId) {
            try {
                const user = await this.prisma.user.findFirst({ select: { id: true } });
                const campaign = await this.prisma.campaign.findFirst({ select: { id: true } });
                if (user && campaign) {
                    const log = await this.prisma.callLog.create({
                        data: {
                            leadId: body.leadId,
                            agentId: user.id,
                            campaignId: campaign.id,
                            startedAt: new Date(),
                            callStatus: client_1.CallStatus.RINGING,
                            callControlId: result.callId,
                        },
                    });
                    callLogId = log.id;
                }
            }
            catch (logErr) {
                console.warn('callLog create skipped:', logErr?.message);
            }
        }
        return { callId: result.callId, status: result.status, callLogId };
    }
    async hangupCall(body) {
        await this.voipService.terminateCall(body.callId);
        return { message: 'Call terminated' };
    }
    async startCampaign(id) {
        await this.dialerService.startCampaign(id);
        return { message: 'Campaign started successfully' };
    }
    async pauseCampaign(id) {
        await this.dialerService.pauseCampaign(id);
        return { message: 'Campaign paused successfully' };
    }
    async handleDisposition(body) {
        await this.dialerService.handleDisposition(body.callLogId, body.disposition, body.notes, body.callbackAt, body.dealValue);
        return { message: 'Disposition recorded successfully' };
    }
    async updateCallLog(id, body) {
        return this.prisma.callLog.update({
            where: { id },
            data: body,
        });
    }
    async logCall(body) {
        return this.dialerService.logCall(body);
    }
    async lockLead(body) {
        const { leadId, agentId } = body;
        if (!leadId || !agentId) {
            return { locked: false, reason: 'leadId and agentId are required' };
        }
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const existing = await this.prisma.callLog.findFirst({
            where: {
                leadId,
                callStatus: { in: [client_1.CallStatus.RINGING, client_1.CallStatus.CONNECTED] },
                startedAt: { gte: fiveMinutesAgo },
            },
            select: { id: true, agentId: true },
        });
        if (existing) {
            const lockedBySelf = existing.agentId === agentId;
            if (lockedBySelf) {
                console.log(`[Dialer] LOCK RE-ACQUIRED: lead ${leadId} already locked by SAME agent ${agentId}`);
                return { locked: true, callLogId: existing.id };
            }
            console.warn(`[Dialer] LOCK DENIED: lead ${leadId} already locked by agent ${existing.agentId}`);
            return {
                locked: false,
                reason: 'already_dialing_other_agent',
            };
        }
        try {
            const callLog = await this.dialerService.logCall({ leadId, agentId });
            console.log(`[Dialer] LOCK ACQUIRED: lead ${leadId} → agent ${agentId} (callLogId: ${callLog.id})`);
            return { locked: true, callLogId: callLog.id };
        }
        catch (err) {
            console.error(`[Dialer] LOCK CREATE FAILED: ${err?.message}`);
            return { locked: false, reason: 'db_error' };
        }
    }
    async addToDnc(body) {
        const phone = body.phone?.trim();
        if (!phone)
            return { error: 'phone is required' };
        await this.prisma.dncRegistry.upsert({
            where: { phone },
            update: { source: body.reason || 'agent_request' },
            create: {
                phone,
                accountId: body.accountId || '',
                source: body.reason || 'agent_request',
            },
        });
        const lead = await this.prisma.lead.findFirst({ where: { phone } });
        if (lead) {
            await this.prisma.lead.update({
                where: { id: lead.id },
                data: { status: 'DNC' },
            });
        }
        console.log(`[DNC] Added ${phone} to DNC registry`);
        return { success: true, phone };
    }
    async addLeadToDnc(leadId, body) {
        const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
        if (!lead)
            return { error: 'Lead not found' };
        await this.prisma.dncRegistry.upsert({
            where: { phone: lead.phone },
            update: { source: body.reason || 'agent_request' },
            create: {
                phone: lead.phone,
                accountId: lead.accountId,
                source: body.reason || 'agent_request',
            },
        });
        await this.prisma.lead.update({
            where: { id: leadId },
            data: { status: 'DNC' },
        });
        console.log(`[DNC] Lead ${leadId} (${lead.phone}) added to DNC registry`);
        return { success: true, leadId, phone: lead.phone };
    }
    normalizeToE164(phone) {
        let d = (phone || '').trim();
        if (d.startsWith('+')) {
            return '+' + d.slice(1).replace(/\D/g, '');
        }
        d = d.replace(/\D/g, '');
        if (!d)
            return '';
        if (d.startsWith('00'))
            d = d.slice(2);
        if (d.length === 10)
            return '+1' + d;
        if (d.length === 11 && d.startsWith('1'))
            return '+' + d;
        if (d.length === 10 && (d.startsWith('3') || d.startsWith('03'))) {
            return '+92' + (d.startsWith('0') ? d.slice(1) : d);
        }
        if (d.length >= 12 && d.startsWith('92'))
            return '+' + d;
        if (d.length >= 11)
            return '+' + d;
        return '+1' + d;
    }
};
exports.DialerController = DialerController;
__decorate([
    (0, common_1.SetMetadata)('isPublic', true),
    (0, common_1.Post)('call/start'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DialerController.prototype, "startCall", null);
__decorate([
    (0, common_1.SetMetadata)('isPublic', true),
    (0, common_1.Post)('call/hangup'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DialerController.prototype, "hangupCall", null);
__decorate([
    (0, roles_decorator_1.Roles)('Admin', 'Manager'),
    (0, common_1.Post)('campaign/:id/start'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DialerController.prototype, "startCampaign", null);
__decorate([
    (0, roles_decorator_1.Roles)('Admin', 'Manager'),
    (0, common_1.Post)('campaign/:id/pause'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DialerController.prototype, "pauseCampaign", null);
__decorate([
    (0, common_1.SetMetadata)('isPublic', true),
    (0, common_1.Post)('call/disposition'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DialerController.prototype, "handleDisposition", null);
__decorate([
    (0, common_1.SetMetadata)('isPublic', true),
    (0, common_1.Patch)('call/log/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DialerController.prototype, "updateCallLog", null);
__decorate([
    (0, common_1.SetMetadata)('isPublic', true),
    (0, common_1.Post)('call/log'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DialerController.prototype, "logCall", null);
__decorate([
    (0, common_1.SetMetadata)('isPublic', true),
    (0, common_1.Post)('call/lock'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DialerController.prototype, "lockLead", null);
__decorate([
    (0, common_1.SetMetadata)('isPublic', true),
    (0, common_1.Post)('dnc'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DialerController.prototype, "addToDnc", null);
__decorate([
    (0, common_1.SetMetadata)('isPublic', true),
    (0, common_1.Post)('dnc/lead/:leadId'),
    __param(0, (0, common_1.Param)('leadId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DialerController.prototype, "addLeadToDnc", null);
exports.DialerController = DialerController = __decorate([
    (0, common_1.Controller)('dialer'),
    __metadata("design:paramtypes", [dialer_service_1.DialerService,
        voip_service_1.VoipService,
        prisma_service_1.PrismaService,
        config_1.ConfigService])
], DialerController);
//# sourceMappingURL=dialer.controller.js.map
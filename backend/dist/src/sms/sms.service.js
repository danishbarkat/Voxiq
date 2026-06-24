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
var SmsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../prisma/prisma.service");
let SmsService = SmsService_1 = class SmsService {
    prisma;
    config;
    logger = new common_1.Logger(SmsService_1.name);
    constructor(prisma, config) {
        this.prisma = prisma;
        this.config = config;
    }
    async send(to, body, fromOverride, agentId, accountId, channel = 'sms') {
        const account = await this.prisma.account.findUnique({
            where: { id: accountId },
            select: {
                canSendSms: true, canSendWhatsapp: true,
                monthlySmsLimit: true, monthlyWhatsappLimit: true,
                isTrial: true, trialEndsAt: true,
            },
        });
        if (channel === 'whatsapp') {
            if (account && !account.canSendWhatsapp) {
                throw new common_1.ForbiddenException('WhatsApp is not enabled for your plan. Contact your administrator.');
            }
            if (account?.monthlyWhatsappLimit !== null && account?.monthlyWhatsappLimit !== undefined) {
                const monthStart = new Date();
                monthStart.setDate(1);
                monthStart.setHours(0, 0, 0, 0);
                const used = await this.prisma.smsMessage.count({
                    where: { accountId, direction: 'outbound', channel: 'whatsapp', createdAt: { gte: monthStart } },
                });
                if (used >= account.monthlyWhatsappLimit) {
                    throw new common_1.ForbiddenException(`Monthly WhatsApp limit reached (${used}/${account.monthlyWhatsappLimit}).`);
                }
            }
        }
        else {
            if (account && !account.canSendSms) {
                throw new common_1.ForbiddenException('SMS sending is not enabled for your plan. Please upgrade.');
            }
            if (account?.isTrial && account.trialEndsAt && new Date(account.trialEndsAt) < new Date()) {
                throw new common_1.ForbiddenException('Your free trial has expired. Please upgrade to continue.');
            }
            if (account?.monthlySmsLimit !== null && account?.monthlySmsLimit !== undefined) {
                const monthStart = new Date();
                monthStart.setDate(1);
                monthStart.setHours(0, 0, 0, 0);
                const used = await this.prisma.smsMessage.count({
                    where: { accountId, direction: 'outbound', channel: 'sms', createdAt: { gte: monthStart } },
                });
                if (used >= account.monthlySmsLimit) {
                    throw new common_1.ForbiddenException(`Monthly SMS limit reached (${used}/${account.monthlySmsLimit}). Please upgrade.`);
                }
            }
        }
        const AGENT_DAILY_LIMIT = 100;
        if (agentId) {
            const dayStart = new Date();
            dayStart.setHours(0, 0, 0, 0);
            const todayCount = await this.prisma.smsMessage.count({
                where: { agentId, direction: 'outbound', channel, createdAt: { gte: dayStart } },
            });
            if (todayCount >= AGENT_DAILY_LIMIT) {
                throw new common_1.ForbiddenException(`Daily ${channel.toUpperCase()} limit reached (${todayCount}/${AGENT_DAILY_LIMIT}). Resets at midnight.`);
            }
        }
        const apiKey = this.config.get('TELNYX_API_KEY');
        const defaultFrom = this.config.get('DEFAULT_OUTBOUND_NUMBER') || '+14422039259';
        const from = fromOverride || defaultFrom;
        const formattedTo = to.startsWith('+') ? to : `+1${to.replace(/\D/g, '').slice(-10)}`;
        const formattedFrom = from.startsWith('+') ? from : `+1${from.replace(/\D/g, '').slice(-10)}`;
        let telnyxMessageId = null;
        let status = 'sent';
        try {
            const msgBody = { to: formattedTo, from: formattedFrom, text: body };
            if (channel === 'whatsapp')
                msgBody.type = 'WhatsApp';
            const response = await fetch('https://api.telnyx.com/v2/messages', {
                method: 'POST',
                headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(msgBody),
            });
            const json = await response.json();
            if (!response.ok) {
                const detail = json?.errors?.[0]?.detail || 'Send failed';
                this.logger.error(`Telnyx ${channel} error: ${detail}`);
                status = 'failed';
            }
            else {
                telnyxMessageId = json?.data?.id || null;
            }
        }
        catch (err) {
            this.logger.error(`${channel} send exception: ${err.message}`);
            status = 'failed';
        }
        return this.prisma.smsMessage.create({
            data: { accountId, agentId, direction: 'outbound', fromNumber: formattedFrom, toNumber: formattedTo, body, status, telnyxMessageId, channel },
        });
    }
    async saveInbound(from, to, body, telnyxMessageId, accountId, channel = 'sms') {
        return this.prisma.smsMessage.create({
            data: { accountId, agentId: null, direction: 'inbound', fromNumber: from, toNumber: to, body, status: 'received', telnyxMessageId, channel },
        });
    }
    async getConversations(accountId, agentId, channel) {
        const where = { accountId };
        if (channel)
            where.channel = channel;
        if (agentId)
            where.agentId = agentId;
        const messages = await this.prisma.smsMessage.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: { agent: { select: { id: true, name: true } } },
        });
        const threads = new Map();
        for (const msg of messages) {
            const contactNumber = msg.direction === 'outbound' ? msg.toNumber : msg.fromNumber;
            const key = `${contactNumber}:${msg.channel}`;
            if (!threads.has(key)) {
                threads.set(key, {
                    contactNumber,
                    channel: msg.channel,
                    lastMessage: msg.body,
                    lastMessageAt: msg.createdAt,
                    direction: msg.direction,
                    agentId: msg.agentId,
                    agentName: msg.agent?.name ?? null,
                });
            }
        }
        return Array.from(threads.values()).sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
    }
    async getThread(contactNumber, accountId, channel, agentId) {
        const formatted = contactNumber.startsWith('+')
            ? contactNumber
            : `+1${contactNumber.replace(/\D/g, '').slice(-10)}`;
        const where = {
            accountId,
            OR: [{ toNumber: formatted }, { fromNumber: formatted }],
        };
        if (channel)
            where.channel = channel;
        if (agentId)
            where.agentId = agentId;
        const messages = await this.prisma.smsMessage.findMany({
            where,
            orderBy: { createdAt: 'asc' },
            include: { agent: { select: { id: true, name: true } } },
        });
        return messages.map((m) => ({
            id: m.id,
            direction: m.direction,
            fromNumber: m.fromNumber,
            toNumber: m.toNumber,
            body: m.body,
            status: m.status,
            channel: m.channel,
            createdAt: m.createdAt,
            agentId: m.agentId,
            agentName: m.agent?.name ?? null,
        }));
    }
    async deleteConversation(contactNumber, accountId, channel) {
        const formatted = contactNumber.startsWith('+')
            ? contactNumber
            : `+1${contactNumber.replace(/\D/g, '').slice(-10)}`;
        const where = {
            accountId,
            OR: [{ toNumber: formatted }, { fromNumber: formatted }],
        };
        if (channel)
            where.channel = channel;
        const result = await this.prisma.smsMessage.deleteMany({ where });
        return { deleted: result.count };
    }
    async findAccountByNumber(toNumber) {
        const user = await this.prisma.user.findFirst({
            where: { callerNumber: toNumber },
            select: { accountId: true },
        });
        return user?.accountId ?? null;
    }
};
exports.SmsService = SmsService;
exports.SmsService = SmsService = SmsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], SmsService);
//# sourceMappingURL=sms.service.js.map
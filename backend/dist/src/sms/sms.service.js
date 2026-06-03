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
    async send(to, body, fromOverride, agentId, accountId) {
        const apiKey = this.config.get('TELNYX_API_KEY');
        const defaultFrom = this.config.get('DEFAULT_OUTBOUND_NUMBER') || '+14422039259';
        const from = fromOverride || defaultFrom;
        const formattedTo = to.startsWith('+') ? to : `+1${to.replace(/\D/g, '').slice(-10)}`;
        const formattedFrom = from.startsWith('+') ? from : `+1${from.replace(/\D/g, '').slice(-10)}`;
        let telnyxMessageId = null;
        let status = 'sent';
        try {
            const response = await fetch('https://api.telnyx.com/v2/messages', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ to: formattedTo, from: formattedFrom, text: body }),
            });
            const json = await response.json();
            if (!response.ok) {
                const detail = json?.errors?.[0]?.detail || 'Send failed';
                this.logger.error(`Telnyx SMS error: ${detail}`);
                status = 'failed';
            }
            else {
                telnyxMessageId = json?.data?.id || null;
            }
        }
        catch (err) {
            this.logger.error(`SMS send exception: ${err.message}`);
            status = 'failed';
        }
        return this.prisma.smsMessage.create({
            data: {
                accountId,
                agentId,
                direction: 'outbound',
                fromNumber: formattedFrom,
                toNumber: formattedTo,
                body,
                status,
                telnyxMessageId,
            },
        });
    }
    async saveInbound(from, to, body, telnyxMessageId, accountId) {
        return this.prisma.smsMessage.create({
            data: {
                accountId,
                agentId: null,
                direction: 'inbound',
                fromNumber: from,
                toNumber: to,
                body,
                status: 'received',
                telnyxMessageId,
            },
        });
    }
    async getConversations(accountId, agentId) {
        const where = { accountId };
        if (agentId) {
            where.OR = [{ agentId }, { direction: 'inbound' }];
        }
        const messages = await this.prisma.smsMessage.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: { agent: { select: { id: true, name: true } } },
        });
        const threads = new Map();
        for (const msg of messages) {
            const contactNumber = msg.direction === 'outbound' ? msg.toNumber : msg.fromNumber;
            if (!threads.has(contactNumber)) {
                threads.set(contactNumber, {
                    contactNumber,
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
    async getThread(contactNumber, accountId) {
        const formatted = contactNumber.startsWith('+')
            ? contactNumber
            : `+1${contactNumber.replace(/\D/g, '').slice(-10)}`;
        const messages = await this.prisma.smsMessage.findMany({
            where: {
                accountId,
                OR: [{ toNumber: formatted }, { fromNumber: formatted }],
            },
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
            createdAt: m.createdAt,
            agentId: m.agentId,
            agentName: m.agent?.name ?? null,
        }));
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
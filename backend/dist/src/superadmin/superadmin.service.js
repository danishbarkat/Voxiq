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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SuperAdminService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const areaCodes_1 = require("../utils/areaCodes");
const SUPERADMIN_ACCOUNT_ID = 'super-admin-account';
let SuperAdminService = class SuperAdminService {
    prisma;
    configService;
    constructor(prisma, configService) {
        this.prisma = prisma;
        this.configService = configService;
    }
    async getOverview() {
        const accounts = await this.prisma.account.findMany({
            where: { id: { not: SUPERADMIN_ACCOUNT_ID } },
            include: {
                users: {
                    select: {
                        id: true,
                        role: { select: { name: true } },
                    },
                },
                _count: {
                    select: {
                        users: true,
                        leads: true,
                        lists: true,
                        campaigns: true,
                    },
                },
            },
        });
        const callLogs = await this.prisma.callLog.findMany({
            include: {
                agent: {
                    select: {
                        accountId: true,
                    },
                },
                lead: {
                    select: {
                        phone: true,
                    },
                },
            },
        });
        const byAccount = this.groupLogsByAccount(callLogs);
        const companySummaries = accounts.map((account) => this.buildCompanySnapshot(account, byAccount.get(account.id) || []));
        const totals = companySummaries.reduce((acc, company) => {
            acc.totalCompanies += 1;
            acc.activeCompanies += company.status === 'ACTIVE' ? 1 : 0;
            acc.pendingCompanies += company.status === 'PENDING' ? 1 : 0;
            acc.inactiveCompanies += company.status === 'INACTIVE' ? 1 : 0;
            acc.totalAgents += company.agentCount;
            acc.totalAdmins += company.adminCount;
            acc.totalLeads += company.leadCount;
            acc.totalLists += company.listCount;
            acc.totalCampaigns += company.campaignCount;
            acc.totalNumbers += company.numberCount;
            acc.totalCalls += company.totalCalls;
            acc.connectedCalls += company.connectedCalls;
            acc.totalMinutes += company.totalMinutes;
            acc.totalRevenue += company.revenue;
            acc.recordings += company.recordings;
            acc.inboundCalls += company.inboundCalls;
            acc.outboundCalls += company.outboundCalls;
            return acc;
        }, {
            totalCompanies: 0,
            activeCompanies: 0,
            pendingCompanies: 0,
            inactiveCompanies: 0,
            totalAgents: 0,
            totalAdmins: 0,
            totalLeads: 0,
            totalLists: 0,
            totalCampaigns: 0,
            totalNumbers: 0,
            totalCalls: 0,
            connectedCalls: 0,
            totalMinutes: 0,
            totalRevenue: 0,
            recordings: 0,
            inboundCalls: 0,
            outboundCalls: 0,
        });
        const topCompanies = [...companySummaries]
            .sort((a, b) => b.totalCalls - a.totalCalls)
            .slice(0, 5)
            .map((company) => ({
            accountId: company.id,
            companyName: company.name,
            totalCalls: company.totalCalls,
            totalMinutes: company.totalMinutes,
            revenue: company.revenue,
        }));
        const stateCounts = {};
        for (const company of companySummaries) {
            for (const state of company.topStates) {
                stateCounts[state.state] = (stateCounts[state.state] || 0) + state.calls;
            }
        }
        const topStates = Object.entries(stateCounts)
            .map(([state, calls]) => ({ state, calls }))
            .sort((a, b) => b.calls - a.calls)
            .slice(0, 8);
        return {
            ...totals,
            connectionRate: totals.totalCalls > 0 ? Number(((totals.connectedCalls / totals.totalCalls) * 100).toFixed(1)) : 0,
            topCompanies,
            topStates,
        };
    }
    async getAllCompanies() {
        const accounts = await this.prisma.account.findMany({
            where: { id: { not: SUPERADMIN_ACCOUNT_ID } },
            orderBy: { createdAt: 'desc' },
            include: {
                users: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: { select: { name: true } },
                    },
                },
                _count: {
                    select: {
                        users: true,
                        leads: true,
                        lists: true,
                        campaigns: true,
                    },
                },
            },
        });
        const callLogs = await this.prisma.callLog.findMany({
            include: {
                agent: {
                    select: {
                        accountId: true,
                    },
                },
                lead: {
                    select: {
                        phone: true,
                    },
                },
            },
        });
        const byAccount = this.groupLogsByAccount(callLogs);
        return accounts.map((account) => this.buildCompanySnapshot(account, byAccount.get(account.id) || []));
    }
    async getCompanyDetails(accountId) {
        const account = await this.prisma.account.findUnique({
            where: { id: accountId },
            include: {
                users: {
                    include: {
                        role: { select: { name: true } },
                    },
                    orderBy: { createdAt: 'desc' },
                },
                lists: {
                    select: {
                        id: true,
                        name: true,
                        createdAt: true,
                        _count: { select: { leads: true } },
                    },
                    orderBy: { createdAt: 'desc' },
                },
                campaigns: {
                    select: {
                        id: true,
                        name: true,
                        status: true,
                        mode: true,
                        localPresence: true,
                        record: true,
                        createdAt: true,
                    },
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
        if (!account) {
            throw new common_1.NotFoundException('Company not found');
        }
        const logs = await this.prisma.callLog.findMany({
            where: {
                agent: {
                    accountId,
                },
            },
            include: {
                agent: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                lead: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        phone: true,
                    },
                },
                campaign: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: { startedAt: 'desc' },
            take: 150,
        });
        const stats = this.computeLogStats(logs);
        const activityByDay = this.buildDailyActivity(logs);
        const topStates = this.buildTopStates(logs);
        const topAgents = this.buildTopAgents(logs, account.users);
        return {
            id: account.id,
            name: account.name,
            status: account.status,
            approved: account.approved,
            agentLimit: account.agentLimit,
            requestedAgentLimit: account.requestedAgentLimit,
            requestedNumbers: account.requestedNumbers,
            accessCode: account.accessCode,
            accessCodeUsed: !!account.accessCodeUsedAt,
            approvedAt: account.approvedAt,
            createdAt: account.createdAt,
            numberPool: Array.isArray(account.numberPool) ? account.numberPool : [],
            numberCount: Array.isArray(account.numberPool) ? account.numberPool.length : 0,
            services: this.detectServices(account, logs),
            stats,
            topStates,
            activityByDay,
            topAgents,
            admins: account.users
                .filter((user) => user.role?.name?.toLowerCase() === 'admin')
                .map((user) => ({
                id: user.id,
                name: user.name,
                email: user.email,
                status: user.status,
                createdAt: user.createdAt,
            })),
            agents: account.users
                .filter((user) => user.role?.name?.toLowerCase() === 'agent')
                .map((user) => ({
                id: user.id,
                name: user.name,
                email: user.email,
                status: user.status,
                callerNumber: user.callerNumber,
                createdAt: user.createdAt,
            })),
            lists: account.lists.map((list) => ({
                id: list.id,
                name: list.name,
                leadCount: list._count.leads,
                createdAt: list.createdAt,
            })),
            campaigns: account.campaigns,
            recentCalls: logs.slice(0, 20).map((log) => ({
                id: log.id,
                startedAt: log.startedAt,
                endedAt: log.endedAt,
                direction: log.direction || 'outbound',
                callStatus: log.callStatus,
                disposition: log.disposition,
                fromNumber: log.fromNumber,
                toNumber: log.toNumber,
                dealValue: log.dealValue || 0,
                recordingUrl: log.recordingUrl,
                vmRecordingUrl: log.vmRecordingUrl,
                agentName: log.agent?.name || 'Unknown',
                campaignName: log.campaign?.name || 'Unassigned',
                leadName: log.lead ? `${log.lead.firstName} ${log.lead.lastName}`.trim() : 'Unknown Lead',
                leadPhone: log.lead?.phone || null,
            })),
        };
    }
    async approveCompany(accountId, agentLimit, numberPool) {
        const account = await this.prisma.account.findUnique({ where: { id: accountId } });
        if (!account)
            throw new common_1.NotFoundException('Company not found');
        if (account.status === client_1.AccountStatus.ACTIVE) {
            throw new common_1.BadRequestException('Company is already active');
        }
        return this.prisma.account.update({
            where: { id: accountId },
            data: {
                status: client_1.AccountStatus.ACTIVE,
                approved: true,
                agentLimit,
                numberPool,
                approvedAt: new Date(),
                rejectionReason: null,
            },
        });
    }
    async rejectCompany(accountId, reason) {
        const account = await this.prisma.account.findUnique({ where: { id: accountId } });
        if (!account)
            throw new common_1.NotFoundException('Company not found');
        return this.prisma.account.update({
            where: { id: accountId },
            data: {
                status: client_1.AccountStatus.INACTIVE,
                approved: false,
                rejectionReason: reason,
            },
        });
    }
    async deactivateCompany(accountId) {
        const account = await this.prisma.account.findUnique({ where: { id: accountId } });
        if (!account)
            throw new common_1.NotFoundException('Company not found');
        return this.prisma.account.update({
            where: { id: accountId },
            data: { status: client_1.AccountStatus.INACTIVE, rejectionReason: null },
        });
    }
    async activateCompany(accountId) {
        const account = await this.prisma.account.findUnique({ where: { id: accountId } });
        if (!account)
            throw new common_1.NotFoundException('Company not found');
        return this.prisma.account.update({
            where: { id: accountId },
            data: { status: client_1.AccountStatus.ACTIVE, approved: true, rejectionReason: null },
        });
    }
    async getAnalytics() {
        const now = new Date();
        const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const accounts = await this.prisma.account.findMany({
            where: { id: { not: SUPERADMIN_ACCOUNT_ID } },
            select: { id: true, name: true, status: true },
        });
        const results = await Promise.all(accounts.map(async (account) => {
            const [daily, weekly, monthly] = await Promise.all([
                this.getAccountStats(account.id, dayAgo),
                this.getAccountStats(account.id, weekAgo),
                this.getAccountStats(account.id, monthAgo),
            ]);
            return {
                accountId: account.id,
                companyName: account.name,
                status: account.status,
                daily,
                weekly,
                monthly,
            };
        }));
        return results;
    }
    async getCompanyAnalytics(accountId) {
        const now = new Date();
        const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const account = await this.prisma.account.findUnique({
            where: { id: accountId },
            select: { id: true, name: true },
        });
        if (!account)
            throw new common_1.NotFoundException('Company not found');
        const [daily, weekly, monthly] = await Promise.all([
            this.getAccountStats(accountId, dayAgo),
            this.getAccountStats(accountId, weekAgo),
            this.getAccountStats(accountId, monthAgo),
        ]);
        return { accountId, companyName: account.name, daily, weekly, monthly };
    }
    async getAvailableNumbers() {
        const telnyxNumbers = await this.fetchTelnyxNumbers();
        const allCompanies = await this.prisma.account.findMany({
            where: { id: { not: SUPERADMIN_ACCOUNT_ID } },
            select: { numberPool: true },
        });
        const assignedNumbers = new Set();
        for (const company of allCompanies) {
            if (Array.isArray(company.numberPool)) {
                for (const entry of company.numberPool) {
                    if (entry?.number)
                        assignedNumbers.add(entry.number);
                }
            }
        }
        return telnyxNumbers.map(entry => ({
            ...entry,
            assigned: assignedNumbers.has(entry.number),
        }));
    }
    async fetchTelnyxNumbers() {
        const apiKey = this.configService.get('TELNYX_API_KEY');
        if (!apiKey)
            return [];
        try {
            const res = await fetch('https://api.telnyx.com/v2/phone_numbers?page[size]=200', {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
            });
            if (!res.ok)
                return [];
            const json = await res.json();
            const data = json?.data || [];
            return data.map(item => {
                const raw = item.phone_number || '';
                const countryCode = this.extractCountryCode(raw);
                return {
                    number: raw,
                    callerName: item.caller_name || '',
                    countryCode,
                };
            });
        }
        catch {
            return [];
        }
    }
    extractCountryCode(e164) {
        if (!e164.startsWith('+'))
            return '';
        const knownCodes = {
            '1': 1, '7': 1, '20': 2, '27': 2, '30': 2, '31': 2, '32': 2, '33': 2, '34': 2,
            '36': 2, '39': 2, '40': 2, '41': 2, '43': 2, '44': 2, '45': 2, '46': 2, '47': 2,
            '48': 2, '49': 2, '51': 2, '52': 2, '53': 2, '54': 2, '55': 2, '56': 2, '57': 2,
            '58': 2, '60': 2, '61': 2, '62': 2, '63': 2, '64': 2, '65': 2, '66': 2, '81': 2,
            '82': 2, '84': 2, '86': 2, '90': 2, '91': 2, '92': 2, '93': 2, '94': 2, '95': 2,
            '98': 2, '212': 3, '213': 3, '216': 3, '218': 3, '220': 3, '221': 3, '234': 3,
            '971': 3, '972': 3, '966': 3, '964': 3, '963': 3, '961': 3,
        };
        const digits = e164.slice(1);
        for (const len of [3, 2, 1]) {
            const prefix = digits.slice(0, len);
            if (knownCodes[prefix] !== undefined)
                return `+${prefix}`;
        }
        return `+${digits.slice(0, 1)}`;
    }
    async assignNumbers(accountId, numbers) {
        const account = await this.prisma.account.findUnique({
            where: { id: accountId },
            select: { numberPool: true },
        });
        if (!account)
            throw new common_1.NotFoundException('Company not found');
        const pool = Array.isArray(account.numberPool) ? account.numberPool : [];
        const existing = new Set(pool.map((e) => e.number));
        const toAdd = numbers.filter(n => !existing.has(n.number));
        const updated = [...pool, ...toAdd];
        await this.prisma.account.update({
            where: { id: accountId },
            data: { numberPool: updated },
        });
        return { message: `${toAdd.length} number(s) assigned`, assigned: toAdd };
    }
    async unassignNumber(accountId, number) {
        const account = await this.prisma.account.findUnique({
            where: { id: accountId },
            select: { numberPool: true },
        });
        if (!account)
            throw new common_1.NotFoundException('Company not found');
        const pool = Array.isArray(account.numberPool) ? account.numberPool : [];
        const updated = pool.filter(e => e.number !== number);
        if (updated.length === pool.length) {
            throw new common_1.NotFoundException('Number not found in this company pool');
        }
        await this.prisma.account.update({
            where: { id: accountId },
            data: { numberPool: updated },
        });
        return { message: 'Number unassigned', number };
    }
    async regenerateAccessCode(accountId) {
        const account = await this.prisma.account.findUnique({ where: { id: accountId } });
        if (!account)
            throw new common_1.NotFoundException('Company not found');
        return this.prisma.account.update({
            where: { id: accountId },
            data: {
                accessCode: this.generateAccessCode(),
                accessCodeIssuedAt: new Date(),
                accessCodeUsedAt: null,
            },
            select: {
                id: true,
                name: true,
                accessCode: true,
                accessCodeIssuedAt: true,
            },
        });
    }
    async getAccountStats(accountId, since) {
        const logs = await this.prisma.callLog.findMany({
            where: {
                startedAt: { gte: since },
                agent: { accountId },
            },
            include: {
                lead: {
                    select: {
                        phone: true,
                    },
                },
            },
        });
        const stats = this.computeLogStats(logs);
        return {
            calls: stats.totalCalls,
            connectedCalls: stats.connectedCalls,
            totalMinutes: stats.totalMinutes,
            avgDuration: stats.avgDuration,
            revenue: stats.revenue,
            inboundCalls: stats.inboundCalls,
            outboundCalls: stats.outboundCalls,
            recordings: stats.recordings,
            topStates: this.buildTopStates(logs).slice(0, 5),
        };
    }
    groupLogsByAccount(logs) {
        const byAccount = new Map();
        for (const log of logs) {
            const accountId = log.agent?.accountId;
            if (!accountId)
                continue;
            const current = byAccount.get(accountId) || [];
            current.push(log);
            byAccount.set(accountId, current);
        }
        return byAccount;
    }
    buildCompanySnapshot(account, logs) {
        const stats = this.computeLogStats(logs);
        const adminUsers = account.users.filter((user) => user.role?.name?.toLowerCase() === 'admin');
        const agentUsers = account.users.filter((user) => user.role?.name?.toLowerCase() === 'agent');
        return {
            id: account.id,
            name: account.name,
            status: account.status,
            approved: account.approved,
            agentLimit: account.agentLimit,
            requestedAgentLimit: account.requestedAgentLimit,
            requestedNumbers: account.requestedNumbers,
            accessCode: account.accessCode,
            accessCodeUsed: !!account.accessCodeUsedAt,
            adminPhone: account.adminPhone,
            rejectionReason: account.rejectionReason,
            reactivationRequested: account.status === client_1.AccountStatus.INACTIVE &&
                typeof account.rejectionReason === 'string' &&
                account.rejectionReason.startsWith('[REACTIVATION_REQUEST]'),
            approvedAt: account.approvedAt,
            createdAt: account.createdAt,
            userCount: account._count.users,
            agentCount: agentUsers.length,
            adminCount: adminUsers.length,
            leadCount: account._count.leads,
            listCount: account._count.lists,
            campaignCount: account._count.campaigns,
            numberCount: Array.isArray(account.numberPool) ? account.numberPool.length : 0,
            adminEmail: adminUsers[0]?.email ?? null,
            adminName: adminUsers[0]?.name ?? null,
            totalCalls: stats.totalCalls,
            connectedCalls: stats.connectedCalls,
            totalMinutes: stats.totalMinutes,
            avgDuration: stats.avgDuration,
            revenue: stats.revenue,
            recordings: stats.recordings,
            inboundCalls: stats.inboundCalls,
            outboundCalls: stats.outboundCalls,
            services: this.detectServices(account, logs),
            topStates: this.buildTopStates(logs).slice(0, 5),
        };
    }
    computeLogStats(logs) {
        const totalCalls = logs.length;
        const connectedCalls = logs.filter((log) => log.callStatus === client_1.CallStatus.CONNECTED || log.callStatus === client_1.CallStatus.COMPLETED).length;
        const totalSeconds = logs.reduce((sum, log) => {
            if (!log.endedAt || !log.startedAt)
                return sum;
            return sum + (new Date(log.endedAt).getTime() - new Date(log.startedAt).getTime()) / 1000;
        }, 0);
        const totalMinutes = Math.round(totalSeconds / 60);
        const avgDuration = totalCalls > 0 ? Math.round(totalSeconds / totalCalls) : 0;
        const revenue = logs.reduce((sum, log) => sum + (log.dealValue || 0), 0);
        const recordings = logs.filter((log) => !!log.recordingUrl).length;
        const inboundCalls = logs.filter((log) => (log.direction || '').toLowerCase() === 'inbound').length;
        const outboundCalls = totalCalls - inboundCalls;
        return {
            totalCalls,
            connectedCalls,
            totalMinutes,
            avgDuration,
            revenue,
            recordings,
            inboundCalls,
            outboundCalls,
        };
    }
    buildTopStates(logs) {
        const stateCounts = {};
        for (const log of logs) {
            const phone = log.lead?.phone;
            const state = phone ? (0, areaCodes_1.getStateFromE164)(phone) : null;
            if (!state)
                continue;
            stateCounts[state] = (stateCounts[state] || 0) + 1;
        }
        return Object.entries(stateCounts)
            .map(([state, calls]) => ({ state, calls }))
            .sort((a, b) => b.calls - a.calls);
    }
    buildDailyActivity(logs) {
        const bucket = {};
        for (const log of logs) {
            const date = new Date(log.startedAt).toISOString().slice(0, 10);
            if (!bucket[date]) {
                bucket[date] = { date, calls: 0, revenue: 0 };
            }
            bucket[date].calls += 1;
            bucket[date].revenue += log.dealValue || 0;
        }
        return Object.values(bucket)
            .sort((a, b) => a.date.localeCompare(b.date))
            .slice(-14);
    }
    buildTopAgents(logs, users) {
        const byAgent = new Map();
        for (const log of logs) {
            if (!log.agentId)
                continue;
            const current = byAgent.get(log.agentId) || {
                id: log.agentId,
                name: log.agent?.name || 'Unknown',
                email: log.agent?.email || '',
                calls: 0,
                revenue: 0,
            };
            current.calls += 1;
            current.revenue += log.dealValue || 0;
            byAgent.set(log.agentId, current);
        }
        const results = Array.from(byAgent.values()).sort((a, b) => b.calls - a.calls).slice(0, 8);
        if (results.length > 0)
            return results;
        return users
            .filter((user) => user.role?.name?.toLowerCase() === 'agent')
            .slice(0, 8)
            .map((user) => ({
            id: user.id,
            name: user.name,
            email: user.email,
            calls: 0,
            revenue: 0,
        }));
    }
    detectServices(account, logs) {
        const numberPool = Array.isArray(account.numberPool) ? account.numberPool : [];
        const inboundCalls = logs.some((log) => (log.direction || '').toLowerCase() === 'inbound');
        const recordings = logs.some((log) => !!log.recordingUrl);
        const localPresence = (account.campaigns || []).some((campaign) => !!campaign.localPresence);
        return [
            numberPool.length > 0 ? 'Outbound' : null,
            inboundCalls ? 'Inbound' : null,
            recordings ? 'Recordings' : null,
            localPresence ? 'Local Presence' : null,
        ].filter(Boolean);
    }
    generateAccessCode() {
        const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        const part = () => Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
        return `${part()}-${part()}`;
    }
};
exports.SuperAdminService = SuperAdminService;
exports.SuperAdminService = SuperAdminService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], SuperAdminService);
//# sourceMappingURL=superadmin.service.js.map
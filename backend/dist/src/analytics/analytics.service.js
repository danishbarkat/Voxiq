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
var AnalyticsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const areaCodes_1 = require("../utils/areaCodes");
let AnalyticsService = AnalyticsService_1 = class AnalyticsService {
    prisma;
    logger = new common_1.Logger(AnalyticsService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    getTzAwareDayStart(date, tzOffsetMinutes = 0) {
        const offsetMs = tzOffsetMinutes * 60_000;
        const shifted = new Date(date.getTime() - offsetMs);
        const startShifted = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate(), 0, 0, 0, 0);
        return new Date(startShifted + offsetMs);
    }
    getTzAwareMonthStart(date, tzOffsetMinutes = 0) {
        const offsetMs = tzOffsetMinutes * 60_000;
        const shifted = new Date(date.getTime() - offsetMs);
        const startShifted = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), 1, 0, 0, 0, 0);
        return new Date(startShifted + offsetMs);
    }
    getTzAwareYearStart(date, tzOffsetMinutes = 0) {
        const offsetMs = tzOffsetMinutes * 60_000;
        const shifted = new Date(date.getTime() - offsetMs);
        const startShifted = Date.UTC(shifted.getUTCFullYear(), 0, 1, 0, 0, 0, 0);
        return new Date(startShifted + offsetMs);
    }
    getTzAwareWeekStart(date, tzOffsetMinutes = 0) {
        const offsetMs = tzOffsetMinutes * 60_000;
        const shifted = new Date(date.getTime() - offsetMs);
        const dayOfWeek = shifted.getUTCDay();
        const daysToMon = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const startShifted = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate() - daysToMon, 0, 0, 0, 0);
        return new Date(startShifted + offsetMs);
    }
    buildDateFilter(startDate, endDate) {
        if (startDate && endDate)
            return client_1.Prisma.sql `AND "startedAt" >= ${startDate} AND "startedAt" <= ${endDate}`;
        if (startDate)
            return client_1.Prisma.sql `AND "startedAt" >= ${startDate}`;
        if (endDate)
            return client_1.Prisma.sql `AND "startedAt" <= ${endDate}`;
        return client_1.Prisma.empty;
    }
    async getCampaignStats(campaignId, startDate, endDate, requester) {
        await this.assertCampaignAccess(campaignId, requester);
        const dateFilter = this.buildDateFilter(startDate, endDate);
        const statsQuery = await this.prisma.$queryRaw(client_1.Prisma.sql `
            SELECT
                COUNT(*) as "totalCalls",
                COUNT(*) FILTER (WHERE "callStatus" IN ('CONNECTED', 'COMPLETED')) as "connected",
                SUM("dealValue") as "revenue",
                AVG(COALESCE("durationSeconds", EXTRACT(EPOCH FROM ("endedAt" - "startedAt")))) as "avgDuration"
            FROM "CallLog"
            WHERE "campaignId" = ${campaignId} ${dateFilter}
        `);
        const dispositionQuery = await this.prisma.$queryRaw(client_1.Prisma.sql `
            SELECT "disposition", COUNT(*) as count
            FROM "CallLog"
            WHERE "campaignId" = ${campaignId} ${dateFilter}
            GROUP BY "disposition"
        `);
        const stats = statsQuery[0];
        const totalCalls = Number(stats.totalCalls) || 0;
        const connected = Number(stats.connected) || 0;
        const connectionRate = totalCalls > 0 ? (connected / totalCalls) * 100 : 0;
        const avgDuration = Number(stats.avgDuration) || 0;
        const revenue = Number(stats.revenue) || 0;
        const dispositions = {};
        for (const row of dispositionQuery) {
            const disp = row.disposition || 'Unknown';
            dispositions[disp] = Number(row.count) || 0;
        }
        return {
            totalCalls,
            connected,
            connectionRate: connectionRate.toFixed(2),
            avgDuration: avgDuration.toFixed(0),
            revenue,
            dispositions
        };
    }
    async getAgentStats(agentId, startDate, endDate, requester) {
        await this.assertAgentAccess(agentId, requester);
        const dateFilter = this.buildDateFilter(startDate, endDate);
        const statsQuery = await this.prisma.$queryRaw(client_1.Prisma.sql `
            SELECT
                COUNT(*) as "totalCalls",
                COUNT(*) FILTER (WHERE "callStatus" IN ('CONNECTED', 'COMPLETED')) as "connected",
                COUNT(*) FILTER (WHERE LOWER("disposition") IN ('interested', 'booked')) as "appointments",
                SUM("dealValue") as "revenue",
                SUM(COALESCE("durationSeconds", EXTRACT(EPOCH FROM ("endedAt" - "startedAt")))) as "totalTalkTime"
            FROM "CallLog"
            WHERE "agentId" = ${agentId} ${dateFilter}
        `);
        const stats = statsQuery[0];
        const totalCalls = Number(stats.totalCalls) || 0;
        const connected = Number(stats.connected) || 0;
        const appointments = Number(stats.appointments) || 0;
        const totalTalkTime = Number(stats.totalTalkTime) || 0;
        const revenue = Number(stats.revenue) || 0;
        const conversionRate = totalCalls > 0 ? ((appointments / totalCalls) * 100).toFixed(2) : '0.00';
        const avgTalkTime = totalCalls > 0 ? (totalTalkTime / totalCalls).toFixed(0) : '0';
        return {
            totalCalls,
            connected,
            appointments,
            conversionRate,
            totalTalkTime: totalTalkTime.toFixed(0),
            avgTalkTime,
            revenue
        };
    }
    async getOverview(requester) {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const where = this.buildCallLogWhereForRequester(requester);
        const [totalCalls, todayCalls, connected, appointments, recordings, revenueAgg] = await Promise.all([
            this.prisma.callLog.count({ where }),
            this.prisma.callLog.count({ where: { ...where, startedAt: { gte: todayStart } } }),
            this.prisma.callLog.count({ where: { ...where, callStatus: { in: [client_1.CallStatus.CONNECTED, client_1.CallStatus.COMPLETED] } } }),
            this.prisma.callLog.count({ where: { ...where, disposition: { in: ['Interested', 'Booked', 'interested', 'booked'] } } }),
            this.prisma.callLog.count({ where: { ...where, recordingUrl: { not: null } } }),
            this.prisma.callLog.aggregate({ where, _sum: { dealValue: true } }),
        ]);
        const connectionRate = totalCalls > 0 ? ((connected / totalCalls) * 100).toFixed(1) : '0.0';
        const appointmentRate = totalCalls > 0 ? ((appointments / totalCalls) * 100).toFixed(1) : '0.0';
        const revenue = revenueAgg._sum?.dealValue || 0;
        return { totalCalls, todayCalls, connected, appointments, recordings, connectionRate, appointmentRate, revenue };
    }
    async getHourlyStats(dateStr, requester) {
        const date = dateStr ? new Date(dateStr) : new Date();
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);
        const logs = await this.prisma.callLog.findMany({
            where: { ...this.buildCallLogWhereForRequester(requester), startedAt: { gte: dayStart, lte: dayEnd } },
            select: { startedAt: true, callStatus: true },
        });
        const hours = Array.from({ length: 24 }, (_, i) => ({ hour: i, calls: 0, connected: 0 }));
        for (const log of logs) {
            if (!log.startedAt)
                continue;
            const h = log.startedAt.getHours();
            hours[h].calls++;
            if (log.callStatus === client_1.CallStatus.CONNECTED || log.callStatus === client_1.CallStatus.COMPLETED)
                hours[h].connected++;
        }
        return hours;
    }
    async exportCsv(startDate, endDate, requester) {
        const where = this.buildCallLogWhereForRequester(requester);
        if (startDate || endDate) {
            where.startedAt = where.startedAt || {};
            if (startDate)
                where.startedAt.gte = startDate;
            if (endDate)
                where.startedAt.lte = endDate;
        }
        const logs = await this.prisma.callLog.findMany({
            where,
            include: {
                lead: true,
                agent: true,
                campaign: true,
            },
            orderBy: { startedAt: 'desc' },
        });
        const header = 'ID,Lead Name,Phone,Agent,Campaign,Status,Disposition,Notes,Started,Ended,Duration(s),Deal Value,Recording\n';
        const rows = logs.map(l => {
            const leadName = l.lead ? `${l.lead.firstName} ${l.lead.lastName}` : '';
            const duration = l.startedAt && l.endedAt ? ((l.endedAt.getTime() - l.startedAt.getTime()) / 1000).toFixed(0) : '';
            const csv = (v) => `"${(v || '').toString().replace(/"/g, '""')}"`;
            return [l.id, leadName, l.lead?.phone || '', l.agent?.name || '', l.campaign?.name || '', l.callStatus, l.disposition || '', l.notes || '', l.startedAt?.toISOString() || '', l.endedAt?.toISOString() || '', duration, l.dealValue || 0, l.recordingUrl || ''].map(csv).join(',');
        });
        return header + rows.join('\n');
    }
    async getAllAgentScores(requester) {
        const where = this.buildUserWhereForRequester(requester);
        const agents = await this.prisma.user.findMany({ where, select: { id: true, name: true, email: true } });
        const scores = await Promise.all(agents.map(async (agent) => {
            const stats = await this.getAgentStats(agent.id, undefined, undefined, requester);
            const score = (stats.connected * 10) + (stats.appointments * 25);
            return { ...agent, ...stats, score };
        }));
        return scores.sort((a, b) => b.score - a.score);
    }
    async getRecordings(filters, requester) {
        const limit = filters?.limit ?? 200;
        const where = {
            ...this.buildCallLogWhereForRequester(requester),
            OR: [
                { recordingUrl: { not: null } },
                { vmRecordingUrl: { not: null } },
            ],
        };
        if (filters?.agentId) {
            await this.assertAgentAccess(filters.agentId, requester);
            where.agentId = filters.agentId;
        }
        if (filters?.dateFrom || filters?.dateTo) {
            where.startedAt = {};
            if (filters.dateFrom)
                where.startedAt.gte = new Date(filters.dateFrom);
            if (filters.dateTo) {
                const to = new Date(filters.dateTo);
                to.setHours(23, 59, 59, 999);
                where.startedAt.lte = to;
            }
        }
        if (filters?.phone) {
            const cleaned = filters.phone.replace(/\D/g, '');
            where.lead = { phone: { contains: cleaned } };
        }
        const logs = await this.prisma.callLog.findMany({
            where,
            include: {
                lead: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        phone: true,
                    },
                },
                agent: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: [
                { startedAt: 'desc' },
            ],
            take: limit,
        });
        return logs.map(log => ({
            ...log,
            durationSeconds: log.startedAt && log.endedAt
                ? Math.round((new Date(log.endedAt).getTime() - new Date(log.startedAt).getTime()) / 1000)
                : null,
        }));
    }
    async getHistory(filters, requester) {
        const limit = Math.min(filters?.limit ?? 150, 300);
        const requesterRole = requester?.role?.toLowerCase();
        const requesterUser = requesterRole === 'agent' && requester?.userId
            ? await this.prisma.user.findUnique({
                where: { id: requester.userId },
                select: {
                    id: true,
                    accountId: true,
                    callerNumber: true,
                },
            })
            : null;
        const agentCallClauses = [{ agentId: requester?.userId }];
        if (requesterUser?.callerNumber) {
            agentCallClauses.push({ fromNumber: requesterUser.callerNumber }, { toNumber: requesterUser.callerNumber });
            if (requesterUser.accountId) {
                agentCallClauses.push({
                    AND: [
                        {
                            OR: [
                                { agent: { accountId: requesterUser.accountId } },
                                { lead: { accountId: requesterUser.accountId } },
                                { campaign: { accountId: requesterUser.accountId } },
                            ],
                        },
                        {
                            OR: [
                                { fromNumber: requesterUser.callerNumber },
                                { toNumber: requesterUser.callerNumber },
                            ],
                        },
                    ],
                });
            }
        }
        const callWhere = requesterRole === 'agent'
            ? { OR: agentCallClauses }
            : this.buildCallLogWhereForRequester(requester);
        const smsWhere = requesterRole === 'agent'
            ? {
                accountId: requester?.accountId,
                OR: [
                    { agentId: requester?.userId },
                    { direction: 'inbound' },
                ],
            }
            : this.buildSmsWhereForRequester(requester);
        const [calls, smsMessages] = await Promise.all([
            this.prisma.callLog.findMany({
                where: callWhere,
                include: {
                    lead: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            phone: true,
                        },
                    },
                    agent: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
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
                take: limit,
            }),
            this.prisma.smsMessage.findMany({
                where: smsWhere,
                include: {
                    agent: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                take: limit,
            }),
        ]);
        const callItems = calls.map((call) => {
            const direction = (call.direction || 'outbound').toLowerCase();
            const status = call.callStatus;
            let category = 'dialed';
            if (direction === 'inbound') {
                category = status === client_1.CallStatus.MISSED ? 'missed' : 'received';
            }
            else if (status === client_1.CallStatus.MISSED) {
                category = 'missed';
            }
            return {
                id: call.id,
                type: 'call',
                category,
                status,
                direction,
                startedAt: call.startedAt,
                endedAt: call.endedAt,
                durationSeconds: call.durationSeconds ?? (call.startedAt && call.endedAt
                    ? Math.max(0, Math.round((new Date(call.endedAt).getTime() - new Date(call.startedAt).getTime()) / 1000))
                    : null),
                recordingUrl: call.recordingUrl,
                fromNumber: call.fromNumber || null,
                toNumber: call.toNumber || call.lead?.phone || null,
                lead: call.lead,
                agent: call.agent,
                campaign: call.campaign,
                disposition: call.disposition,
                notes: call.notes,
            };
        });
        const smsItems = smsMessages.map((msg) => ({
            id: msg.id,
            type: 'sms',
            category: msg.direction === 'inbound' ? 'received' : 'dialed',
            status: msg.status,
            direction: msg.direction,
            createdAt: msg.createdAt,
            fromNumber: msg.fromNumber,
            toNumber: msg.toNumber,
            body: msg.body,
            agent: msg.agent ?? null,
        }));
        const items = [...callItems, ...smsItems]
            .sort((a, b) => {
            const aTime = new Date(a.startedAt || a.createdAt || 0).getTime();
            const bTime = new Date(b.startedAt || b.createdAt || 0).getTime();
            return bTime - aTime;
        })
            .slice(0, limit);
        const stats = {
            missedCalls: callItems.filter((item) => item.category === 'missed').length,
            receivedCalls: callItems.filter((item) => item.category === 'received').length,
            dialedCalls: callItems.filter((item) => item.category === 'dialed').length,
            totalMessages: smsItems.length,
            inboundMessages: smsItems.filter((item) => item.direction === 'inbound').length,
            outboundMessages: smsItems.filter((item) => item.direction === 'outbound').length,
        };
        return { stats, items };
    }
    async getMyPeriodStats(requester, tzOffsetMinutes = 0) {
        const agentId = requester?.userId;
        if (!agentId)
            return null;
        const now = new Date();
        const safeOffset = Number.isFinite(tzOffsetMinutes) ? tzOffsetMinutes : 0;
        const todayStart = this.getTzAwareDayStart(now, safeOffset);
        const yesterdayStart = new Date(todayStart.getTime() - 86400000);
        const yesterdayEnd = new Date(todayStart.getTime() - 1);
        const thisWeekStart = this.getTzAwareWeekStart(now, safeOffset);
        const lastWeekStart = new Date(thisWeekStart.getTime() - 7 * 86400000);
        const lastWeekEnd = new Date(thisWeekStart.getTime() - 1);
        const thisMonthStart = this.getTzAwareMonthStart(now, safeOffset);
        const thisYearStart = this.getTzAwareYearStart(now, safeOffset);
        const rows = await this.prisma.$queryRaw(client_1.Prisma.sql `
            SELECT
                COUNT(*) FILTER (WHERE "startedAt" >= ${todayStart})                           AS today,
                COUNT(*) FILTER (WHERE "startedAt" >= ${yesterdayStart} AND "startedAt" <= ${yesterdayEnd}) AS yesterday,
                COUNT(*) FILTER (WHERE "startedAt" >= ${thisWeekStart})                        AS "thisWeek",
                COUNT(*) FILTER (WHERE "startedAt" >= ${lastWeekStart} AND "startedAt" <= ${lastWeekEnd}) AS "lastWeek",
                COUNT(*) FILTER (WHERE "startedAt" >= ${thisMonthStart})                       AS "thisMonth",
                COUNT(*) FILTER (WHERE "startedAt" >= ${thisYearStart})                        AS "thisYear"
            FROM "CallLog"
            WHERE "agentId" = ${agentId}
        `);
        const r = rows[0] || {};
        return {
            today: Number(r.today) || 0,
            yesterday: Number(r.yesterday) || 0,
            thisWeek: Number(r.thisWeek) || 0,
            lastWeek: Number(r.lastWeek) || 0,
            thisMonth: Number(r.thisMonth) || 0,
            thisYear: Number(r.thisYear) || 0,
        };
    }
    async updateCallTags(id, tags, requester) {
        await this.assertCallLogAccess(id, requester);
        return this.prisma.callLog.update({
            where: { id },
            data: { tags },
        });
    }
    async getStateHeatmap(requester) {
        const logs = await this.prisma.callLog.findMany({
            where: {
                ...this.buildCallLogWhereForRequester(requester),
                lead: {
                    phone: {
                        not: '',
                    },
                },
            },
            select: {
                lead: {
                    select: {
                        phone: true,
                    },
                },
            },
            take: 5000,
        });
        const stateCounts = {};
        for (const log of logs) {
            if (log.lead?.phone) {
                const state = (0, areaCodes_1.getStateFromE164)(log.lead.phone);
                if (state) {
                    stateCounts[state] = (stateCounts[state] || 0) + 1;
                }
            }
        }
        return Object.entries(stateCounts).map(([state, calls]) => ({ id: state, value: calls }));
    }
    async getCountryHeatmap(requester) {
        const PHONE_COUNTRY_MAP = {
            '1': 'US', '7': 'RU', '20': 'EG', '27': 'ZA', '30': 'GR', '31': 'NL',
            '32': 'BE', '33': 'FR', '34': 'ES', '36': 'HU', '39': 'IT', '40': 'RO',
            '41': 'CH', '43': 'AT', '44': 'GB', '45': 'DK', '46': 'SE', '47': 'NO',
            '48': 'PL', '49': 'DE', '51': 'PE', '52': 'MX', '54': 'AR', '55': 'BR',
            '56': 'CL', '57': 'CO', '58': 'VE', '60': 'MY', '61': 'AU', '62': 'ID',
            '63': 'PH', '64': 'NZ', '65': 'SG', '66': 'TH', '81': 'JP', '82': 'KR',
            '84': 'VN', '86': 'CN', '90': 'TR', '91': 'IN', '92': 'PK', '93': 'AF',
            '94': 'LK', '95': 'MM', '98': 'IR', '212': 'MA', '213': 'DZ', '216': 'TN',
            '218': 'LY', '234': 'NG', '249': 'SD', '251': 'ET', '254': 'KE',
            '255': 'TZ', '256': 'UG', '260': 'ZM', '263': 'ZW', '351': 'PT',
            '353': 'IE', '358': 'FI', '380': 'UA', '420': 'CZ', '421': 'SK',
            '971': 'AE', '966': 'SA', '965': 'KW', '974': 'QA', '973': 'BH',
            '968': 'OM', '967': 'YE', '962': 'JO', '961': 'LB', '964': 'IQ', '972': 'IL',
        };
        const logs = await this.prisma.callLog.findMany({
            where: this.buildCallLogWhereForRequester(requester),
            select: {
                toNumber: true,
                fromNumber: true,
                lead: { select: { phone: true } },
            },
            take: 5000,
        });
        const counts = {};
        for (const log of logs) {
            const phone = (log.lead?.phone || log.toNumber || log.fromNumber || '').replace(/[^0-9]/g, '');
            if (!phone)
                continue;
            let country = null;
            for (const len of [3, 2, 1]) {
                const prefix = phone.slice(0, len);
                if (PHONE_COUNTRY_MAP[prefix]) {
                    country = PHONE_COUNTRY_MAP[prefix];
                    break;
                }
            }
            if (!country)
                continue;
            counts[country] = (counts[country] || 0) + 1;
        }
        return Object.entries(counts)
            .map(([id, value]) => ({ id, value }))
            .sort((a, b) => b.value - a.value);
    }
    groupBy(array, key) {
        return array.reduce((acc, obj) => {
            const val = obj[key] || 'Unknown';
            acc[val] = (acc[val] || 0) + 1;
            return acc;
        }, {});
    }
    buildCallLogWhereForRequester(requester) {
        if (requester?.role?.toLowerCase() === 'superadmin') {
            return {};
        }
        if (!requester?.accountId) {
            throw new common_1.ForbiddenException('Company context is required');
        }
        return {
            OR: [
                { agent: { accountId: requester.accountId } },
                { lead: { accountId: requester.accountId } },
                { campaign: { accountId: requester.accountId } },
            ],
        };
    }
    buildSmsWhereForRequester(requester) {
        if (requester?.role?.toLowerCase() === 'superadmin') {
            return {};
        }
        if (!requester?.accountId) {
            throw new common_1.ForbiddenException('Company context is required');
        }
        return { accountId: requester.accountId };
    }
    buildUserWhereForRequester(requester) {
        if (requester?.role?.toLowerCase() === 'superadmin') {
            return {};
        }
        if (!requester?.accountId) {
            throw new common_1.ForbiddenException('Company context is required');
        }
        return {
            accountId: requester.accountId,
        };
    }
    async assertAgentAccess(agentId, requester) {
        if (requester?.role?.toLowerCase() === 'superadmin') {
            return;
        }
        const agent = await this.prisma.user.findUnique({
            where: { id: agentId },
            select: { accountId: true },
        });
        if (!agent) {
            throw new common_1.NotFoundException('Agent not found');
        }
        if (agent.accountId !== requester?.accountId) {
            throw new common_1.ForbiddenException('You can only access agents from your own company');
        }
    }
    async assertCampaignAccess(campaignId, requester) {
        if (requester?.role?.toLowerCase() === 'superadmin') {
            return;
        }
        const campaign = await this.prisma.campaign.findUnique({
            where: { id: campaignId },
            select: { accountId: true },
        });
        if (!campaign) {
            throw new common_1.NotFoundException('Campaign not found');
        }
        if (campaign.accountId !== requester?.accountId) {
            throw new common_1.ForbiddenException('You can only access campaigns from your own company');
        }
    }
    async assertCallLogAccess(callLogId, requester) {
        if (requester?.role?.toLowerCase() === 'superadmin') {
            return;
        }
        const log = await this.prisma.callLog.findUnique({
            where: { id: callLogId },
            select: {
                lead: {
                    select: {
                        accountId: true,
                    },
                },
                campaign: {
                    select: {
                        accountId: true,
                    },
                },
                agent: {
                    select: {
                        accountId: true,
                    },
                },
            },
        });
        if (!log) {
            throw new common_1.NotFoundException('Call log not found');
        }
        const accountId = log.agent?.accountId || log.lead?.accountId || log.campaign?.accountId;
        if (accountId !== requester?.accountId) {
            throw new common_1.ForbiddenException('You can only access call logs from your own company');
        }
    }
};
exports.AnalyticsService = AnalyticsService;
exports.AnalyticsService = AnalyticsService = AnalyticsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AnalyticsService);
//# sourceMappingURL=analytics.service.js.map
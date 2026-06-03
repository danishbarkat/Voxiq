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
    async getCampaignStats(campaignId, startDate, endDate, requester) {
        await this.assertCampaignAccess(campaignId, requester);
        let whereSql = `WHERE "campaignId" = '${campaignId}'`;
        if (startDate || endDate) {
            if (startDate && endDate) {
                whereSql += ` AND "startedAt" >= '${startDate.toISOString()}' AND "startedAt" <= '${endDate.toISOString()}'`;
            }
            else if (startDate) {
                whereSql += ` AND "startedAt" >= '${startDate.toISOString()}'`;
            }
            else if (endDate) {
                whereSql += ` AND "startedAt" <= '${endDate.toISOString()}'`;
            }
        }
        const statsQuery = await this.prisma.$queryRawUnsafe(`
            SELECT 
                COUNT(*) as "totalCalls",
                COUNT(*) FILTER (WHERE "callStatus" IN ('CONNECTED', 'COMPLETED')) as "connected",
                SUM("dealValue") as "revenue",
                AVG(EXTRACT(EPOCH FROM ("endedAt" - "startedAt"))) as "avgDuration"
            FROM "CallLog"
            ${whereSql}
        `);
        const dispositionQuery = await this.prisma.$queryRawUnsafe(`
            SELECT "disposition", COUNT(*) as count 
            FROM "CallLog" 
            ${whereSql} 
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
        let whereSql = `WHERE "agentId" = '${agentId}'`;
        if (startDate || endDate) {
            if (startDate && endDate) {
                whereSql += ` AND "startedAt" >= '${startDate.toISOString()}' AND "startedAt" <= '${endDate.toISOString()}'`;
            }
            else if (startDate) {
                whereSql += ` AND "startedAt" >= '${startDate.toISOString()}'`;
            }
            else if (endDate) {
                whereSql += ` AND "startedAt" <= '${endDate.toISOString()}'`;
            }
        }
        const statsQuery = await this.prisma.$queryRawUnsafe(`
            SELECT 
                COUNT(*) as "totalCalls",
                COUNT(*) FILTER (WHERE "callStatus" IN ('CONNECTED', 'COMPLETED')) as "connected",
                COUNT(*) FILTER (WHERE LOWER("disposition") IN ('interested', 'booked')) as "appointments",
                SUM("dealValue") as "revenue",
                SUM(EXTRACT(EPOCH FROM ("endedAt" - "startedAt"))) as "totalTalkTime"
            FROM "CallLog"
            ${whereSql}
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
            agent: {
                accountId: requester.accountId,
            },
        };
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
        if (log.agent?.accountId !== requester?.accountId) {
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
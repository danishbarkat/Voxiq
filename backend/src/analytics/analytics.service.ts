import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CallStatus, Prisma } from '@prisma/client';
import { getStateFromE164 } from '../utils/areaCodes';

@Injectable()
export class AnalyticsService {
    private readonly logger = new Logger(AnalyticsService.name);

    constructor(private prisma: PrismaService) { }

    private buildDateFilter(startDate?: Date, endDate?: Date): Prisma.Sql {
        if (startDate && endDate) return Prisma.sql`AND "startedAt" >= ${startDate} AND "startedAt" <= ${endDate}`;
        if (startDate) return Prisma.sql`AND "startedAt" >= ${startDate}`;
        if (endDate) return Prisma.sql`AND "startedAt" <= ${endDate}`;
        return Prisma.empty;
    }

    async getCampaignStats(campaignId: string, startDate?: Date, endDate?: Date, requester?: any) {
        await this.assertCampaignAccess(campaignId, requester);
        const dateFilter = this.buildDateFilter(startDate, endDate);

        const statsQuery = await this.prisma.$queryRaw<any[]>(Prisma.sql`
            SELECT
                COUNT(*) as "totalCalls",
                COUNT(*) FILTER (WHERE "callStatus" IN ('CONNECTED', 'COMPLETED')) as "connected",
                SUM("dealValue") as "revenue",
                AVG(EXTRACT(EPOCH FROM ("endedAt" - "startedAt"))) as "avgDuration"
            FROM "CallLog"
            WHERE "campaignId" = ${campaignId} ${dateFilter}
        `);

        const dispositionQuery = await this.prisma.$queryRaw<any[]>(Prisma.sql`
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

        const dispositions: Record<string, number> = {};
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

    async getAgentStats(agentId: string, startDate?: Date, endDate?: Date, requester?: any) {
        await this.assertAgentAccess(agentId, requester);
        const dateFilter = this.buildDateFilter(startDate, endDate);

        const statsQuery = await this.prisma.$queryRaw<any[]>(Prisma.sql`
            SELECT
                COUNT(*) as "totalCalls",
                COUNT(*) FILTER (WHERE "callStatus" IN ('CONNECTED', 'COMPLETED')) as "connected",
                COUNT(*) FILTER (WHERE LOWER("disposition") IN ('interested', 'booked')) as "appointments",
                SUM("dealValue") as "revenue",
                SUM(EXTRACT(EPOCH FROM ("endedAt" - "startedAt"))) as "totalTalkTime"
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

    /** Overview stats – all time + today */
    async getOverview(requester?: any) {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const where = this.buildCallLogWhereForRequester(requester);

        const [totalCalls, todayCalls, connected, appointments, recordings, revenueAgg] = await Promise.all([
            this.prisma.callLog.count({ where }),
            this.prisma.callLog.count({ where: { ...where, startedAt: { gte: todayStart } } }),
            this.prisma.callLog.count({ where: { ...where, callStatus: { in: [CallStatus.CONNECTED, CallStatus.COMPLETED] } } }),
            this.prisma.callLog.count({ where: { ...where, disposition: { in: ['Interested', 'Booked', 'interested', 'booked'] } } }),
            this.prisma.callLog.count({ where: { ...where, recordingUrl: { not: null } } }),
            (this.prisma.callLog as any).aggregate({ where, _sum: { dealValue: true } }),
        ]);
        const connectionRate = totalCalls > 0 ? ((connected / totalCalls) * 100).toFixed(1) : '0.0';
        const appointmentRate = totalCalls > 0 ? ((appointments / totalCalls) * 100).toFixed(1) : '0.0';
        const revenue = (revenueAgg as any)._sum?.dealValue || 0;
        return { totalCalls, todayCalls, connected, appointments, recordings, connectionRate, appointmentRate, revenue };
    }

    /** Calls per hour for a given date (defaults to today) */
    async getHourlyStats(dateStr?: string, requester?: any) {
        const date = dateStr ? new Date(dateStr) : new Date();
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);

        const logs = await this.prisma.callLog.findMany({
            where: { ...this.buildCallLogWhereForRequester(requester), startedAt: { gte: dayStart, lte: dayEnd } },
            select: { startedAt: true, callStatus: true },
        });

        const hours: { hour: number; calls: number; connected: number }[] = Array.from({ length: 24 }, (_, i) => ({ hour: i, calls: 0, connected: 0 }));
        for (const log of logs) {
            if (!log.startedAt) continue;
            const h = log.startedAt.getHours();
            hours[h].calls++;
            if (log.callStatus === CallStatus.CONNECTED || log.callStatus === CallStatus.COMPLETED) hours[h].connected++;
        }
        return hours;
    }

    /** Export all call logs as CSV string */
    async exportCsv(startDate?: Date, endDate?: Date, requester?: any): Promise<string> {
        const where: any = this.buildCallLogWhereForRequester(requester);
        if (startDate || endDate) {
            where.startedAt = where.startedAt || {};
            if (startDate) where.startedAt.gte = startDate;
            if (endDate) where.startedAt.lte = endDate;
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
            const csv = (v: any) => `"${(v || '').toString().replace(/"/g, '""')}"`;
            return [l.id, leadName, l.lead?.phone || '', l.agent?.name || '', l.campaign?.name || '', l.callStatus, l.disposition || '', l.notes || '', l.startedAt?.toISOString() || '', l.endedAt?.toISOString() || '', duration, (l as any).dealValue || 0, l.recordingUrl || ''].map(csv).join(',');
        });
        return header + rows.join('\n');
    }

    /** All agents ranked by performance */
    async getAllAgentScores(requester?: any) {
        const where = this.buildUserWhereForRequester(requester);
        const agents = await this.prisma.user.findMany({ where, select: { id: true, name: true, email: true } });
        const scores = await Promise.all(agents.map(async agent => {
            const stats = await this.getAgentStats(agent.id, undefined, undefined, requester);
            const score = (stats.connected * 10) + (stats.appointments * 25);
            return { ...agent, ...stats, score };
        }));
        return scores.sort((a, b) => b.score - a.score);
    }

    /** List call logs with recording URLs — supports filtering by phone, agent, date range */
    async getRecordings(filters?: {
        limit?: number;
        phone?: string;
        agentId?: string;
        dateFrom?: string;
        dateTo?: string;
    }, requester?: any) {
        const limit = filters?.limit ?? 200;

        // Build where clause
        const where: any = {
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
            if (filters.dateFrom) where.startedAt.gte = new Date(filters.dateFrom);
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

        // Attach duration (seconds) to each log
        return logs.map(log => ({
            ...log,
            durationSeconds: log.startedAt && log.endedAt
                ? Math.round((new Date(log.endedAt).getTime() - new Date(log.startedAt).getTime()) / 1000)
                : null,
        }));
    }

    /** Update tags for a specific call log */
    async updateCallTags(id: string, tags: string[], requester?: any) {
        await this.assertCallLogAccess(id, requester);
        return this.prisma.callLog.update({
            where: { id },
            data: { tags } as any,
        });
    }

    /** Aggregates calls by US State from area codes */
    async getStateHeatmap(requester?: any) {
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

        const stateCounts: Record<string, number> = {};
        for (const log of logs) {
            if (log.lead?.phone) {
                const state = getStateFromE164(log.lead.phone);
                if (state) {
                    stateCounts[state] = (stateCounts[state] || 0) + 1;
                }
            }
        }

        return Object.entries(stateCounts).map(([state, calls]) => ({ id: state, value: calls }));
    }

    private groupBy(array: any[], key: string) {
        return array.reduce((acc, obj) => {
            const val: string = (obj[key] as string) || 'Unknown';
            acc[val] = (acc[val] || 0) + 1;
            return acc;
        }, {});
    }

    private buildCallLogWhereForRequester(requester?: any) {
        if (requester?.role?.toLowerCase() === 'superadmin') {
            return {};
        }
        if (!requester?.accountId) {
            throw new ForbiddenException('Company context is required');
        }
        return {
            agent: {
                accountId: requester.accountId,
            },
        };
    }

    private buildUserWhereForRequester(requester?: any) {
        if (requester?.role?.toLowerCase() === 'superadmin') {
            return {};
        }
        if (!requester?.accountId) {
            throw new ForbiddenException('Company context is required');
        }
        return {
            accountId: requester.accountId,
        };
    }

    private async assertAgentAccess(agentId: string, requester?: any) {
        if (requester?.role?.toLowerCase() === 'superadmin') {
            return;
        }
        const agent = await this.prisma.user.findUnique({
            where: { id: agentId },
            select: { accountId: true },
        });
        if (!agent) {
            throw new NotFoundException('Agent not found');
        }
        if (agent.accountId !== requester?.accountId) {
            throw new ForbiddenException('You can only access agents from your own company');
        }
    }

    private async assertCampaignAccess(campaignId: string, requester?: any) {
        if (requester?.role?.toLowerCase() === 'superadmin') {
            return;
        }
        const campaign = await this.prisma.campaign.findUnique({
            where: { id: campaignId },
            select: { accountId: true },
        });
        if (!campaign) {
            throw new NotFoundException('Campaign not found');
        }
        if (campaign.accountId !== requester?.accountId) {
            throw new ForbiddenException('You can only access campaigns from your own company');
        }
    }

    private async assertCallLogAccess(callLogId: string, requester?: any) {
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
            throw new NotFoundException('Call log not found');
        }
        if (log.agent?.accountId !== requester?.accountId) {
            throw new ForbiddenException('You can only access call logs from your own company');
        }
    }
}

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CallStatus } from '@prisma/client';
import { getStateFromE164 } from '../utils/areaCodes';

@Injectable()
export class AnalyticsService {
    private readonly logger = new Logger(AnalyticsService.name);

    constructor(private prisma: PrismaService) { }

    async getCampaignStats(campaignId: string, startDate?: Date, endDate?: Date) {
        let whereSql = `WHERE "campaignId" = '${campaignId}'`;
        if (startDate || endDate) {
            if (startDate && endDate) {
                whereSql += ` AND "startedAt" >= '${startDate.toISOString()}' AND "startedAt" <= '${endDate.toISOString()}'`;
            } else if (startDate) {
                whereSql += ` AND "startedAt" >= '${startDate.toISOString()}'`;
            } else if (endDate) {
                whereSql += ` AND "startedAt" <= '${endDate.toISOString()}'`;
            }
        }

        const statsQuery = await this.prisma.$queryRawUnsafe<any[]>(`
            SELECT 
                COUNT(*) as "totalCalls",
                COUNT(*) FILTER (WHERE "callStatus" IN ('CONNECTED', 'COMPLETED')) as "connected",
                SUM("dealValue") as "revenue",
                AVG(EXTRACT(EPOCH FROM ("endedAt" - "startedAt"))) as "avgDuration"
            FROM "CallLog"
            ${whereSql}
        `);

        const dispositionQuery = await this.prisma.$queryRawUnsafe<any[]>(`
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

    async getAgentStats(agentId: string, startDate?: Date, endDate?: Date) {
        let whereSql = `WHERE "agentId" = '${agentId}'`;
        if (startDate || endDate) {
            if (startDate && endDate) {
                whereSql += ` AND "startedAt" >= '${startDate.toISOString()}' AND "startedAt" <= '${endDate.toISOString()}'`;
            } else if (startDate) {
                whereSql += ` AND "startedAt" >= '${startDate.toISOString()}'`;
            } else if (endDate) {
                whereSql += ` AND "startedAt" <= '${endDate.toISOString()}'`;
            }
        }

        const statsQuery = await this.prisma.$queryRawUnsafe<any[]>(`
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

    /** Overview stats – all time + today */
    async getOverview() {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const [totalCalls, todayCalls, connected, appointments, recordings, revenueAgg] = await Promise.all([
            this.prisma.callLog.count(),
            this.prisma.callLog.count({ where: { startedAt: { gte: todayStart } } }),
            this.prisma.callLog.count({ where: { callStatus: { in: [CallStatus.CONNECTED, CallStatus.COMPLETED] } } }),
            this.prisma.callLog.count({ where: { disposition: { in: ['Interested', 'Booked', 'interested', 'booked'] } } }),
            this.prisma.callLog.count({ where: { recordingUrl: { not: null } } }),
            (this.prisma.callLog as any).aggregate({ _sum: { dealValue: true } }),
        ]);
        const connectionRate = totalCalls > 0 ? ((connected / totalCalls) * 100).toFixed(1) : '0.0';
        const appointmentRate = totalCalls > 0 ? ((appointments / totalCalls) * 100).toFixed(1) : '0.0';
        const revenue = (revenueAgg as any)._sum?.dealValue || 0;
        return { totalCalls, todayCalls, connected, appointments, recordings, connectionRate, appointmentRate, revenue };
    }

    /** Calls per hour for a given date (defaults to today) */
    async getHourlyStats(dateStr?: string) {
        const date = dateStr ? new Date(dateStr) : new Date();
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);

        const logs = await this.prisma.callLog.findMany({
            where: { startedAt: { gte: dayStart, lte: dayEnd } },
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
    async exportCsv(startDate?: Date, endDate?: Date): Promise<string> {
        const where: any = {};
        if (startDate || endDate) {
            where.startedAt = {};
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
    async getAllAgentScores() {
        const agents = await this.prisma.user.findMany({ select: { id: true, name: true, email: true } });
        const scores = await Promise.all(agents.map(async agent => {
            const stats = await this.getAgentStats(agent.id);
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
    }) {
        const limit = filters?.limit ?? 200;

        // Build where clause
        const where: any = {
            OR: [
                { recordingUrl: { not: null } },
                { vmRecordingUrl: { not: null } },
            ],
        };

        if (filters?.agentId) {
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
    async updateCallTags(id: string, tags: string[]) {
        return this.prisma.callLog.update({
            where: { id },
            data: { tags } as any,
        });
    }

    /** Aggregates calls by US State from area codes */
    async getStateHeatmap() {
        // Optimized to use raw query instead of fetching every lead and loading relations into memory
        const rows = await this.prisma.$queryRaw<any[]>`
            SELECT l.phone FROM "CallLog" c
            JOIN "Lead" l ON c."leadId" = l.id
            WHERE l.phone IS NOT NULL AND l.phone != ''
        `;

        const stateCounts: Record<string, number> = {};
        for (const log of rows) {
            if (log.phone) {
                const state = getStateFromE164(log.phone);
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
}

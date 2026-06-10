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
                AVG(COALESCE("durationSeconds", EXTRACT(EPOCH FROM ("endedAt" - "startedAt")))) as "avgDuration"
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

    async getHistory(filters?: { limit?: number }, requester?: any) {
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
        const agentCallClauses: any[] = [{ agentId: requester?.userId }];
        if (requesterUser?.callerNumber) {
            agentCallClauses.push(
                { fromNumber: requesterUser.callerNumber },
                { toNumber: requesterUser.callerNumber },
            );
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
            let category: 'missed' | 'received' | 'dialed' = 'dialed';

            if (direction === 'inbound') {
                category = status === CallStatus.MISSED ? 'missed' : 'received';
            } else if (status === CallStatus.MISSED) {
                category = 'missed';
            }

            return {
                id: call.id,
                type: 'call' as const,
                category,
                status,
                direction,
                startedAt: call.startedAt,
                endedAt: call.endedAt,
                durationSeconds: call.durationSeconds ?? (
                    call.startedAt && call.endedAt
                        ? Math.max(0, Math.round((new Date(call.endedAt).getTime() - new Date(call.startedAt).getTime()) / 1000))
                        : null
                ),
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
            type: 'sms' as const,
            category: msg.direction === 'inbound' ? 'received' : 'dialed',
            status: msg.status,
            direction: msg.direction,
            createdAt: msg.createdAt,
            fromNumber: msg.fromNumber,
            toNumber: msg.toNumber,
            body: msg.body,
            agent: (msg as any).agent ?? null,
        }));

        const items = [...callItems, ...smsItems]
            .sort((a, b) => {
                const aTime = new Date((a as any).startedAt || (a as any).createdAt || 0).getTime();
                const bTime = new Date((b as any).startedAt || (b as any).createdAt || 0).getTime();
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

    /** Returns call counts for Today / Yesterday / This Week / Last Week / This Month / This Year */
    async getMyPeriodStats(requester?: any) {
        const agentId = requester?.userId;
        if (!agentId) return null;

        const now = new Date();
        // Today boundaries (UTC-based, same as DB)
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterdayStart = new Date(todayStart.getTime() - 86400000);
        const yesterdayEnd = new Date(todayStart.getTime() - 1);

        // Week: Monday as start
        const dayOfWeek = now.getDay(); // 0=Sun
        const daysToMon = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const thisWeekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysToMon);
        const lastWeekStart = new Date(thisWeekStart.getTime() - 7 * 86400000);
        const lastWeekEnd = new Date(thisWeekStart.getTime() - 1);

        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const thisYearStart = new Date(now.getFullYear(), 0, 1);

        const rows = await this.prisma.$queryRaw<any[]>(Prisma.sql`
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

    async getCountryHeatmap(requester?: any) {
        const PHONE_COUNTRY_MAP: Record<string, string> = {
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

        const counts: Record<string, number> = {};
        for (const log of logs) {
            const phone = (log.lead?.phone || log.toNumber || log.fromNumber || '').replace(/[^0-9]/g, '');
            if (!phone) continue;
            let country: string | null = null;
            for (const len of [3, 2, 1]) {
                const prefix = phone.slice(0, len);
                if (PHONE_COUNTRY_MAP[prefix]) {
                    country = PHONE_COUNTRY_MAP[prefix];
                    break;
                }
            }
            if (!country) continue;
            counts[country] = (counts[country] || 0) + 1;
        }

        return Object.entries(counts)
            .map(([id, value]) => ({ id, value }))
            .sort((a, b) => b.value - a.value);
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
            OR: [
                { agent: { accountId: requester.accountId } },
                { lead: { accountId: requester.accountId } },
                { campaign: { accountId: requester.accountId } },
            ],
        };
    }

    private buildSmsWhereForRequester(requester?: any) {
        if (requester?.role?.toLowerCase() === 'superadmin') {
            return {};
        }
        if (!requester?.accountId) {
            throw new ForbiddenException('Company context is required');
        }
        return { accountId: requester.accountId };
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
            throw new NotFoundException('Call log not found');
        }
        const accountId = log.agent?.accountId || log.lead?.accountId || log.campaign?.accountId;
        if (accountId !== requester?.accountId) {
            throw new ForbiddenException('You can only access call logs from your own company');
        }
    }
}

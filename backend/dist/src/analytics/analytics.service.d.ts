import { PrismaService } from '../prisma/prisma.service';
export declare class AnalyticsService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    private getTzAwareDayStart;
    private getTzAwareMonthStart;
    private getTzAwareYearStart;
    private getTzAwareWeekStart;
    private buildDateFilter;
    getCampaignStats(campaignId: string, startDate?: Date, endDate?: Date, requester?: any): Promise<{
        totalCalls: number;
        connected: number;
        connectionRate: string;
        avgDuration: string;
        revenue: number;
        dispositions: Record<string, number>;
    }>;
    getAgentStats(agentId: string, startDate?: Date, endDate?: Date, requester?: any): Promise<{
        totalCalls: number;
        connected: number;
        appointments: number;
        conversionRate: string;
        totalTalkTime: string;
        avgTalkTime: string;
        revenue: number;
    }>;
    getOverview(requester?: any): Promise<{
        totalCalls: number;
        todayCalls: number;
        connected: number;
        appointments: number;
        recordings: number;
        connectionRate: string;
        appointmentRate: string;
        revenue: any;
    }>;
    getHourlyStats(dateStr?: string, requester?: any): Promise<{
        hour: number;
        calls: number;
        connected: number;
    }[]>;
    exportCsv(startDate?: Date, endDate?: Date, requester?: any): Promise<string>;
    getAllAgentScores(requester?: any): Promise<{
        score: number;
        totalCalls: number;
        connected: number;
        appointments: number;
        conversionRate: string;
        totalTalkTime: string;
        avgTalkTime: string;
        revenue: number;
        id: string;
        name: string;
        email: string;
    }[]>;
    getRecordings(filters?: {
        limit?: number;
        phone?: string;
        agentId?: string;
        dateFrom?: string;
        dateTo?: string;
    }, requester?: any): Promise<{
        durationSeconds: number | null;
        lead: {
            id: string;
            firstName: string;
            lastName: string;
            phone: string;
        } | null;
        agent: {
            id: string;
            name: string;
            email: string;
        } | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tags: string[];
        callerName: string | null;
        leadId: string | null;
        agentId: string | null;
        campaignId: string | null;
        startedAt: Date;
        endedAt: Date | null;
        disposition: string | null;
        recordingUrl: string | null;
        callStatus: import("@prisma/client").$Enums.CallStatus;
        callControlId: string | null;
        dealValue: number | null;
        notes: string | null;
        vmRecordingUrl: string | null;
        direction: string | null;
        fromNumber: string | null;
        toNumber: string | null;
    }[]>;
    getHistory(filters?: {
        limit?: number;
    }, requester?: any): Promise<{
        stats: {
            missedCalls: number;
            receivedCalls: number;
            dialedCalls: number;
            totalMessages: number;
            inboundMessages: number;
            outboundMessages: number;
        };
        items: ({
            id: string;
            type: "call";
            category: "received" | "missed" | "dialed";
            status: import("@prisma/client").$Enums.CallStatus;
            direction: string;
            startedAt: Date;
            endedAt: Date | null;
            durationSeconds: number | null;
            recordingUrl: string | null;
            fromNumber: string | null;
            toNumber: string | null;
            lead: {
                id: string;
                firstName: string;
                lastName: string;
                phone: string;
            } | null;
            agent: {
                id: string;
                name: string;
                email: string;
            } | null;
            campaign: {
                id: string;
                name: string;
            } | null;
            disposition: string | null;
            notes: string | null;
        } | {
            id: string;
            type: "sms";
            category: string;
            status: string;
            direction: string;
            createdAt: Date;
            fromNumber: string;
            toNumber: string;
            body: string;
            agent: any;
        })[];
    }>;
    getMyPeriodStats(requester?: any, tzOffsetMinutes?: number): Promise<{
        today: number;
        yesterday: number;
        thisWeek: number;
        lastWeek: number;
        thisMonth: number;
        thisYear: number;
    } | null>;
    updateCallTags(id: string, tags: string[], requester?: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tags: string[];
        callerName: string | null;
        leadId: string | null;
        agentId: string | null;
        campaignId: string | null;
        startedAt: Date;
        endedAt: Date | null;
        disposition: string | null;
        recordingUrl: string | null;
        callStatus: import("@prisma/client").$Enums.CallStatus;
        callControlId: string | null;
        dealValue: number | null;
        notes: string | null;
        vmRecordingUrl: string | null;
        direction: string | null;
        fromNumber: string | null;
        toNumber: string | null;
        durationSeconds: number | null;
    }>;
    getStateHeatmap(requester?: any): Promise<{
        id: string;
        value: number;
    }[]>;
    getCountryHeatmap(requester?: any): Promise<{
        id: string;
        value: number;
    }[]>;
    private groupBy;
    private buildCallLogWhereForRequester;
    private buildSmsWhereForRequester;
    private buildUserWhereForRequester;
    private assertAgentAccess;
    private assertCampaignAccess;
    private assertCallLogAccess;
}

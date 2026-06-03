import { PrismaService } from '../prisma/prisma.service';
export declare class AnalyticsService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
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
        agentId: string | null;
        leadId: string | null;
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
    updateCallTags(id: string, tags: string[], requester?: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tags: string[];
        callerName: string | null;
        agentId: string | null;
        leadId: string | null;
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
    }>;
    getStateHeatmap(requester?: any): Promise<{
        id: string;
        value: number;
    }[]>;
    private groupBy;
    private buildCallLogWhereForRequester;
    private buildUserWhereForRequester;
    private assertAgentAccess;
    private assertCampaignAccess;
    private assertCallLogAccess;
}

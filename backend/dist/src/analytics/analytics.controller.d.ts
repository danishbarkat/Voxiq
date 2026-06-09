import { AnalyticsService } from './analytics.service';
import type { Response } from 'express';
export declare class AnalyticsController {
    private readonly analyticsService;
    constructor(analyticsService: AnalyticsService);
    getOverview(req: any): Promise<{
        totalCalls: number;
        todayCalls: number;
        connected: number;
        appointments: number;
        recordings: number;
        connectionRate: string;
        appointmentRate: string;
        revenue: any;
    }>;
    getHourly(date?: string, req?: any): Promise<{
        hour: number;
        calls: number;
        connected: number;
    }[]>;
    exportCsv(start: string, end: string, res: Response, req?: any): Promise<void>;
    getAgentScores(req?: any): Promise<{
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
    getRecordings(limit?: string, phone?: string, agentId?: string, dateFrom?: string, dateTo?: string, req?: any): Promise<{
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
    getHistory(limit?: string, req?: any): Promise<{
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
    getHeatmap(req?: any): Promise<{
        id: string;
        value: number;
    }[]>;
    getCountryHeatmap(req?: any): Promise<{
        id: string;
        value: number;
    }[]>;
    updateTags(id: string, tags: string[], req?: any): Promise<{
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
    getCampaignStats(id: string, start?: string, end?: string, req?: any): Promise<{
        totalCalls: number;
        connected: number;
        connectionRate: string;
        avgDuration: string;
        revenue: number;
        dispositions: Record<string, number>;
    }>;
    getAgentStats(id: string, start?: string, end?: string, req?: any): Promise<{
        totalCalls: number;
        connected: number;
        appointments: number;
        conversionRate: string;
        totalTalkTime: string;
        avgTalkTime: string;
        revenue: number;
    }>;
}

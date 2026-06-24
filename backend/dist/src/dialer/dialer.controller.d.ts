import { Request } from 'express';
import { DialerService } from './dialer.service';
import { VoipService } from '../voip/voip.service';
import { PrismaService } from '../prisma/prisma.service';
import { CallStatus } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
export declare class DialerController {
    private dialerService;
    private voipService;
    private prisma;
    private config;
    private readonly ringingLockWindowMs;
    private readonly connectedLockWindowMs;
    private readonly orphanedRingingGraceMs;
    constructor(dialerService: DialerService, voipService: VoipService, prisma: PrismaService, config: ConfigService);
    private getDefaultCallerName;
    private normalizeComparablePhone;
    private clearOrphanedRingingCall;
    startCall(body: {
        to: string;
        from?: string;
        callerName?: string;
        leadId?: string;
        agentId?: string;
        callLogId?: string;
    }): Promise<{
        error: string;
        message: string;
        existingCallLogId: string;
        callId?: undefined;
        status?: undefined;
        callLogId?: undefined;
    } | {
        error: string;
        message: string;
        existingCallLogId?: undefined;
        callId?: undefined;
        status?: undefined;
        callLogId?: undefined;
    } | {
        callId: string;
        status: string;
        callLogId: string | null;
        error?: undefined;
        message?: undefined;
        existingCallLogId?: undefined;
    }>;
    hangupCall(body: {
        callId: string;
    }): Promise<{
        message: string;
    }>;
    getCallStatus(id: string): Promise<{
        callId: string;
        status: string;
        raw: any;
    }>;
    startCampaign(id: string): Promise<{
        message: string;
    }>;
    pauseCampaign(id: string): Promise<{
        message: string;
    }>;
    handleDisposition(body: {
        callLogId: string;
        disposition: string;
        notes?: string;
        callbackAt?: string;
        dealValue?: number;
    }): Promise<{
        message: string;
    }>;
    updateCallLog(id: string, body: {
        callControlId?: string;
        disposition?: string;
        notes?: string;
        callStatus?: CallStatus;
        endedAt?: string | Date | null;
    }): Promise<{
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
    logCall(body: {
        leadId?: string;
        agentId: string;
        callControlId?: string;
        campaignId?: string;
        manualNumber?: string;
        manualName?: string;
        isManual?: boolean;
    }): Promise<any>;
    lockLead(body: {
        leadId?: string;
        agentId: string;
        phone?: string;
        manualNumber?: string;
    }): Promise<{
        locked: boolean;
        reason: string;
        callLogId?: undefined;
    } | {
        locked: boolean;
        callLogId: any;
        reason?: undefined;
    }>;
    addToDnc(body: {
        phone: string;
        accountId?: string;
        reason?: string;
    }): Promise<{
        error: string;
        success?: undefined;
        phone?: undefined;
    } | {
        success: boolean;
        phone: string;
        error?: undefined;
    }>;
    addLeadToDnc(leadId: string, body: {
        reason?: string;
    }): Promise<{
        error: string;
        success?: undefined;
        leadId?: undefined;
        phone?: undefined;
    } | {
        success: boolean;
        leadId: string;
        phone: string;
        error?: undefined;
    }>;
    getScheduledCallbacks(req: Request & {
        user?: any;
    }, agentId?: string): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.ScheduledCallbackStatus;
        createdAt: Date;
        updatedAt: Date;
        accountId: string;
        agentId: string;
        notes: string | null;
        customerName: string;
        customerPhone: string;
        customerEmail: string | null;
        scheduledAt: Date;
    }[]>;
    createScheduledCallback(req: Request & {
        user?: any;
    }, body: {
        agentId?: string;
        accountId?: string;
        customerName: string;
        customerPhone: string;
        customerEmail?: string;
        scheduledAt: string;
        notes?: string;
    }): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.ScheduledCallbackStatus;
        createdAt: Date;
        updatedAt: Date;
        accountId: string;
        agentId: string;
        notes: string | null;
        customerName: string;
        customerPhone: string;
        customerEmail: string | null;
        scheduledAt: Date;
    }>;
    updateScheduledCallback(id: string, body: {
        status?: 'PENDING' | 'DONE' | 'CANCELLED';
        notes?: string;
        scheduledAt?: string;
    }): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.ScheduledCallbackStatus;
        createdAt: Date;
        updatedAt: Date;
        accountId: string;
        agentId: string;
        notes: string | null;
        customerName: string;
        customerPhone: string;
        customerEmail: string | null;
        scheduledAt: Date;
    }>;
    deleteScheduledCallback(id: string): Promise<{
        success: boolean;
    }>;
    private normalizeToE164;
}

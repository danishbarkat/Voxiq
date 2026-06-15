import * as Bull from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { VoipService } from '../voip/voip.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { ConfigService } from '@nestjs/config';
interface ParallelDialJob {
    campaignId: string;
    leadIds: string[];
    agentId?: string;
}
export declare class DialerService {
    private dialerQueue;
    private prisma;
    private voipService;
    private websocketGateway;
    private configService;
    private readonly logger;
    private activeCampaigns;
    private readonly ringingLockWindowMs;
    private readonly connectedLockWindowMs;
    constructor(dialerQueue: Bull.Queue, prisma: PrismaService, voipService: VoipService, websocketGateway: WebsocketGateway, configService: ConfigService);
    cleanupStaleRingingCalls(): Promise<void>;
    reconcileRecentActiveCalls(): Promise<void>;
    startCampaign(campaignId: string): Promise<void>;
    private resolveAgentId;
    pauseCampaign(campaignId: string): Promise<void>;
    private startPredictiveDialing;
    private startPowerDialing;
    private startPreviewDialing;
    executeParallelDial(job: ParallelDialJob): Promise<void>;
    private getNextLeadBatch;
    private checkCompliance;
    private getDefaultCallerName;
    private getLocalCallerIdentity;
    private normalizePhone;
    handleDisposition(callLogId: string, disposition: string, notes?: string, callbackAt?: string, dealValue?: number): Promise<void>;
    logCall(data: {
        leadId?: string;
        agentId: string;
        callControlId?: string;
        campaignId?: string;
        manualNumber?: string;
        manualName?: string;
        isManual?: boolean;
    }): Promise<any>;
}
export {};

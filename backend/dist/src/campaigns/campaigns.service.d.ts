import { PrismaService } from '../prisma/prisma.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
export declare class CampaignsService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    create(createCampaignDto: CreateCampaignDto): Promise<{
        id: string;
        name: string;
        status: import("@prisma/client").$Enums.CampaignStatus;
        createdAt: Date;
        updatedAt: Date;
        numberPool: import("@prisma/client/runtime/library").JsonValue | null;
        accountId: string;
        mode: import("@prisma/client").$Enums.CampaignMode;
        pacing: number;
        localPresence: boolean;
        record: boolean;
    }>;
    findAll(accountId?: string): Promise<({
        account: {
            id: string;
            name: string;
        };
        lists: ({
            list: {
                id: string;
                name: string;
            };
        } & {
            createdAt: Date;
            listId: string;
            campaignId: string;
        })[];
        _count: {
            callLogs: number;
        };
    } & {
        id: string;
        name: string;
        status: import("@prisma/client").$Enums.CampaignStatus;
        createdAt: Date;
        updatedAt: Date;
        numberPool: import("@prisma/client/runtime/library").JsonValue | null;
        accountId: string;
        mode: import("@prisma/client").$Enums.CampaignMode;
        pacing: number;
        localPresence: boolean;
        record: boolean;
    })[]>;
    findOne(id: string): Promise<({
        account: {
            id: string;
            name: string;
            status: import("@prisma/client").$Enums.AccountStatus;
            accessCode: string | null;
            accessCodeIssuedAt: Date | null;
            accessCodeUsedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            numberPool: import("@prisma/client/runtime/library").JsonValue | null;
            agentLimit: number | null;
            approved: boolean;
            requestedAgentLimit: number | null;
            requestedNumbers: number | null;
            rejectionReason: string | null;
            approvedAt: Date | null;
            adminPhone: string | null;
            website: string | null;
            ntn: string | null;
            termsAccepted: boolean;
            packageName: string | null;
            isTrial: boolean;
            trialEndsAt: Date | null;
            requestedPackage: string | null;
            canOutboundCall: boolean;
            canInboundCall: boolean;
            canSendSms: boolean;
            canRecord: boolean;
            monthlyCallLimit: number | null;
            monthlySmsLimit: number | null;
        };
        lists: ({
            list: {
                id: string;
                name: string;
                createdAt: Date;
                updatedAt: Date;
                accountId: string;
                description: string | null;
            };
        } & {
            createdAt: Date;
            listId: string;
            campaignId: string;
        })[];
        callLogs: {
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
        }[];
    } & {
        id: string;
        name: string;
        status: import("@prisma/client").$Enums.CampaignStatus;
        createdAt: Date;
        updatedAt: Date;
        numberPool: import("@prisma/client/runtime/library").JsonValue | null;
        accountId: string;
        mode: import("@prisma/client").$Enums.CampaignMode;
        pacing: number;
        localPresence: boolean;
        record: boolean;
    }) | null>;
    update(id: string, updateCampaignDto: UpdateCampaignDto): Promise<{
        id: string;
        name: string;
        status: import("@prisma/client").$Enums.CampaignStatus;
        createdAt: Date;
        updatedAt: Date;
        numberPool: import("@prisma/client/runtime/library").JsonValue | null;
        accountId: string;
        mode: import("@prisma/client").$Enums.CampaignMode;
        pacing: number;
        localPresence: boolean;
        record: boolean;
    }>;
    assignLists(id: string, listIds: string[]): Promise<({
        list: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            accountId: string;
            description: string | null;
        };
    } & {
        createdAt: Date;
        listId: string;
        campaignId: string;
    })[]>;
    getAssignedLists(id: string): Promise<({
        list: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            accountId: string;
            description: string | null;
        };
    } & {
        createdAt: Date;
        listId: string;
        campaignId: string;
    })[]>;
    remove(id: string): Promise<{
        id: string;
        name: string;
        status: import("@prisma/client").$Enums.CampaignStatus;
        createdAt: Date;
        updatedAt: Date;
        numberPool: import("@prisma/client/runtime/library").JsonValue | null;
        accountId: string;
        mode: import("@prisma/client").$Enums.CampaignMode;
        pacing: number;
        localPresence: boolean;
        record: boolean;
    }>;
    getMetrics(id: string): Promise<{
        campaignId: string;
        totalCalls: number;
        completedCalls: number;
        connectedCalls: number;
        connectionRate: string;
        avgDuration: string;
    } | null>;
}

import { SuperAdminService } from './superadmin.service';
declare class NumberEntryDto {
    number: string;
    callerName: string;
    areaCode: string;
}
declare class ApproveDto {
    agentLimit: number;
    numberPool: NumberEntryDto[];
}
declare class RejectDto {
    reason: string;
}
export declare class SuperAdminController {
    private readonly superAdminService;
    constructor(superAdminService: SuperAdminService);
    getOverview(): Promise<{
        connectionRate: number;
        topCompanies: {
            accountId: any;
            companyName: any;
            totalCalls: number;
            totalMinutes: number;
            revenue: any;
        }[];
        topStates: {
            state: string;
            calls: number;
        }[];
        totalCompanies: number;
        activeCompanies: number;
        pendingCompanies: number;
        inactiveCompanies: number;
        totalAgents: number;
        totalAdmins: number;
        totalLeads: number;
        totalLists: number;
        totalCampaigns: number;
        totalNumbers: number;
        totalCalls: number;
        connectedCalls: number;
        totalMinutes: number;
        totalRevenue: number;
        recordings: number;
        inboundCalls: number;
        outboundCalls: number;
    }>;
    getAllCompanies(): Promise<{
        id: any;
        name: any;
        status: any;
        approved: any;
        agentLimit: any;
        requestedAgentLimit: any;
        requestedNumbers: any;
        accessCode: any;
        accessCodeUsed: boolean;
        adminPhone: any;
        rejectionReason: any;
        reactivationRequested: any;
        approvedAt: any;
        createdAt: any;
        userCount: any;
        agentCount: any;
        adminCount: any;
        leadCount: any;
        listCount: any;
        campaignCount: any;
        numberCount: any;
        adminEmail: any;
        adminName: any;
        totalCalls: number;
        connectedCalls: number;
        totalMinutes: number;
        avgDuration: number;
        revenue: any;
        recordings: number;
        inboundCalls: number;
        outboundCalls: number;
        services: (string | null)[];
        topStates: {
            state: string;
            calls: number;
        }[];
    }[]>;
    getCompanyDetails(id: string): Promise<{
        id: string;
        name: string;
        status: import("@prisma/client").$Enums.AccountStatus;
        approved: boolean;
        agentLimit: number | null;
        requestedAgentLimit: number | null;
        requestedNumbers: number | null;
        accessCode: string | null;
        accessCodeUsed: boolean;
        approvedAt: Date | null;
        createdAt: Date;
        numberPool: import("@prisma/client/runtime/library").JsonArray;
        numberCount: number;
        services: (string | null)[];
        stats: {
            totalCalls: number;
            connectedCalls: number;
            totalMinutes: number;
            avgDuration: number;
            revenue: any;
            recordings: number;
            inboundCalls: number;
            outboundCalls: number;
        };
        topStates: {
            state: string;
            calls: number;
        }[];
        activityByDay: {
            date: string;
            calls: number;
            revenue: number;
        }[];
        topAgents: {
            id: any;
            name: any;
            email: any;
            calls: number;
            revenue: number;
        }[];
        admins: {
            id: string;
            name: string;
            email: string;
            status: import("@prisma/client").$Enums.UserStatus;
            createdAt: Date;
        }[];
        agents: {
            id: string;
            name: string;
            email: string;
            status: import("@prisma/client").$Enums.UserStatus;
            callerNumber: string | null;
            createdAt: Date;
        }[];
        lists: {
            id: string;
            name: string;
            leadCount: number;
            createdAt: Date;
        }[];
        campaigns: {
            id: string;
            name: string;
            status: import("@prisma/client").$Enums.CampaignStatus;
            createdAt: Date;
            mode: import("@prisma/client").$Enums.CampaignMode;
            localPresence: boolean;
            record: boolean;
        }[];
        recentCalls: {
            id: string;
            startedAt: Date;
            endedAt: Date | null;
            direction: string;
            callStatus: import("@prisma/client").$Enums.CallStatus;
            disposition: string | null;
            fromNumber: string | null;
            toNumber: string | null;
            dealValue: number;
            recordingUrl: string | null;
            vmRecordingUrl: string | null;
            agentName: string;
            campaignName: string;
            leadName: string;
            leadPhone: string | null;
        }[];
    }>;
    regenerateAccessCode(id: string): Promise<{
        id: string;
        name: string;
        accessCode: string | null;
        accessCodeIssuedAt: Date | null;
    }>;
    approveCompany(id: string, dto: ApproveDto): Promise<{
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
    }>;
    rejectCompany(id: string, dto: RejectDto): Promise<{
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
    }>;
    deactivateCompany(id: string): Promise<{
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
    }>;
    activateCompany(id: string): Promise<{
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
    }>;
    getAvailableNumbers(): Promise<{
        assigned: boolean;
        number: string;
        callerName: string;
        countryCode: string;
    }[]>;
    assignNumbers(id: string, dto: ApproveDto): Promise<{
        message: string;
        assigned: {
            number: string;
            callerName: string;
            areaCode: string;
        }[];
    }>;
    unassignNumber(id: string, number: string): Promise<{
        message: string;
        number: string;
    }>;
    getAnalytics(): Promise<{
        accountId: string;
        companyName: string;
        status: import("@prisma/client").$Enums.AccountStatus;
        daily: {
            calls: number;
            connectedCalls: number;
            totalMinutes: number;
            avgDuration: number;
            revenue: any;
            inboundCalls: number;
            outboundCalls: number;
            recordings: number;
            topStates: {
                state: string;
                calls: number;
            }[];
        };
        weekly: {
            calls: number;
            connectedCalls: number;
            totalMinutes: number;
            avgDuration: number;
            revenue: any;
            inboundCalls: number;
            outboundCalls: number;
            recordings: number;
            topStates: {
                state: string;
                calls: number;
            }[];
        };
        monthly: {
            calls: number;
            connectedCalls: number;
            totalMinutes: number;
            avgDuration: number;
            revenue: any;
            inboundCalls: number;
            outboundCalls: number;
            recordings: number;
            topStates: {
                state: string;
                calls: number;
            }[];
        };
    }[]>;
    getCompanyAnalytics(id: string): Promise<{
        accountId: string;
        companyName: string;
        daily: {
            calls: number;
            connectedCalls: number;
            totalMinutes: number;
            avgDuration: number;
            revenue: any;
            inboundCalls: number;
            outboundCalls: number;
            recordings: number;
            topStates: {
                state: string;
                calls: number;
            }[];
        };
        weekly: {
            calls: number;
            connectedCalls: number;
            totalMinutes: number;
            avgDuration: number;
            revenue: any;
            inboundCalls: number;
            outboundCalls: number;
            recordings: number;
            topStates: {
                state: string;
                calls: number;
            }[];
        };
        monthly: {
            calls: number;
            connectedCalls: number;
            totalMinutes: number;
            avgDuration: number;
            revenue: any;
            inboundCalls: number;
            outboundCalls: number;
            recordings: number;
            topStates: {
                state: string;
                calls: number;
            }[];
        };
    }>;
}
export {};

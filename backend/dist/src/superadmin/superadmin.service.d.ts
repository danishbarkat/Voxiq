import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
export declare class SuperAdminService {
    private prisma;
    private configService;
    private static readonly SIGNUP_OTP_TTL_MS;
    private readonly accountSummarySelect;
    constructor(prisma: PrismaService, configService: ConfigService);
    private resolveMediaUrl;
    private sendSignupVerificationEmail;
    private inferAudioMimeType;
    private inferAudioExtension;
    private loadRecordingBinary;
    private runWhisperTranscription;
    transcribeRecording(callLogId: string, source?: 'recording' | 'voicemail'): Promise<{
        id: string;
        source: "voicemail" | "recording";
        model: string;
        text: string;
        language: string | null;
    }>;
    getOverview(): Promise<{
        connectionRate: number;
        topCompanies: {
            accountId: any;
            companyName: any;
            totalCalls: number;
            totalMinutes: number;
            revenue: any;
            topStates: {
                state: string;
                calls: number;
            }[];
        }[];
        topStates: {
            state: string;
            calls: number;
        }[];
        topCountries: {
            id: string;
            calls: number;
        }[];
        companyTrends: {
            daily: {
                label: string;
                key: string;
                companies: {
                    accountId: string;
                    companyName: string;
                    calls: number;
                }[];
            }[];
            weekly: {
                label: string;
                key: string;
                companies: {
                    accountId: string;
                    companyName: string;
                    calls: number;
                }[];
            }[];
            monthly: {
                label: string;
                key: string;
                companies: {
                    accountId: string;
                    companyName: string;
                    calls: number;
                }[];
            }[];
        };
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
        ntn: any;
        website: null;
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
    getCompanyDetails(accountId: string): Promise<{
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
        topCountries: {
            id: string;
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
    approveCompany(accountId: string, agentLimit: number, numberPool: Array<{
        number: string;
        callerName: string;
        areaCode: string;
    }>, packageName?: string): Promise<{
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
        canSendWhatsapp: boolean;
        canRecord: boolean;
        canCallInternational: boolean;
        monthlyCallLimit: number | null;
        monthlySmsLimit: number | null;
        monthlyWhatsappLimit: number | null;
    }>;
    rejectCompany(accountId: string, reason: string): Promise<{
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
        canSendWhatsapp: boolean;
        canRecord: boolean;
        canCallInternational: boolean;
        monthlyCallLimit: number | null;
        monthlySmsLimit: number | null;
        monthlyWhatsappLimit: number | null;
    }>;
    deactivateCompany(accountId: string): Promise<{
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
        canSendWhatsapp: boolean;
        canRecord: boolean;
        canCallInternational: boolean;
        monthlyCallLimit: number | null;
        monthlySmsLimit: number | null;
        monthlyWhatsappLimit: number | null;
    }>;
    deleteCompany(accountId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    activateCompany(accountId: string): Promise<{
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
        canSendWhatsapp: boolean;
        canRecord: boolean;
        canCallInternational: boolean;
        monthlyCallLimit: number | null;
        monthlySmsLimit: number | null;
        monthlyWhatsappLimit: number | null;
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
    getCompanyAnalytics(accountId: string): Promise<{
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
    getRecordings(filters?: {
        accountId?: string;
        search?: string;
        from?: string;
        to?: string;
        limit?: number;
    }): Promise<{
        total: number;
        items: {
            id: string;
            startedAt: Date;
            endedAt: Date | null;
            durationSeconds: number | null;
            direction: string;
            callStatus: import("@prisma/client").$Enums.CallStatus;
            disposition: string | null;
            fromNumber: string | null;
            toNumber: string | null;
            callerName: string | null;
            notes: string | null;
            recordingUrl: string | null;
            vmRecordingUrl: string | null;
            companyId: string | null;
            companyName: string;
            agentId: string | null;
            agentName: string;
            campaignId: string | null;
            campaignName: string;
            leadId: string | null;
            leadName: string;
            leadPhone: string | null;
        }[];
        companies: {
            accountId: string | null;
            companyName: string;
            recordings: number;
        }[];
    }>;
    getPendingVerifications(): Promise<{
        email: string;
        sentTo: string;
        companyName: any;
        name: string;
        phone: any;
        otpCode: string;
        expired: boolean;
        createdAt: Date;
        lastEmailedAt: Date;
    }[]>;
    regenerateOtp(email: string): Promise<{
        otpCode: string;
        message: string;
    }>;
    getAvailableNumbers(): Promise<{
        assigned: boolean;
        number: string;
        callerName: string;
        countryCode: string;
    }[]>;
    private fetchTelnyxNumbers;
    private extractCountryCode;
    searchAvailableNumbers(opts: {
        country: string;
        areaCode?: string;
        type?: string;
    }): Promise<any>;
    orderNumber(phoneNumber: string, features?: string[]): Promise<{
        success: boolean;
        phoneNumber: string;
        status: any;
        features: string[];
        messagingEnabled: boolean;
    }>;
    createMessagingProfile(name?: string): Promise<{
        success: boolean;
        profileId: any;
        name: any;
        instructions: string;
    }>;
    getMessagingProfile(): Promise<{
        profiles: any;
        configuredId: string | null;
        hasConfigured: boolean;
    }>;
    assignNumbers(accountId: string, numbers: Array<{
        number: string;
        callerName: string;
        areaCode: string;
    }>): Promise<{
        message: string;
        assigned: {
            number: string;
            callerName: string;
            areaCode: string;
        }[];
    }>;
    unassignNumber(accountId: string, number: string): Promise<{
        message: string;
        number: string;
    }>;
    regenerateAccessCode(accountId: string): Promise<{
        id: string;
        name: string;
        accessCode: string | null;
        accessCodeIssuedAt: Date | null;
    }>;
    static readonly PACKAGES: Record<string, {
        canOutboundCall: boolean;
        canInboundCall: boolean;
        canSendSms: boolean;
        canRecord: boolean;
        monthlyCallLimit: number | null;
        monthlySmsLimit: number | null;
        agentLimit: number;
        isTrial?: boolean;
        trialDays?: number;
    }>;
    assignPackage(accountId: string, packageName: string): Promise<{
        id: string;
        name: string;
        agentLimit: number | null;
        packageName: string | null;
        isTrial: boolean;
        trialEndsAt: Date | null;
        canOutboundCall: boolean;
        canInboundCall: boolean;
        canSendSms: boolean;
        canRecord: boolean;
        monthlyCallLimit: number | null;
        monthlySmsLimit: number | null;
    }>;
    static readonly PACKAGE_PRICES: Record<string, number>;
    private static readonly RATES;
    static readonly SELL_RATES: {
        usOutboundPerMin: number;
        ukOutboundPerMin: number;
        intlOutboundPerMin: number;
        inboundPerMin: number;
        recordPerMin: number;
        smsOutbound: number;
        smsInbound: number;
        usNumberPerMonth: number;
        ukNumberPerMonth: number;
    };
    private detectDestCountry;
    private getOutboundRate;
    getBillingSummary(): Promise<{
        month: string;
        summary: {
            totalRevenue: number;
            totalTelnyxCost: number;
            totalNetProfit: number;
            overallMargin: number;
            totalUsageBill: number;
            totalUsageProfit: number;
            usageMargin: number;
            totalCalls: number;
            totalSms: number;
        };
        companies: {
            id: string;
            name: string;
            packageName: string | null;
            packagePrice: number;
            totalCalls: number;
            totalCallMinutes: number;
            callCost: number;
            smsCount: number;
            smsCost: number;
            numbers: number;
            usNumbers: number;
            ukNumbers: number;
            numCost: number;
            totalTelnyxCost: number;
            netProfit: number;
            margin: number | null;
            usageBill: number;
            usageProfit: number;
            usageMargin: number | null;
            countryBreakdown: {
                country: string;
                countryName: string;
                calls: number;
                minutes: number;
                telnyxCost: number;
                sellCost: number;
                profit: number;
                telnyxRate: number;
                sellRate: number;
            }[];
        }[];
        rates: {
            usOutboundPerMin: number;
            ukOutboundPerMin: number;
            intlOutboundPerMin: number;
            usInboundPerMin: number;
            ukInboundPerMin: number;
            tollfreeInboundPerMin: number;
            recordPerMin: number;
            smsOutbound: number;
            smsInbound: number;
            usNumberPerMonth: number;
            ukNumberPerMonth: number;
        };
        sellRates: {
            usOutboundPerMin: number;
            ukOutboundPerMin: number;
            intlOutboundPerMin: number;
            inboundPerMin: number;
            recordPerMin: number;
            smsOutbound: number;
            smsInbound: number;
            usNumberPerMonth: number;
            ukNumberPerMonth: number;
        };
    }>;
    updateAgentLimit(accountId: string, agentLimit: number): Promise<{
        id: string;
        name: string;
        agentLimit: number | null;
    }>;
    updateFeatures(accountId: string, features: {
        canOutboundCall?: boolean;
        canInboundCall?: boolean;
        canSendSms?: boolean;
        canSendWhatsapp?: boolean;
        canRecord?: boolean;
        canCallInternational?: boolean;
    }): Promise<{
        id: string;
        name: string;
        canOutboundCall: boolean;
        canInboundCall: boolean;
        canSendSms: boolean;
        canSendWhatsapp: boolean;
        canRecord: boolean;
        canCallInternational: boolean;
    }>;
    getPackageUsage(accountId: string): Promise<{
        usage: {
            callsThisMonth: number;
            smsThisMonth: number;
            callLimitReached: boolean;
            smsLimitReached: boolean;
        };
        agentLimit: number | null;
        packageName: string | null;
        canOutboundCall: boolean;
        canInboundCall: boolean;
        canSendSms: boolean;
        canRecord: boolean;
        monthlyCallLimit: number | null;
        monthlySmsLimit: number | null;
    }>;
    private getAccountStats;
    private getDashboardLogs;
    private groupLogsByAccount;
    private buildCompanySnapshot;
    private computeLogStats;
    private normalizeCallDurationSeconds;
    private buildTopStates;
    private buildTopCountries;
    private buildDailyActivity;
    private buildCompanyTrendSeries;
    private buildTrendPoints;
    private buildTopAgents;
    private detectServices;
    private generateAccessCode;
}

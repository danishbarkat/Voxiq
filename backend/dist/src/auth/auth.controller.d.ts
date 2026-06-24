import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    signup(dto: SignupDto): Promise<{
        accountId: string;
        message: string;
    }>;
    verifySignup(email: string, code: string): Promise<{
        message: string;
    }>;
    login(dto: LoginDto): Promise<{
        access_token: string;
        user: {
            id: any;
            name: any;
            email: any;
            role: any;
            accountId: any;
            teamId: any;
            accountStatus: any;
            status: any;
            createdAt: any;
        };
    } | {
        mfa_required: boolean;
        mfa_setup_required: boolean;
        mfa_token: string;
        manual_key: string;
        otpauth_url: string;
    }>;
    verifyMfa(mfaToken: string, code: string): Promise<{
        access_token: string;
        user: {
            id: any;
            name: any;
            email: any;
            role: any;
            accountId: any;
            teamId: any;
            accountStatus: any;
            status: any;
            createdAt: any;
        };
    }>;
    getProfile(req: any): any;
    getMyPlan(req: any): Promise<{
        trialExpired: boolean;
        trialDaysLeft: number;
        status: import("@prisma/client").$Enums.AccountStatus;
        agentLimit: number | null;
        packageName: string | null;
        isTrial: boolean;
        trialEndsAt: Date | null;
        billingCycle: string | null;
        seatCount: number | null;
        canAiInsights: boolean;
        canOutboundCall: boolean;
        canInboundCall: boolean;
        canSendSms: boolean;
        canSendWhatsapp: boolean;
        canRecord: boolean;
        monthlyCallLimit: number | null;
        monthlySmsLimit: number | null;
    } | null>;
    resendVerification(email: string): Promise<{
        message: string;
    }>;
    forgotPassword(email: string): Promise<{
        message: string;
    }>;
    getPasswordResetRequests(req: any): Promise<{
        id: string;
        name: string;
        email: string;
        requestedAt: Date;
    }[]>;
    requestReactivation(req: any, message?: string): Promise<{
        message: string;
    }>;
}

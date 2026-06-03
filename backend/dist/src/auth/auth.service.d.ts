import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { SignupDto } from './dto/signup.dto';
export declare class AuthService {
    private prisma;
    private jwtService;
    private configService;
    private readonly blockedEmailDomains;
    constructor(prisma: PrismaService, jwtService: JwtService, configService: ConfigService);
    signup(dto: SignupDto): Promise<{
        message: string;
        verificationCodePreview: string;
    } | {
        message: string;
        verificationCodePreview?: undefined;
    }>;
    verifySignup(email: string, code: string): Promise<{
        message: string;
    }>;
    validateUser(email: string, password: string, accessCode?: string): Promise<any>;
    loginWithMfa(email: string, password: string, accessCode?: string): Promise<{
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
    login(user: any): Promise<{
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
    requestPasswordReset(email: string): Promise<{
        message: string;
    }>;
    getPasswordResetRequests(accountId: string): Promise<{
        id: string;
        name: string;
        email: string;
        requestedAt: Date;
    }[]>;
    clearPasswordResetRequest(agentEmail: string): Promise<void>;
    requestReactivation(user: any, message?: string): Promise<{
        message: string;
    }>;
    private generateBase32Secret;
    private generateCompanyAccessCode;
    private generateOtpCode;
    private assertBusinessEmail;
    private normalizeOptionalPhone;
    private sendSignupVerificationEmail;
    private buildOtpAuthUrl;
    private verifyTotpCode;
    private generateTotp;
    private base32ToBuffer;
}

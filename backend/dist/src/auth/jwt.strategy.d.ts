import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
export interface JwtPayload {
    sub: string;
    role?: string;
    accountId?: string;
    teamId?: string | null;
    accountStatus?: string | null;
    sessionId?: string;
}
declare const JwtStrategy_base: new (...args: any) => any;
export declare class JwtStrategy extends JwtStrategy_base {
    private prisma;
    constructor(configService: ConfigService, prisma: PrismaService);
    validate(payload: JwtPayload): Promise<{
        userId: string;
        role: string | undefined;
        accountId: string | undefined;
        teamId: string | null | undefined;
        accountStatus: "ACTIVE" | "INACTIVE";
    }>;
}
export {};

import { ConfigService } from '@nestjs/config';
export interface JwtPayload {
    sub: string;
    role?: string;
    accountId?: string;
    teamId?: string | null;
    accountStatus?: string | null;
}
declare const JwtStrategy_base: new (...args: any) => any;
export declare class JwtStrategy extends JwtStrategy_base {
    constructor(configService: ConfigService);
    validate(payload: JwtPayload): Promise<{
        userId: string;
        role: string | undefined;
        accountId: string | undefined;
        teamId: string | null | undefined;
        accountStatus: string | null | undefined;
    }>;
}
export {};

import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
export declare class SmsService {
    private prisma;
    private config;
    private readonly logger;
    constructor(prisma: PrismaService, config: ConfigService);
    send(to: string, body: string, fromOverride: string | undefined, agentId: string, accountId: string): Promise<{
        id: string;
        status: string;
        createdAt: Date;
        accountId: string;
        agentId: string | null;
        direction: string;
        fromNumber: string;
        toNumber: string;
        body: string;
        telnyxMessageId: string | null;
    }>;
    saveInbound(from: string, to: string, body: string, telnyxMessageId: string | null, accountId: string): Promise<{
        id: string;
        status: string;
        createdAt: Date;
        accountId: string;
        agentId: string | null;
        direction: string;
        fromNumber: string;
        toNumber: string;
        body: string;
        telnyxMessageId: string | null;
    }>;
    getConversations(accountId: string, agentId?: string): Promise<any[]>;
    getThread(contactNumber: string, accountId: string): Promise<{
        id: string;
        direction: string;
        fromNumber: string;
        toNumber: string;
        body: string;
        status: string;
        createdAt: Date;
        agentId: string | null;
        agentName: any;
    }[]>;
    findAccountByNumber(toNumber: string): Promise<string | null>;
}

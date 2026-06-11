import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
export declare class SmsService {
    private prisma;
    private config;
    private readonly logger;
    constructor(prisma: PrismaService, config: ConfigService);
    send(to: string, body: string, fromOverride: string | undefined, agentId: string, accountId: string, channel?: 'sms' | 'whatsapp'): Promise<{
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
        channel: string;
    }>;
    saveInbound(from: string, to: string, body: string, telnyxMessageId: string | null, accountId: string, channel?: 'sms' | 'whatsapp'): Promise<{
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
        channel: string;
    }>;
    getConversations(accountId: string, agentId?: string, channel?: string): Promise<any[]>;
    getThread(contactNumber: string, accountId: string, channel?: string): Promise<{
        id: string;
        direction: string;
        fromNumber: string;
        toNumber: string;
        body: string;
        status: string;
        channel: string;
        createdAt: Date;
        agentId: string | null;
        agentName: any;
    }[]>;
    deleteConversation(contactNumber: string, accountId: string, channel?: string): Promise<{
        deleted: number;
    }>;
    findAccountByNumber(toNumber: string): Promise<string | null>;
}

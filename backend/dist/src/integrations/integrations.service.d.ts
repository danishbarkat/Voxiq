import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { VoipService } from '../voip/voip.service';
export declare class IntegrationsService {
    private config;
    private prisma;
    private voip;
    private readonly logger;
    private webhooks;
    private smsTemplates;
    private ghlKey;
    constructor(config: ConfigService, prisma: PrismaService, voip: VoipService);
    listWebhooks(): {
        id: string;
        url: string;
        label: string;
    }[];
    addWebhook(url: string, label?: string): {
        id: string;
        url: string;
        label: string;
    };
    deleteWebhook(id: string): {
        deleted: string;
    };
    fireWebhooks(event: string, payload: any): Promise<void>;
    getGhlKey(): {
        configured: boolean;
    };
    saveGhlKey(key: string): {
        saved: boolean;
    };
    testGhl(apiKey: string): Promise<{
        ok: boolean;
        status: number;
        error?: undefined;
    } | {
        ok: boolean;
        error: any;
        status?: undefined;
    }>;
    syncDispositionToGhl(phone: string, leadName: string, disposition: string, notes: string): Promise<void>;
    listSmsTemplates(): {
        id: string;
        name: string;
        message: string;
    }[];
    saveSmsTemplate(name: string, message: string): {
        id: string;
        name: string;
        message: string;
    };
    deleteSmsTemplate(id: string): {
        deleted: string;
    };
    sendSms(to: string, message: string, from?: string): Promise<{
        sent: boolean;
        to: string;
        error?: undefined;
    } | {
        sent: boolean;
        error: any;
        to?: undefined;
    }>;
}

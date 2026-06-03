import { IntegrationsService } from './integrations.service';
export declare class IntegrationsController {
    private svc;
    constructor(svc: IntegrationsService);
    listWebhooks(): {
        id: string;
        url: string;
        label: string;
    }[];
    addWebhook(body: {
        url: string;
        label?: string;
    }): {
        id: string;
        url: string;
        label: string;
    };
    deleteWebhook(id: string): {
        deleted: string;
    };
    testGhl(body: {
        apiKey: string;
    }): Promise<{
        ok: boolean;
        status: number;
        error?: undefined;
    } | {
        ok: boolean;
        error: any;
        status?: undefined;
    }>;
    saveGhlKey(body: {
        apiKey: string;
    }): {
        saved: boolean;
    };
    getGhlKey(): {
        configured: boolean;
    };
    listSmsTemplates(): {
        id: string;
        name: string;
        message: string;
    }[];
    saveSmsTemplate(body: {
        name: string;
        message: string;
    }): {
        id: string;
        name: string;
        message: string;
    };
    deleteSmsTemplate(id: string): {
        deleted: string;
    };
    sendSms(body: {
        to: string;
        message: string;
        from?: string;
    }): Promise<{
        sent: boolean;
        to: string;
        error?: undefined;
    } | {
        sent: boolean;
        error: any;
        to?: undefined;
    }>;
}

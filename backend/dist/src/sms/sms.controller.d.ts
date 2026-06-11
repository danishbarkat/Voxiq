import { SendSmsDto } from './dto/send-sms.dto';
import { SmsService } from './sms.service';
export declare class SmsController {
    private readonly smsService;
    constructor(smsService: SmsService);
    send(dto: SendSmsDto, req: any): Promise<{
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
    getConversations(req: any, channel?: string): Promise<any[]>;
    getThread(number: string, req: any, channel?: string): Promise<{
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
    deleteConversation(number: string, req: any, channel?: string): Promise<{
        deleted: number;
    } | {
        error: string;
    }>;
}

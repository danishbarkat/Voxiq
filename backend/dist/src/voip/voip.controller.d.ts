import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { VoipService } from './voip.service';
import { SmsService } from '../sms/sms.service';
interface TelnyxEvent {
    data?: {
        id?: string;
        event_type?: string;
        payload?: {
            call_control_id?: string;
            recording_urls?: string[];
            recording_url?: string;
            public_recording_urls?: {
                mp3?: string;
                wav?: string;
            };
        };
    };
}
export declare class VoipController {
    private prisma;
    private config;
    private ws;
    private voipService;
    private smsService;
    private readonly logger;
    constructor(prisma: PrismaService, config: ConfigService, ws: WebsocketGateway, voipService: VoipService, smsService: SmsService);
    private getPublicBaseUrl;
    private buildUploadsUrl;
    private persistCustomRecording;
    uploadCustomRecording(file: Express.Multer.File, callLogId: string): Promise<{
        success: boolean;
        recordingUrl: string;
    }>;
    voicemailDrop(body: {
        callControlId: string;
        audioUrl: string;
        callLogId?: string;
    }): Promise<{
        success: boolean;
    }>;
    supervisorListen(body: {
        callControlId: string;
        supervisorCallControlId: string;
    }): Promise<{
        success: boolean;
    }>;
    supervisorWhisper(body: {
        callControlId: string;
        supervisorCallControlId: string;
    }): Promise<{
        success: boolean;
    }>;
    supervisorBarge(body: {
        callControlId: string;
        supervisorCallControlId: string;
    }): Promise<{
        success: boolean;
    }>;
    handleWebhook(body: TelnyxEvent, signature: string, timestamp: string, _pubHeader: string): Promise<{
        received: boolean;
    }>;
}
export {};

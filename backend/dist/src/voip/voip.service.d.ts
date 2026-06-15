import { ConfigService } from '@nestjs/config';
export interface CallOptions {
    to: string;
    from: string;
    callerName?: string;
    connectionId?: string;
    callControlAppId?: string;
    answeringMachineDetection?: 'detect' | 'detect_beep' | 'disabled';
    webhookUrl?: string;
    record?: 'none' | 'record-from-answer' | 'record-from-ringing';
    recordingChannels?: 'single' | 'dual';
}
export interface CallResult {
    callId: string;
    status: string;
    direction: string;
}
export declare class VoipService {
    private configService;
    private readonly logger;
    private readonly maxDialAttemptsPerConnection;
    private telnyx;
    private connectionId;
    private callControlAppId;
    private defaultWebhookUrl;
    constructor(configService: ConfigService);
    initiateCall(options: CallOptions): Promise<CallResult>;
    private isTransientDialError;
    sendSms(to: string, from: string, text: string): Promise<any>;
    terminateCall(callId: string): Promise<void>;
    transferCall(callId: string, sipUri: string): Promise<void>;
    playAudio(callId: string, audioUrl: string): Promise<void>;
    getCallStatus(callId: string): Promise<any>;
    handleAmdResult(callId: string, result: 'human' | 'machine'): Promise<void>;
    supervisorAction(callControlId: string, mode: 'listen' | 'whisper' | 'barge', supervisorCallControlId: string): Promise<{
        success: boolean;
    }>;
}

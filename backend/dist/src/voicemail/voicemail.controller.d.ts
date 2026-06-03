import { VoicemailService } from './voicemail.service';
import { CreateVoicemailDto } from './voicemail.dto';
export declare class VoicemailController {
    private readonly voicemailService;
    constructor(voicemailService: VoicemailService);
    uploadTemplate(file: Express.Multer.File, body: CreateVoicemailDto): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        accountId: string;
        url: string;
        duration: number;
    }>;
    getTemplates(accountId?: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        accountId: string;
        url: string;
        duration: number;
    }[]>;
    getTemplate(id: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        accountId: string;
        url: string;
        duration: number;
    } | null>;
    getPlaybackUrl(id: string): Promise<{
        url: string;
    }>;
    deleteTemplate(id: string, accountId: string): Promise<{
        message: string;
    }>;
}

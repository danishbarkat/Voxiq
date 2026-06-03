import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
export declare class VoicemailService {
    private configService;
    private prisma;
    private readonly logger;
    private s3Client;
    private bucket;
    constructor(configService: ConfigService, prisma: PrismaService);
    private ensureS3;
    uploadVoicemailAudio(file: Express.Multer.File, name: string, accountId: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        accountId: string;
        url: string;
        duration: number;
    }>;
    getVoicemailTemplates(accountId?: string): Promise<{
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
    deleteTemplate(id: string, accountId: string): Promise<void>;
    getPlaybackUrl(id: string): Promise<string>;
}

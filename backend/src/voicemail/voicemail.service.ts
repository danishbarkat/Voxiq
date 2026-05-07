import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';

@Injectable()
export class VoicemailService {
    private readonly logger = new Logger(VoicemailService.name);
    private s3Client: S3Client | null = null;
    private bucket: string;

    constructor(private configService: ConfigService, private prisma: PrismaService) {
        const region = this.configService.get<string>('AWS_REGION') || 'us-east-1';
        const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
        const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');
        this.bucket = this.configService.get<string>('AWS_S3_BUCKET') || '';

        if (!accessKeyId || !secretAccessKey) {
            this.logger.warn('AWS credentials not configured. Voicemail functionality will be limited.');
        } else {
            this.s3Client = new S3Client({
                region,
                credentials: {
                    accessKeyId,
                    secretAccessKey,
                },
            });
            this.logger.log('S3 client initialized for voicemail storage');
        }
    }

    private ensureS3() {
        if (!this.s3Client) {
            throw new Error('S3 not configured');
        }
    }

    async uploadVoicemailAudio(
        file: Express.Multer.File,
        name: string,
        accountId: string,
    ) {
        this.ensureS3();
        const fileId = randomUUID();
        const key = `voicemail/${accountId}/${fileId}.mp3`;

        const command = new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
        });

        await this.s3Client!.send(command);

        const url = `https://${this.bucket}.s3.amazonaws.com/${key}`;

        const template = await this.prisma.voicemailTemplate.create({
            data: {
                id: fileId,
                accountId,
                name,
                url,
                duration: 0, // TODO: derive from audio metadata
            },
        });

        this.logger.log(`Voicemail template uploaded: ${name} (${fileId})`);
        return template;
    }

    async getVoicemailTemplates(accountId?: string) {
        return this.prisma.voicemailTemplate.findMany({
            where: accountId ? { accountId } : undefined,
            orderBy: { createdAt: 'desc' },
        });
    }

    async getTemplate(id: string) {
        return this.prisma.voicemailTemplate.findUnique({
            where: { id },
        });
    }

    async deleteTemplate(id: string, accountId: string) {
        const template = await this.prisma.voicemailTemplate.findUnique({ where: { id } });
        if (!template) return;

        this.ensureS3();

        const key = `voicemail/${accountId}/${id}.mp3`;
        const command = new DeleteObjectCommand({
            Bucket: this.bucket,
            Key: key,
        });
        await this.s3Client!.send(command);

        await this.prisma.voicemailTemplate.delete({ where: { id } });
        this.logger.log(`Voicemail template deleted: ${id}`);
    }

    async getPlaybackUrl(id: string): Promise<string> {
        const template = await this.getTemplate(id);
        if (!template) throw new Error('Template not found');
        return template.url;
    }
}

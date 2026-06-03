"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var VoicemailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoicemailService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_s3_1 = require("@aws-sdk/client-s3");
const prisma_service_1 = require("../prisma/prisma.service");
const crypto_1 = require("crypto");
let VoicemailService = VoicemailService_1 = class VoicemailService {
    configService;
    prisma;
    logger = new common_1.Logger(VoicemailService_1.name);
    s3Client = null;
    bucket;
    constructor(configService, prisma) {
        this.configService = configService;
        this.prisma = prisma;
        const region = this.configService.get('AWS_REGION') || 'us-east-1';
        const accessKeyId = this.configService.get('AWS_ACCESS_KEY_ID');
        const secretAccessKey = this.configService.get('AWS_SECRET_ACCESS_KEY');
        this.bucket = this.configService.get('AWS_S3_BUCKET') || '';
        if (!accessKeyId || !secretAccessKey) {
            this.logger.warn('AWS credentials not configured. Voicemail functionality will be limited.');
        }
        else {
            this.s3Client = new client_s3_1.S3Client({
                region,
                credentials: {
                    accessKeyId,
                    secretAccessKey,
                },
            });
            this.logger.log('S3 client initialized for voicemail storage');
        }
    }
    ensureS3() {
        if (!this.s3Client) {
            throw new Error('S3 not configured');
        }
    }
    async uploadVoicemailAudio(file, name, accountId) {
        this.ensureS3();
        const fileId = (0, crypto_1.randomUUID)();
        const key = `voicemail/${accountId}/${fileId}.mp3`;
        const command = new client_s3_1.PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
        });
        await this.s3Client.send(command);
        const url = `https://${this.bucket}.s3.amazonaws.com/${key}`;
        const template = await this.prisma.voicemailTemplate.create({
            data: {
                id: fileId,
                accountId,
                name,
                url,
                duration: 0,
            },
        });
        this.logger.log(`Voicemail template uploaded: ${name} (${fileId})`);
        return template;
    }
    async getVoicemailTemplates(accountId) {
        return this.prisma.voicemailTemplate.findMany({
            where: accountId ? { accountId } : undefined,
            orderBy: { createdAt: 'desc' },
        });
    }
    async getTemplate(id) {
        return this.prisma.voicemailTemplate.findUnique({
            where: { id },
        });
    }
    async deleteTemplate(id, accountId) {
        const template = await this.prisma.voicemailTemplate.findUnique({ where: { id } });
        if (!template)
            return;
        this.ensureS3();
        const key = `voicemail/${accountId}/${id}.mp3`;
        const command = new client_s3_1.DeleteObjectCommand({
            Bucket: this.bucket,
            Key: key,
        });
        await this.s3Client.send(command);
        await this.prisma.voicemailTemplate.delete({ where: { id } });
        this.logger.log(`Voicemail template deleted: ${id}`);
    }
    async getPlaybackUrl(id) {
        const template = await this.getTemplate(id);
        if (!template)
            throw new Error('Template not found');
        return template.url;
    }
};
exports.VoicemailService = VoicemailService;
exports.VoicemailService = VoicemailService = VoicemailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService, prisma_service_1.PrismaService])
], VoicemailService);
//# sourceMappingURL=voicemail.service.js.map
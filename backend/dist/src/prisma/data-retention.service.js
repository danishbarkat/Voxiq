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
var DataRetentionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataRetentionService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("./prisma.service");
const fs_1 = require("fs");
const path_1 = require("path");
let DataRetentionService = DataRetentionService_1 = class DataRetentionService {
    prisma;
    logger = new common_1.Logger(DataRetentionService_1.name);
    retentionDays = 30;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async purgeExpiredCommunicationHistory() {
        const cutoff = new Date(Date.now() - this.retentionDays * 24 * 60 * 60 * 1000);
        const expiredCalls = await this.prisma.callLog.findMany({
            where: {
                OR: [
                    { startedAt: { lt: cutoff } },
                    { createdAt: { lt: cutoff } },
                ],
            },
            select: {
                id: true,
                recordingUrl: true,
                vmRecordingUrl: true,
            },
        });
        let deletedFiles = 0;
        for (const call of expiredCalls) {
            for (const url of [call.recordingUrl, call.vmRecordingUrl]) {
                const removed = await this.deleteLocalUploadIfPresent(url);
                if (removed)
                    deletedFiles++;
            }
        }
        const [callResult, smsResult] = await Promise.all([
            this.prisma.callLog.deleteMany({
                where: {
                    OR: [
                        { startedAt: { lt: cutoff } },
                        { createdAt: { lt: cutoff } },
                    ],
                },
            }),
            this.prisma.smsMessage.deleteMany({
                where: { createdAt: { lt: cutoff } },
            }),
        ]);
        if (callResult.count || smsResult.count || deletedFiles) {
            this.logger.log(`Retention cleanup complete. Deleted ${callResult.count} call logs, ${smsResult.count} SMS messages, ${deletedFiles} local recordings older than ${this.retentionDays} days.`);
        }
    }
    async deleteLocalUploadIfPresent(url) {
        if (!url)
            return false;
        const marker = '/uploads/recordings/';
        const markerIndex = url.indexOf(marker);
        if (markerIndex === -1)
            return false;
        const relativePath = url.slice(markerIndex + 1).replace(/\//g, '\\');
        const absolutePath = (0, path_1.join)(process.cwd(), relativePath);
        try {
            await fs_1.promises.unlink(absolutePath);
            return true;
        }
        catch (error) {
            if (error?.code !== 'ENOENT') {
                this.logger.warn(`Failed to delete recording ${absolutePath}: ${error?.message || error}`);
            }
            return false;
        }
    }
};
exports.DataRetentionService = DataRetentionService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_MIDNIGHT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DataRetentionService.prototype, "purgeExpiredCommunicationHistory", null);
exports.DataRetentionService = DataRetentionService = DataRetentionService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DataRetentionService);
//# sourceMappingURL=data-retention.service.js.map
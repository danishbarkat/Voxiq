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
var CampaignsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CampaignsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let CampaignsService = CampaignsService_1 = class CampaignsService {
    prisma;
    logger = new common_1.Logger(CampaignsService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(createCampaignDto) {
        this.logger.log(`Creating campaign: ${createCampaignDto.name}`);
        return this.prisma.campaign.create({
            data: {
                name: createCampaignDto.name,
                mode: createCampaignDto.mode,
                pacing: createCampaignDto.pacing,
                localPresence: createCampaignDto.localPresence ?? false,
                numberPool: createCampaignDto.numberPool ?? [],
                record: createCampaignDto.record ?? false,
                status: createCampaignDto.status || client_1.CampaignStatus.PAUSED,
                accountId: createCampaignDto.accountId,
            },
        });
    }
    async findAll(accountId) {
        return this.prisma.campaign.findMany({
            where: accountId ? { accountId } : undefined,
            orderBy: { createdAt: 'desc' },
            include: {
                account: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                lists: {
                    include: { list: { select: { id: true, name: true } } },
                },
                _count: {
                    select: {
                        callLogs: true,
                    },
                },
            },
        });
    }
    async findOne(id) {
        return this.prisma.campaign.findUnique({
            where: { id },
            include: {
                account: true,
                lists: { include: { list: true } },
                callLogs: {
                    take: 10,
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
    }
    async update(id, updateCampaignDto) {
        return this.prisma.campaign.update({
            where: { id },
            data: {
                name: updateCampaignDto.name,
                mode: updateCampaignDto.mode,
                pacing: updateCampaignDto.pacing,
                localPresence: updateCampaignDto.localPresence,
                numberPool: updateCampaignDto.numberPool,
                record: updateCampaignDto.record,
                status: updateCampaignDto.status,
            },
        });
    }
    async assignLists(id, listIds) {
        await this.prisma.campaignList.deleteMany({
            where: { campaignId: id },
        });
        if (listIds.length > 0) {
            await this.prisma.campaignList.createMany({
                data: listIds.map((listId) => ({
                    campaignId: id,
                    listId,
                })),
                skipDuplicates: true,
            });
        }
        return this.getAssignedLists(id);
    }
    async getAssignedLists(id) {
        return this.prisma.campaignList.findMany({
            where: { campaignId: id },
            include: { list: true },
            orderBy: { createdAt: 'asc' },
        });
    }
    async remove(id) {
        return this.prisma.campaign.delete({
            where: { id },
        });
    }
    async getMetrics(id) {
        const campaign = await this.prisma.campaign.findUnique({
            where: { id },
            include: {
                callLogs: {
                    select: {
                        callStatus: true,
                        disposition: true,
                        startedAt: true,
                        endedAt: true,
                    },
                },
            },
        });
        if (!campaign) {
            return null;
        }
        const totalCalls = campaign.callLogs.length;
        const completedCalls = campaign.callLogs.filter((log) => log.callStatus === 'COMPLETED').length;
        const connectedCalls = campaign.callLogs.filter((log) => log.callStatus === 'CONNECTED' || log.callStatus === 'COMPLETED').length;
        const connectionRate = totalCalls > 0 ? (connectedCalls / totalCalls) * 100 : 0;
        const durations = campaign.callLogs
            .filter((log) => log.endedAt && log.startedAt)
            .map((log) => {
            const start = new Date(log.startedAt).getTime();
            const end = new Date(log.endedAt).getTime();
            return (end - start) / 1000;
        });
        const avgDuration = durations.length > 0
            ? durations.reduce((a, b) => a + b, 0) / durations.length
            : 0;
        return {
            campaignId: id,
            totalCalls,
            completedCalls,
            connectedCalls,
            connectionRate: connectionRate.toFixed(2),
            avgDuration: avgDuration.toFixed(0),
        };
    }
};
exports.CampaignsService = CampaignsService;
exports.CampaignsService = CampaignsService = CampaignsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CampaignsService);
//# sourceMappingURL=campaigns.service.js.map
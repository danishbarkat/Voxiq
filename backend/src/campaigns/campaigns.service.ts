import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { CampaignStatus } from '@prisma/client';

@Injectable()
export class CampaignsService {
    private readonly logger = new Logger(CampaignsService.name);

    constructor(private prisma: PrismaService) { }

    async create(createCampaignDto: CreateCampaignDto) {
        this.logger.log(`Creating campaign: ${createCampaignDto.name}`);

        return this.prisma.campaign.create({
            data: {
                name: createCampaignDto.name,
                mode: createCampaignDto.mode,
                pacing: createCampaignDto.pacing,
                localPresence: createCampaignDto.localPresence ?? false,
                numberPool: (createCampaignDto.numberPool as any) ?? [],
                record: createCampaignDto.record ?? false,
                status: createCampaignDto.status || CampaignStatus.PAUSED,
                accountId: createCampaignDto.accountId,
            },
        });
    }

    async findAll(accountId?: string) {
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

    async findOne(id: string) {
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

    async update(id: string, updateCampaignDto: UpdateCampaignDto) {
        return this.prisma.campaign.update({
            where: { id },
            data: {
                name: (updateCampaignDto as any).name,
                mode: (updateCampaignDto as any).mode,
                pacing: (updateCampaignDto as any).pacing,
                localPresence: (updateCampaignDto as any).localPresence,
                numberPool: (updateCampaignDto as any).numberPool as any,
                record: (updateCampaignDto as any).record,
                status: (updateCampaignDto as any).status,
            },
        });
    }

    async assignLists(id: string, listIds: string[]) {
        // Replace existing assignments
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

    async getAssignedLists(id: string) {
        return this.prisma.campaignList.findMany({
            where: { campaignId: id },
            include: { list: true },
            orderBy: { createdAt: 'asc' },
        });
    }

    async remove(id: string) {
        return this.prisma.campaign.delete({
            where: { id },
        });
    }

    /**
     * Get campaign metrics
     */
    async getMetrics(id: string) {
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
        const completedCalls = campaign.callLogs.filter(
            (log) => log.callStatus === 'COMPLETED',
        ).length;
        const connectedCalls = campaign.callLogs.filter(
            (log) => log.callStatus === 'CONNECTED' || log.callStatus === 'COMPLETED',
        ).length;

        const connectionRate =
            totalCalls > 0 ? (connectedCalls / totalCalls) * 100 : 0;

        // Calculate average call duration
        const durations = campaign.callLogs
            .filter((log) => log.endedAt && log.startedAt)
            .map((log) => {
                const start = new Date(log.startedAt as Date).getTime();
                const end = new Date(log.endedAt as Date).getTime();
                return (end - start) / 1000; // seconds
            });

        const avgDuration =
            durations.length > 0
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
}

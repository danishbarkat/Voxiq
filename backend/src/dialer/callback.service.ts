import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { LeadStatus } from '@prisma/client';

@Injectable()
export class CallbackService {
    private readonly logger = new Logger(CallbackService.name);

    constructor(private prisma: PrismaService) { }

    /**
     * Every 5 minutes: find leads with disposition=CALLBACK whose callbackAt time has passed,
     * reset them to NEW so they re-enter the dialing queue
     */
    @Cron(CronExpression.EVERY_5_MINUTES)
    async recycleCallbacks() {
        const now = new Date();

        const dueCallbacks = await this.prisma.lead.findMany({
            where: {
                status: LeadStatus.CALLBACK,
                callbackAt: { lte: now },
            },
            select: { id: true, firstName: true, lastName: true, phone: true },
        });

        if (dueCallbacks.length === 0) return;

        this.logger.log(`Recycling ${dueCallbacks.length} callback leads`);

        await this.prisma.lead.updateMany({
            where: { id: { in: dueCallbacks.map(l => l.id) } },
            data: {
                status: LeadStatus.NEW,
                callbackAt: null,
            },
        });

        this.logger.log(`Recycled: ${dueCallbacks.map(l => `${l.firstName} (${l.phone})`).join(', ')}`);
    }
}

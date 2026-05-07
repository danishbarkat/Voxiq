import { Processor, Process } from '@nestjs/bull';
import type { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { DialerService } from './dialer.service';

@Processor('dialer')
export class QueueProcessor {
    private readonly logger = new Logger(QueueProcessor.name);

    constructor(private dialerService: DialerService) { }

    @Process('parallel-dial')
    async handleParallelDial(job: Job) {
        this.logger.log(`Processing parallel dial job: ${job.id}`);

        try {
            await this.dialerService.executeParallelDial(job.data);
            this.logger.log(`Parallel dial job ${job.id} completed`);
        } catch (error) {
            this.logger.error(`Parallel dial job ${job.id} failed: ${error.message}`);
            throw error;
        }
    }

    @Process('single-dial')
    async handleSingleDial(job: Job) {
        this.logger.log(`Processing single dial job: ${job.id}`);

        try {
            // Single dial is just parallel dial with one lead
            await this.dialerService.executeParallelDial({
                campaignId: job.data.campaignId,
                leadIds: [job.data.leadId],
                agentId: job.data.agentId,
            });
            this.logger.log(`Single dial job ${job.id} completed`);
        } catch (error) {
            this.logger.error(`Single dial job ${job.id} failed: ${error.message}`);
            throw error;
        }
    }
}

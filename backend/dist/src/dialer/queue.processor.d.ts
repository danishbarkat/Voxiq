import type { Job } from 'bull';
import { DialerService } from './dialer.service';
export declare class QueueProcessor {
    private dialerService;
    private readonly logger;
    constructor(dialerService: DialerService);
    handleParallelDial(job: Job): Promise<void>;
    handleSingleDial(job: Job): Promise<void>;
}

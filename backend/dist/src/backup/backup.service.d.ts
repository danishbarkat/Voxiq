import { ConfigService } from '@nestjs/config';
export declare class BackupService {
    private config;
    private readonly logger;
    constructor(config: ConfigService);
    runDailyBackup(): Promise<void>;
}

import { PrismaService } from './prisma.service';
export declare class DataRetentionService {
    private readonly prisma;
    private readonly logger;
    private readonly retentionDays;
    constructor(prisma: PrismaService);
    purgeExpiredCommunicationHistory(): Promise<void>;
    private deleteLocalUploadIfPresent;
}

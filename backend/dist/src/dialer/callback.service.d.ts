import { PrismaService } from '../prisma/prisma.service';
export declare class CallbackService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    recycleCallbacks(): Promise<void>;
}

import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
export declare class BillingService {
    private prisma;
    private config;
    constructor(prisma: PrismaService, config: ConfigService);
    private get apiKey();
    private get storeId();
    private get webhookSecret();
    getVariantId(packageName: string, billingCycle: string): string;
    createCheckout(accountId: string, packageName: string, billingCycle: string, seats: number, email: string, successUrl: string, cancelUrl: string): Promise<string>;
    activateAccount(accountId: string, packageName: string, billingCycle: string, seats: number, lsSubscriptionId: string, lsCustomerId: string, lsVariantId: string, periodEnd: Date | null, lsStatus?: string, trialEndsAt?: Date | null): Promise<void>;
    renewAccount(lsSubscriptionId: string, periodEnd: Date): Promise<void>;
    deactivateAccount(lsSubscriptionId: string): Promise<void>;
    verifyWebhookSignature(rawBody: Buffer, signature: string): boolean;
}

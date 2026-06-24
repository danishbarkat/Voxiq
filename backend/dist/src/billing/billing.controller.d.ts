import { BillingService } from './billing.service';
import { PrismaService } from '../prisma/prisma.service';
export declare class BillingController {
    private billing;
    private prisma;
    constructor(billing: BillingService, prisma: PrismaService);
    createCheckout(body: {
        packageName: string;
        billingCycle: string;
        seats: number;
    }, req: any): Promise<{
        checkoutUrl: string;
    }>;
    createNewUserCheckout(body: {
        accountId: string;
        packageName: string;
        billingCycle: string;
        seats: number;
    }): Promise<{
        checkoutUrl: string;
    }>;
    handleWebhook(req: any, signature: string): Promise<{
        received: boolean;
    }>;
}

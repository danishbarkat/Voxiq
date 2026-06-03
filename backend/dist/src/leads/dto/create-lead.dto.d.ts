import { LeadStatus } from '@prisma/client';
export declare class CreateLeadDto {
    firstName: string;
    lastName: string;
    phone: string;
    address?: string;
    tags?: string[];
    customFields?: Record<string, any>;
    listId: string;
    accountId: string;
    status?: LeadStatus;
}

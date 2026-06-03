import { CampaignMode, CampaignStatus } from '@prisma/client';
declare class NumberPoolEntryDto {
    number: string;
    state: string;
    areaCode: string;
    callerName?: string;
}
export declare class CreateCampaignDto {
    name: string;
    mode: CampaignMode;
    pacing: number;
    localPresence?: boolean;
    numberPool?: NumberPoolEntryDto[];
    record?: boolean;
    accountId: string;
    status?: CampaignStatus;
}
export {};

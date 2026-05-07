import { IsString, IsEnum, IsInt, IsBoolean, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CampaignMode, CampaignStatus } from '@prisma/client';

class NumberPoolEntryDto {
    @IsString()
    number: string;

    @IsString()
    state: string;

    @IsString()
    areaCode: string;

    @IsOptional()
    @IsString()
    callerName?: string;
}

export class CreateCampaignDto {
    @IsString()
    name: string;

    @IsEnum(CampaignMode)
    mode: CampaignMode;

    @IsInt()
    pacing: number;

    @IsBoolean()
    @IsOptional()
    localPresence?: boolean;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => NumberPoolEntryDto)
    @IsOptional()
    numberPool?: NumberPoolEntryDto[];

    @IsBoolean()
    @IsOptional()
    record?: boolean;

    @IsString()
    accountId: string;

    @IsEnum(CampaignStatus)
    @IsOptional()
    status?: CampaignStatus;
}

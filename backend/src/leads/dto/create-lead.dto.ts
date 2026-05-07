import { IsString, IsOptional, IsEnum, IsArray, IsObject } from 'class-validator';
import { LeadStatus } from '@prisma/client';

export class CreateLeadDto {
    @IsString()
    firstName: string;

    @IsString()
    lastName: string;

    @IsString()
    phone: string;

    @IsString()
    @IsOptional()
    address?: string;

    @IsArray()
    @IsOptional()
    tags?: string[];

    @IsObject()
    @IsOptional()
    customFields?: Record<string, any>;

    @IsString()
    listId: string;

    @IsString()
    accountId: string;

    @IsEnum(LeadStatus)
    @IsOptional()
    status?: LeadStatus;
}

import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
export declare class UsersService {
    private readonly prisma;
    private readonly configService;
    constructor(prisma: PrismaService, configService: ConfigService);
    private readonly defaultSelect;
    private readonly agentSelect;
    create(dto: CreateUserDto, requester?: any): Promise<any>;
    findAll(requester?: any): Promise<any[]>;
    getCompanyNumberInventory(requester?: any): Promise<{
        accountId: string;
        accountName: string;
        assignedNumbers: Prisma.JsonArray;
        availableNumbers: {
            number: string;
            callerName: string;
            countryCode: string;
        }[];
    }>;
    findOne(id: string, requester?: any): Promise<any>;
    update(id: string, dto: UpdateUserDto, requester?: any): Promise<any>;
    remove(id: string, requester?: any): Promise<{
        message: string;
        id: string;
    }>;
    adminResetPassword(agentId: string, newPassword: string, requester: any): Promise<{
        message: string;
        agentEmail: string;
    }>;
    findAllRoles(requester?: any): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    updateCallerNumber(id: string, callerNumber: string | null, requester?: any): Promise<any>;
    updateAgentLists(agentId: string, listIds: string[], requester?: any): Promise<any>;
    private ensureExists;
    private assertCanManageAccount;
    private assertAgentCapacity;
    private assertCallerNumberAvailable;
    private assertListsBelongToAccount;
    private assertUserVisible;
    private attachCallerName;
    private resolveCallerName;
    private fetchTelnyxNumbers;
    private extractCountryCode;
}

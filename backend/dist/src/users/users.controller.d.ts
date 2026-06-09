import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    create(dto: CreateUserDto, req: any): Promise<any>;
    findAll(req: any): Promise<any[]>;
    findAllRoles(req: any): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    getCompanyNumberInventory(req: any): Promise<{
        accountId: string;
        accountName: string;
        assignedNumbers: import("@prisma/client/runtime/library").JsonArray;
        availableNumbers: {
            number: string;
            callerName: string;
            countryCode: string;
        }[];
    }>;
    findOne(id: string, req: any): Promise<any>;
    update(id: string, dto: UpdateUserDto, req: any): Promise<any>;
    updateSipCredentials(id: string, body: {
        sipUri?: string;
        sipPassword?: string;
    }, req: any): Promise<any>;
    updateCallerNumber(id: string, callerNumber: string | null, req: any): Promise<any>;
    updateAgentLists(id: string, listIds: string[], req: any): Promise<any>;
    adminResetPassword(id: string, newPassword: string, req: any): Promise<{
        message: string;
        agentEmail: string;
    }>;
    remove(id: string, req: any): Promise<{
        message: string;
        id: string;
    }>;
}

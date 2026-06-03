export declare class CreateUserDto {
    name: string;
    email: string;
    password: string;
    roleId: string;
    accountId: string;
    teamId?: string;
    status?: 'ACTIVE' | 'INACTIVE';
    sipUri?: string;
    sipPassword?: string;
}

"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_service_1 = require("../prisma/prisma.service");
let UsersService = class UsersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    defaultSelect = {
        id: true,
        name: true,
        email: true,
        status: true,
        callerNumber: true,
        sipUri: true,
        sipPassword: true,
        roleId: true,
        teamId: true,
        accountId: true,
        createdAt: true,
        updatedAt: true,
        account: {
            select: {
                id: true,
            },
        },
    };
    agentSelect = {
        id: true,
        name: true,
        email: true,
        status: true,
        callerNumber: true,
        sipUri: true,
        sipPassword: true,
        roleId: true,
        role: { select: { id: true, name: true } },
        teamId: true,
        accountId: true,
        createdAt: true,
        updatedAt: true,
        account: {
            select: {
                id: true,
                name: true,
                numberPool: true,
            },
        },
        AgentList: {
            select: {
                listId: true,
                List: { select: { id: true, name: true } },
            },
        },
    };
    async create(dto, requester) {
        await this.assertCanManageAccount(dto.accountId, requester);
        const role = await this.prisma.role.findUnique({
            where: { id: dto.roleId },
            select: { id: true, name: true },
        });
        if (!role)
            throw new common_1.NotFoundException('Role not found');
        if (requester?.role?.toLowerCase() !== 'superadmin' && role.name.toLowerCase() !== 'agent') {
            throw new common_1.ForbiddenException('Company admins can only create agent users');
        }
        await this.assertAgentCapacity(dto.accountId, requester, role.name);
        const passwordHash = await bcryptjs_1.default.hash(dto.password, 10);
        try {
            const user = await this.prisma.user.create({
                data: {
                    name: dto.name,
                    email: dto.email.toLowerCase(),
                    passwordHash,
                    roleId: dto.roleId,
                    teamId: dto.teamId,
                    accountId: dto.accountId,
                    status: dto.status ?? client_1.UserStatus.ACTIVE,
                },
                select: this.defaultSelect,
            });
            return this.attachCallerName(user);
        }
        catch (error) {
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                throw new common_1.ConflictException('Email already registered');
            }
            throw error;
        }
    }
    async findAll(requester) {
        const where = {};
        if (requester && requester.role?.toLowerCase() !== 'superadmin' && requester.accountId) {
            where.accountId = requester.accountId;
        }
        if ((process.env.SUPER_ADMIN_EMAIL || '').trim()) {
            where.email = { not: process.env.SUPER_ADMIN_EMAIL.toLowerCase() };
        }
        const users = await this.prisma.user.findMany({
            where,
            select: this.agentSelect,
            orderBy: { createdAt: 'desc' },
        });
        return users.map((user) => this.attachCallerName(user));
    }
    async findOne(id, requester) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            select: this.agentSelect,
        });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        this.assertUserVisible(user, requester);
        return this.attachCallerName(user);
    }
    async update(id, dto, requester) {
        const existing = await this.ensureExists(id);
        this.assertUserVisible(existing, requester);
        if (dto.accountId) {
            await this.assertCanManageAccount(dto.accountId, requester);
        }
        if (dto.roleId) {
            const role = await this.prisma.role.findUnique({
                where: { id: dto.roleId },
                select: { name: true },
            });
            if (!role)
                throw new common_1.NotFoundException('Role not found');
            if (requester?.role?.toLowerCase() !== 'superadmin' && role.name.toLowerCase() !== 'agent') {
                throw new common_1.ForbiddenException('Company admins can only assign the Agent role');
            }
        }
        const data = {
            name: dto.name,
            email: dto.email ? dto.email.toLowerCase() : undefined,
            status: dto.status,
            role: dto.roleId ? { connect: { id: dto.roleId } } : undefined,
            team: dto.teamId ? { connect: { id: dto.teamId } } : { disconnect: dto.teamId === null ? true : false },
            account: dto.accountId ? { connect: { id: dto.accountId } } : undefined,
            ...(dto.sipUri !== undefined ? { sipUri: dto.sipUri || null } : {}),
            ...(dto.sipPassword !== undefined ? { sipPassword: dto.sipPassword || null } : {}),
        };
        if (dto.password) {
            data.passwordHash = await bcryptjs_1.default.hash(dto.password, 10);
        }
        const user = await this.prisma.user.update({
            where: { id },
            data,
            select: this.defaultSelect,
        });
        return this.attachCallerName(user);
    }
    async remove(id, requester) {
        const existing = await this.ensureExists(id);
        this.assertUserVisible(existing, requester);
        await this.prisma.$transaction(async (tx) => {
            await tx.agentList.deleteMany({ where: { agentId: id } });
            await tx.callLog.deleteMany({ where: { agentId: id } });
            await tx.user.delete({ where: { id } });
        });
        return { message: 'Agent deleted successfully', id };
    }
    async adminResetPassword(agentId, newPassword, requester) {
        const existing = await this.ensureExists(agentId);
        this.assertUserVisible(existing, requester);
        await this.assertCanManageAccount(existing.accountId, requester);
        if (!newPassword || newPassword.length < 8) {
            throw new common_1.BadRequestException('New password must be at least 8 characters');
        }
        const passwordHash = await bcryptjs_1.default.hash(newPassword, 10);
        await this.prisma.user.update({
            where: { id: agentId },
            data: { passwordHash },
        });
        await this.prisma.signupVerification.deleteMany({
            where: { email: `reset_${existing.email.toLowerCase()}` },
        }).catch(() => { });
        return { message: 'Password reset', agentEmail: existing.email };
    }
    async findAllRoles(requester) {
        return this.prisma.role.findMany({
            where: requester?.role?.toLowerCase() === 'superadmin'
                ? undefined
                : {
                    name: {
                        equals: 'Agent',
                        mode: 'insensitive',
                    },
                },
            orderBy: { name: 'asc' },
        });
    }
    async updateCallerNumber(id, callerNumber, requester) {
        const existing = await this.ensureExists(id);
        this.assertUserVisible(existing, requester);
        await this.assertCallerNumberAvailable(existing.accountId, callerNumber, requester);
        const user = await this.prisma.user.update({
            where: { id },
            data: { callerNumber },
            select: this.agentSelect,
        });
        return this.attachCallerName(user);
    }
    async updateAgentLists(agentId, listIds, requester) {
        const existing = await this.ensureExists(agentId);
        this.assertUserVisible(existing, requester);
        await this.assertListsBelongToAccount(existing.accountId, listIds);
        await this.prisma.$transaction([
            this.prisma.agentList.deleteMany({ where: { agentId } }),
            ...listIds.map(listId => this.prisma.agentList.create({ data: { agentId, listId } })),
        ]);
        return this.findOne(agentId, requester);
    }
    async ensureExists(id) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            select: { id: true, accountId: true, email: true },
        });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        return user;
    }
    async assertCanManageAccount(accountId, requester) {
        const requesterRole = requester?.role?.toLowerCase();
        if (!requesterRole || requesterRole === 'superadmin')
            return;
        if (!requester?.accountId || requester.accountId !== accountId) {
            throw new common_1.ForbiddenException('You can only manage users within your own company');
        }
    }
    async assertAgentCapacity(accountId, requester, roleName) {
        if (requester?.role?.toLowerCase() === 'superadmin' || roleName.toLowerCase() !== 'agent') {
            return;
        }
        const account = await this.prisma.account.findUnique({
            where: { id: accountId },
            select: { agentLimit: true },
        });
        if (!account) {
            throw new common_1.NotFoundException('Account not found');
        }
        if (!account.agentLimit) {
            return;
        }
        const agentRole = await this.prisma.role.findFirst({
            where: { name: { equals: 'Agent', mode: 'insensitive' } },
            select: { id: true },
        });
        if (!agentRole) {
            throw new common_1.NotFoundException('Agent role not found');
        }
        const existingAgents = await this.prisma.user.count({
            where: {
                accountId,
                roleId: agentRole.id,
            },
        });
        if (existingAgents >= account.agentLimit) {
            throw new common_1.ForbiddenException(`Your company has reached its approved agent limit of ${account.agentLimit}`);
        }
    }
    async assertCallerNumberAvailable(accountId, callerNumber, requester) {
        if (!callerNumber)
            return;
        await this.assertCanManageAccount(accountId, requester);
        const account = await this.prisma.account.findUnique({
            where: { id: accountId },
            select: { numberPool: true },
        });
        const numberPool = Array.isArray(account?.numberPool) ? account.numberPool : [];
        const normalizedCaller = callerNumber.replace(/\D/g, '');
        const hasNumber = numberPool.some((entry) => {
            const poolNumber = typeof entry?.number === 'string' ? entry.number.replace(/\D/g, '') : '';
            return poolNumber === normalizedCaller;
        });
        if (!hasNumber) {
            throw new common_1.ForbiddenException('This caller number is not assigned to your company');
        }
    }
    async assertListsBelongToAccount(accountId, listIds) {
        if (!listIds.length)
            return;
        const count = await this.prisma.list.count({
            where: {
                id: { in: listIds },
                accountId,
            },
        });
        if (count !== listIds.length) {
            throw new common_1.ForbiddenException('You can only assign lists from your own company');
        }
    }
    assertUserVisible(user, requester) {
        const requesterRole = requester?.role?.toLowerCase();
        if (!requesterRole || requesterRole === 'superadmin')
            return;
        if (!requester?.accountId || user.accountId !== requester.accountId) {
            throw new common_1.ForbiddenException('You can only access users within your own company');
        }
        if (user.email?.toLowerCase() === (process.env.SUPER_ADMIN_EMAIL || '').toLowerCase()) {
            throw new common_1.ForbiddenException('Super admin users are not available in this workspace');
        }
    }
    attachCallerName(user) {
        const callerName = this.resolveCallerName(user.callerNumber, user.account?.numberPool);
        const { account, ...safeUser } = user;
        return {
            ...safeUser,
            callerName,
            account: account ? { id: account.id, name: account.name, numberPool: account.numberPool ?? [] } : null,
        };
    }
    resolveCallerName(callerNumber, numberPool) {
        if (!callerNumber || !Array.isArray(numberPool))
            return null;
        const normalizedCaller = callerNumber.replace(/\D/g, '');
        const match = numberPool.find((entry) => {
            const poolNumber = entry?.number;
            return typeof poolNumber === 'string' && poolNumber.replace(/\D/g, '') === normalizedCaller;
        });
        const callerName = typeof match?.callerName === 'string' ? match.callerName.trim() : '';
        return callerName || null;
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map
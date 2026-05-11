import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma, UserStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) { }

  private readonly defaultSelect = {
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
  } as any;

  private readonly agentSelect = {
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
    AgentList: {
      select: {
        listId: true,
        List: { select: { id: true, name: true } },
      },
    },
  } as any;

  async create(dto: CreateUserDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);

    try {
      const user = await this.prisma.user.create({
        data: {
          name: dto.name,
          email: dto.email.toLowerCase(),
          passwordHash,
          roleId: dto.roleId,
          teamId: dto.teamId,
          accountId: dto.accountId,
          status: dto.status ?? UserStatus.ACTIVE,
        },
        select: this.defaultSelect,
      });
      return this.attachCallerName(user);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Email already registered');
      }
      throw error;
    }
  }

  async findAll(requester?: any) {
    const where: Prisma.UserWhereInput = {};
    
    // Non-SuperAdmins only see users in their own account
    if (requester && requester.role?.toLowerCase() !== 'superadmin' && requester.accountId) {
      where.accountId = requester.accountId;
    }

    const users = await this.prisma.user.findMany({
      where,
      select: this.agentSelect,
      orderBy: { createdAt: 'desc' },
    });
    return users.map((user) => this.attachCallerName(user));
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: this.agentSelect,
    });
    if (!user) throw new NotFoundException('User not found');
    return this.attachCallerName(user);
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.ensureExists(id);

    const data: Prisma.UserUpdateInput = {
      name: dto.name,
      email: dto.email ? dto.email.toLowerCase() : undefined,
      status: dto.status,
      role: dto.roleId ? { connect: { id: dto.roleId } } : undefined,
      team: dto.teamId ? { connect: { id: dto.teamId } } : { disconnect: dto.teamId === null ? true : false },
      account: dto.accountId ? { connect: { id: dto.accountId } } : undefined,
      ...(dto.sipUri !== undefined ? { sipUri: dto.sipUri || null } as any : {}),
      ...(dto.sipPassword !== undefined ? { sipPassword: dto.sipPassword || null } as any : {}),
    };

    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    const user = await this.prisma.user.update({
      where: { id },
      data,
      select: this.defaultSelect,
    });
    return this.attachCallerName(user);
  }

  async remove(id: string) {
    await this.ensureExists(id);

    await this.prisma.$transaction(async (tx) => {
      // 1. Remove list assignments
      await tx.agentList.deleteMany({ where: { agentId: id } });

      // 2. Delete agent's call logs (agentId is non-nullable, cannot set to null)
      await tx.callLog.deleteMany({ where: { agentId: id } });

      // 3. Delete the user
      await tx.user.delete({ where: { id } });
    });

    return { message: 'Agent deleted successfully', id };
  }

  async findAllRoles() {
    return this.prisma.role.findMany({
      orderBy: { name: 'asc' },
    });
  }

  /** Assign a Telnyx caller number to an agent */
  async updateCallerNumber(id: string, callerNumber: string | null) {
    await this.ensureExists(id);
    const user = await this.prisma.user.update({
      where: { id },
      data: { callerNumber },
      select: this.agentSelect,
    });
    return this.attachCallerName(user);
  }

  /** Replace an agent's assigned lists (array of listIds) */
  async updateAgentLists(agentId: string, listIds: string[]) {
    await this.ensureExists(agentId);
    // Delete old assignments then create new ones atomically
    await this.prisma.$transaction([
      this.prisma.agentList.deleteMany({ where: { agentId } }),
      ...listIds.map(listId =>
        this.prisma.agentList.create({ data: { agentId, listId } }),
      ),
    ]);
    return this.findOne(agentId);
  }

  private async ensureExists(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('User not found');
  }

  private attachCallerName<T extends { callerNumber?: string | null; account?: Record<string, any> | null }>(user: T) {
    const callerName = this.resolveCallerName(user.callerNumber, user.account?.numberPool);
    const { account, ...safeUser } = user as any;
    return {
      ...safeUser,
      callerName,
    };
  }

  private resolveCallerName(callerNumber?: string | null, numberPool?: any): string | null {
    if (!callerNumber || !Array.isArray(numberPool)) return null;

    const normalizedCaller = callerNumber.replace(/\D/g, '');
    const match = numberPool.find((entry: any) => {
      const poolNumber = entry?.number;
      return typeof poolNumber === 'string' && poolNumber.replace(/\D/g, '') === normalizedCaller;
    });

    const callerName = typeof match?.callerName === 'string' ? match.callerName.trim() : '';
    return callerName || null;
  }
}

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, UserStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) { }

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
        canSendSms: true,
        canSendWhatsapp: true,
        canOutboundCall: true,
        canInboundCall: true,
        canCallInternational: true,
        canRecord: true,
      },
    },
    AgentList: {
      select: {
        listId: true,
        List: { select: { id: true, name: true } },
      },
    },
  } as any;

  async create(dto: CreateUserDto, requester?: any) {
    await this.assertCanManageAccount(dto.accountId, requester);

    const role = await this.prisma.role.findUnique({
      where: { id: dto.roleId },
      select: { id: true, name: true },
    });
    if (!role) throw new NotFoundException('Role not found');
    if (requester?.role?.toLowerCase() !== 'superadmin' && role.name.toLowerCase() !== 'agent') {
      throw new ForbiddenException('Company admins can only create agent users');
    }
    await this.assertAgentCapacity(dto.accountId, requester, role.name);

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
    if ((process.env.SUPER_ADMIN_EMAIL || '').trim()) {
      where.email = { not: process.env.SUPER_ADMIN_EMAIL!.toLowerCase() };
    }

    const users = await this.prisma.user.findMany({
      where,
      select: this.agentSelect,
      orderBy: { createdAt: 'desc' },
    });
    return users.map((user) => this.attachCallerName(user));
  }

  async getCompanyNumberInventory(requester?: any) {
    if (!requester?.accountId) {
      throw new ForbiddenException('Company account not found');
    }

    const [account, allAccounts, telnyxNumbers] = await Promise.all([
      this.prisma.account.findUnique({
        where: { id: requester.accountId },
        select: { id: true, name: true, numberPool: true },
      }),
      this.prisma.account.findMany({
        select: { id: true, numberPool: true },
      }),
      this.fetchTelnyxNumbers(),
    ]);

    if (!account) {
      throw new NotFoundException('Company account not found');
    }

    const assignedToCompany = Array.isArray(account.numberPool) ? account.numberPool : [];
    const assignedToCompanySet = new Set(
      assignedToCompany.map((entry: any) => entry?.number).filter(Boolean),
    );

    const assignedElsewhere = new Set<string>();
    for (const otherAccount of allAccounts) {
      if (otherAccount.id === account.id || !Array.isArray(otherAccount.numberPool)) continue;
      for (const entry of otherAccount.numberPool as any[]) {
        if (entry?.number) assignedElsewhere.add(entry.number);
      }
    }

    return {
      accountId: account.id,
      accountName: account.name,
      assignedNumbers: assignedToCompany,
      availableNumbers: telnyxNumbers.filter(
        (entry) => !assignedToCompanySet.has(entry.number) && !assignedElsewhere.has(entry.number),
      ),
    };
  }

  async findOne(id: string, requester?: any) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: this.agentSelect,
    });
    if (!user) throw new NotFoundException('User not found');
    this.assertUserVisible(user, requester);
    return this.attachCallerName(user);
  }

  async update(id: string, dto: UpdateUserDto, requester?: any) {
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
      if (!role) throw new NotFoundException('Role not found');
      if (requester?.role?.toLowerCase() !== 'superadmin' && role.name.toLowerCase() !== 'agent') {
        throw new ForbiddenException('Company admins can only assign the Agent role');
      }
    }

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

  async remove(id: string, requester?: any) {
    const existing = await this.ensureExists(id);
    this.assertUserVisible(existing, requester);

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

  async adminResetPassword(agentId: string, newPassword: string, requester: any) {
    const existing = await this.ensureExists(agentId);
    this.assertUserVisible(existing, requester);
    await this.assertCanManageAccount(existing.accountId, requester);

    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestException('New password must be at least 8 characters');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: agentId },
      data: { passwordHash } as any,
    });
    // Clear reset request from SignupVerification
    await this.prisma.signupVerification.deleteMany({
      where: { email: `reset_${existing.email.toLowerCase()}` },
    }).catch(() => {});
    return { message: 'Password reset', agentEmail: existing.email };
  }

  async findAllRoles(requester?: any) {
    return this.prisma.role.findMany({
      where:
        requester?.role?.toLowerCase() === 'superadmin'
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

  /** Assign a Telnyx caller number to an agent */
  async updateCallerNumber(id: string, callerNumber: string | null, requester?: any) {
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

  /** Replace an agent's assigned lists (array of listIds) */
  async updateAgentLists(agentId: string, listIds: string[], requester?: any) {
    const existing = await this.ensureExists(agentId);
    this.assertUserVisible(existing, requester);
    await this.assertListsBelongToAccount(existing.accountId, listIds);
    // Delete old assignments then create new ones atomically
    await this.prisma.$transaction([
      this.prisma.agentList.deleteMany({ where: { agentId } }),
      ...listIds.map(listId =>
        this.prisma.agentList.create({ data: { agentId, listId } }),
      ),
    ]);
    return this.findOne(agentId, requester);
  }

  private async ensureExists(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, accountId: true, email: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  private async assertCanManageAccount(accountId: string, requester?: any) {
    const requesterRole = requester?.role?.toLowerCase();
    if (!requesterRole || requesterRole === 'superadmin') return;
    if (!requester?.accountId || requester.accountId !== accountId) {
      throw new ForbiddenException('You can only manage users within your own company');
    }
  }

  private async assertAgentCapacity(accountId: string, requester: any, roleName: string) {
    if (requester?.role?.toLowerCase() === 'superadmin' || roleName.toLowerCase() !== 'agent') {
      return;
    }

    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      select: { agentLimit: true },
    });
    if (!account) {
      throw new NotFoundException('Account not found');
    }
    if (!account.agentLimit) {
      return;
    }

    const agentRole = await this.prisma.role.findFirst({
      where: { name: { equals: 'Agent', mode: 'insensitive' } },
      select: { id: true },
    });
    if (!agentRole) {
      throw new NotFoundException('Agent role not found');
    }

    const existingAgents = await this.prisma.user.count({
      where: {
        accountId,
        roleId: agentRole.id,
      },
    });

    if (existingAgents >= account.agentLimit) {
      throw new ForbiddenException(`Your company has reached its approved agent limit of ${account.agentLimit}`);
    }
  }

  private async assertCallerNumberAvailable(accountId: string, callerNumber: string | null, requester?: any) {
    if (!callerNumber) return;
    await this.assertCanManageAccount(accountId, requester);

    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      select: { numberPool: true },
    });
    const numberPool = Array.isArray(account?.numberPool) ? account.numberPool : [];
    const normalizedCaller = callerNumber.replace(/\D/g, '');
    const hasNumber = numberPool.some((entry: any) => {
      const poolNumber = typeof entry?.number === 'string' ? entry.number.replace(/\D/g, '') : '';
      return poolNumber === normalizedCaller;
    });

    if (!hasNumber) {
      throw new ForbiddenException('This caller number is not assigned to your company');
    }
  }

  private async assertListsBelongToAccount(accountId: string, listIds: string[]) {
    if (!listIds.length) return;
    const count = await this.prisma.list.count({
      where: {
        id: { in: listIds },
        accountId,
      },
    });
    if (count !== listIds.length) {
      throw new ForbiddenException('You can only assign lists from your own company');
    }
  }

  private assertUserVisible(user: { accountId?: string | null; email?: string | null }, requester?: any) {
    const requesterRole = requester?.role?.toLowerCase();
    if (!requesterRole || requesterRole === 'superadmin') return;
    if (!requester?.accountId || user.accountId !== requester.accountId) {
      throw new ForbiddenException('You can only access users within your own company');
    }
    if (user.email?.toLowerCase() === (process.env.SUPER_ADMIN_EMAIL || '').toLowerCase()) {
      throw new ForbiddenException('Super admin users are not available in this workspace');
    }
  }

  private attachCallerName<T extends { callerNumber?: string | null; account?: Record<string, any> | null }>(user: T) {
    const callerName = this.resolveCallerName(user.callerNumber, user.account?.numberPool);
    const { account, ...safeUser } = user as any;

    // Fall back to company-level default SIP credentials stored securely in backend env
    const defaultSipUri = this.configService.get<string>('DEFAULT_SIP_URI') || '';
    const defaultSipPassword = this.configService.get<string>('DEFAULT_SIP_PASSWORD') || '';
    if (!safeUser.sipUri && defaultSipUri) safeUser.sipUri = defaultSipUri;
    if (!safeUser.sipPassword && defaultSipPassword) safeUser.sipPassword = defaultSipPassword;

    return {
      ...safeUser,
      callerName,
      account: account ? { id: account.id, name: account.name, numberPool: account.numberPool ?? [] } : null,
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

  private async fetchTelnyxNumbers(): Promise<Array<{ number: string; callerName: string; countryCode: string }>> {
    const apiKey = this.configService.get<string>('TELNYX_API_KEY');
    if (!apiKey) return [];

    try {
      const res = await fetch('https://api.telnyx.com/v2/phone_numbers?page[size]=200', {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) return [];

      const json = await res.json();
      const data: any[] = json?.data || [];

      return data.map((item) => ({
        number: item.phone_number || '',
        callerName: item.caller_name || '',
        countryCode: this.extractCountryCode(item.phone_number || ''),
      }));
    } catch {
      return [];
    }
  }

  private extractCountryCode(e164: string): string {
    if (!e164.startsWith('+')) return '';

    const digits = e164.slice(1);
    const knownCodes = new Set([
      '1', '7', '20', '27', '30', '31', '32', '33', '34', '36', '39', '40', '41', '43',
      '44', '45', '46', '47', '48', '49', '51', '52', '54', '55', '56', '57', '60', '61',
      '62', '63', '64', '65', '66', '81', '82', '84', '86', '90', '91', '92', '93', '94',
      '95', '98', '212', '213', '216', '218', '234', '971', '972', '966', '964', '963', '961',
    ]);

    for (const len of [3, 2, 1]) {
      const prefix = digits.slice(0, len);
      if (knownCodes.has(prefix)) {
        return `+${prefix}`;
      }
    }

    return `+${digits.slice(0, 1)}`;
  }
}

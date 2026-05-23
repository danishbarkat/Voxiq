import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AccountStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SuperAdminService {
  constructor(private prisma: PrismaService) {}

  async getAllCompanies() {
    const accounts = await this.prisma.account.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        users: {
          select: { id: true, name: true, email: true, role: { select: { name: true } } },
        },
        _count: { select: { users: true } },
      },
    });

    return accounts.map((acc) => ({
      id: acc.id,
      name: acc.name,
      status: acc.status,
      approved: acc.approved,
      agentLimit: acc.agentLimit,
      requestedAgentLimit: acc.requestedAgentLimit,
      requestedNumbers: acc.requestedNumbers,
      adminPhone: acc.adminPhone,
      rejectionReason: acc.rejectionReason,
      approvedAt: acc.approvedAt,
      createdAt: acc.createdAt,
      userCount: acc._count.users,
      adminEmail: acc.users.find((u) => u.role?.name?.toLowerCase() === 'admin')?.email ?? null,
      adminName: acc.users.find((u) => u.role?.name?.toLowerCase() === 'admin')?.name ?? null,
    }));
  }

  async approveCompany(
    accountId: string,
    agentLimit: number,
    numberPool: Array<{ number: string; callerName: string; areaCode: string }>,
  ) {
    const account = await this.prisma.account.findUnique({ where: { id: accountId } });
    if (!account) throw new NotFoundException('Company not found');
    if (account.status === AccountStatus.ACTIVE) {
      throw new BadRequestException('Company is already active');
    }

    return this.prisma.account.update({
      where: { id: accountId },
      data: {
        status: AccountStatus.ACTIVE,
        approved: true,
        agentLimit,
        numberPool,
        approvedAt: new Date(),
        rejectionReason: null,
      },
    });
  }

  async rejectCompany(accountId: string, reason: string) {
    const account = await this.prisma.account.findUnique({ where: { id: accountId } });
    if (!account) throw new NotFoundException('Company not found');

    return this.prisma.account.update({
      where: { id: accountId },
      data: {
        status: AccountStatus.INACTIVE,
        approved: false,
        rejectionReason: reason,
      },
    });
  }

  async deactivateCompany(accountId: string) {
    const account = await this.prisma.account.findUnique({ where: { id: accountId } });
    if (!account) throw new NotFoundException('Company not found');

    return this.prisma.account.update({
      where: { id: accountId },
      data: { status: AccountStatus.INACTIVE },
    });
  }

  async activateCompany(accountId: string) {
    const account = await this.prisma.account.findUnique({ where: { id: accountId } });
    if (!account) throw new NotFoundException('Company not found');

    return this.prisma.account.update({
      where: { id: accountId },
      data: { status: AccountStatus.ACTIVE, approved: true },
    });
  }

  async getAnalytics() {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const accounts = await this.prisma.account.findMany({
      where: { status: AccountStatus.ACTIVE },
      select: { id: true, name: true },
    });

    const results = await Promise.all(
      accounts.map(async (acc) => {
        const [daily, weekly, monthly] = await Promise.all([
          this.getAccountStats(acc.id, dayAgo),
          this.getAccountStats(acc.id, weekAgo),
          this.getAccountStats(acc.id, monthAgo),
        ]);
        return { accountId: acc.id, companyName: acc.name, daily, weekly, monthly };
      }),
    );

    return results;
  }

  async getCompanyAnalytics(accountId: string) {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      select: { id: true, name: true },
    });
    if (!account) throw new NotFoundException('Company not found');

    const [daily, weekly, monthly] = await Promise.all([
      this.getAccountStats(accountId, dayAgo),
      this.getAccountStats(accountId, weekAgo),
      this.getAccountStats(accountId, monthAgo),
    ]);

    return { accountId, companyName: account.name, daily, weekly, monthly };
  }

  private async getAccountStats(accountId: string, since: Date) {
    const logs = await this.prisma.callLog.findMany({
      where: {
        startedAt: { gte: since },
        agent: { accountId },
      },
      select: { startedAt: true, endedAt: true, callStatus: true },
    });

    const calls = logs.length;
    const connectedCalls = logs.filter(
      (l) => l.callStatus === 'CONNECTED' || l.callStatus === 'COMPLETED',
    ).length;
    const totalSeconds = logs.reduce((sum, l) => {
      if (!l.endedAt) return sum;
      return sum + (l.endedAt.getTime() - l.startedAt.getTime()) / 1000;
    }, 0);
    const totalMinutes = Math.round(totalSeconds / 60);
    const avgDuration = calls > 0 ? Math.round(totalSeconds / calls) : 0;

    return { calls, connectedCalls, totalMinutes, avgDuration };
  }
}

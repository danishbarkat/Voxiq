import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccountStatus, CallStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { getStateFromE164 } from '../utils/areaCodes';

const SUPERADMIN_ACCOUNT_ID = 'super-admin-account';

@Injectable()
export class SuperAdminService {
  private readonly accountSummarySelect = {
    id: true,
    name: true,
    status: true,
    approved: true,
    agentLimit: true,
    requestedAgentLimit: true,
    requestedNumbers: true,
    accessCode: true,
    accessCodeUsedAt: true,
    approvedAt: true,
    createdAt: true,
    numberPool: true,
    adminPhone: true,
    rejectionReason: true,
    ntn: true,
    users: {
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        createdAt: true,
        role: { select: { name: true } },
      },
    },
    _count: {
      select: {
        users: true,
        leads: true,
        lists: true,
        campaigns: true,
      },
    },
  } as const;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async getOverview() {
    const [accounts, callLogs] = await Promise.all([
      this.prisma.account.findMany({
        where: { id: { not: SUPERADMIN_ACCOUNT_ID } },
        select: this.accountSummarySelect,
      }),
      this.getDashboardLogs(),
    ]);

    const byAccount = this.groupLogsByAccount(callLogs);
    const companySummaries = accounts.map((account) =>
      this.buildCompanySnapshot(account, byAccount.get(account.id) || []),
    );

    const totals = companySummaries.reduce(
      (acc, company) => {
        acc.totalCompanies += 1;
        acc.activeCompanies += company.status === 'ACTIVE' ? 1 : 0;
        acc.pendingCompanies += company.status === 'PENDING' ? 1 : 0;
        acc.inactiveCompanies += company.status === 'INACTIVE' ? 1 : 0;
        acc.totalAgents += company.agentCount;
        acc.totalAdmins += company.adminCount;
        acc.totalLeads += company.leadCount;
        acc.totalLists += company.listCount;
        acc.totalCampaigns += company.campaignCount;
        acc.totalNumbers += company.numberCount;
        acc.totalCalls += company.totalCalls;
        acc.connectedCalls += company.connectedCalls;
        acc.totalMinutes += company.totalMinutes;
        acc.totalRevenue += company.revenue;
        acc.recordings += company.recordings;
        acc.inboundCalls += company.inboundCalls;
        acc.outboundCalls += company.outboundCalls;
        return acc;
      },
      {
        totalCompanies: 0,
        activeCompanies: 0,
        pendingCompanies: 0,
        inactiveCompanies: 0,
        totalAgents: 0,
        totalAdmins: 0,
        totalLeads: 0,
        totalLists: 0,
        totalCampaigns: 0,
        totalNumbers: 0,
        totalCalls: 0,
        connectedCalls: 0,
        totalMinutes: 0,
        totalRevenue: 0,
        recordings: 0,
        inboundCalls: 0,
        outboundCalls: 0,
      },
    );

    const topCompanies = [...companySummaries]
      .sort((a, b) => b.totalCalls - a.totalCalls)
      .slice(0, 5)
      .map((company) => ({
        accountId: company.id,
        companyName: company.name,
        totalCalls: company.totalCalls,
        totalMinutes: company.totalMinutes,
        revenue: company.revenue,
        topStates: company.topStates?.slice(0, 3) || [],
      }));

    const stateCounts: Record<string, number> = {};
    for (const company of companySummaries) {
      for (const state of company.topStates) {
        stateCounts[state.state] = (stateCounts[state.state] || 0) + state.calls;
      }
    }

    const topStates = Object.entries(stateCounts)
      .map(([state, calls]) => ({ state, calls }))
      .sort((a, b) => b.calls - a.calls)
      .slice(0, 8);

    const topCountries = this.buildTopCountries(callLogs);

    return {
      ...totals,
      connectionRate: totals.totalCalls > 0 ? Number(((totals.connectedCalls / totals.totalCalls) * 100).toFixed(1)) : 0,
      topCompanies,
      topStates,
      topCountries,
    };
  }

  async getAllCompanies() {
    const [accounts, callLogs] = await Promise.all([
      this.prisma.account.findMany({
        where: { id: { not: SUPERADMIN_ACCOUNT_ID } },
        orderBy: { createdAt: 'desc' },
        select: this.accountSummarySelect,
      }),
      this.getDashboardLogs(),
    ]);

    const byAccount = this.groupLogsByAccount(callLogs);

    return accounts.map((account) =>
      this.buildCompanySnapshot(account, byAccount.get(account.id) || []),
    );
  }

  async getCompanyDetails(accountId: string) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      select: {
        id: true,
        name: true,
        status: true,
        approved: true,
        agentLimit: true,
        requestedAgentLimit: true,
        requestedNumbers: true,
        accessCode: true,
        accessCodeUsedAt: true,
        approvedAt: true,
        createdAt: true,
        numberPool: true,
        adminPhone: true,
        rejectionReason: true,
        ntn: true,
        users: {
          include: {
            role: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        lists: {
          select: {
            id: true,
            name: true,
            createdAt: true,
            _count: { select: { leads: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        campaigns: {
          select: {
            id: true,
            name: true,
            status: true,
            mode: true,
            localPresence: true,
            record: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!account) {
      throw new NotFoundException('Company not found');
    }

    const logs = await this.prisma.callLog.findMany({
      where: {
        agent: {
          accountId,
        },
      },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        campaign: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { startedAt: 'desc' },
      take: 150,
    });

    const stats = this.computeLogStats(logs);
    const activityByDay = this.buildDailyActivity(logs);
    const topStates = this.buildTopStates(logs);
    const topCountries = this.buildTopCountries(logs);
    const topAgents = this.buildTopAgents(logs, account.users);

    return {
      id: account.id,
      name: account.name,
      status: account.status,
      approved: account.approved,
      agentLimit: account.agentLimit,
      requestedAgentLimit: account.requestedAgentLimit,
      requestedNumbers: account.requestedNumbers,
      accessCode: account.accessCode,
      accessCodeUsed: !!account.accessCodeUsedAt,
      approvedAt: account.approvedAt,
      createdAt: account.createdAt,
      numberPool: Array.isArray(account.numberPool) ? account.numberPool : [],
      numberCount: Array.isArray(account.numberPool) ? account.numberPool.length : 0,
      services: this.detectServices(account, logs),
      stats,
      topStates,
      topCountries,
      activityByDay,
      topAgents,
      admins: account.users
        .filter((user) => user.role?.name?.toLowerCase() === 'admin')
        .map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          status: user.status,
          createdAt: user.createdAt,
        })),
      agents: account.users
        .filter((user) => user.role?.name?.toLowerCase() === 'agent')
        .map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          status: user.status,
          callerNumber: user.callerNumber,
          createdAt: user.createdAt,
        })),
      lists: account.lists.map((list) => ({
        id: list.id,
        name: list.name,
        leadCount: list._count.leads,
        createdAt: list.createdAt,
      })),
      campaigns: account.campaigns,
      recentCalls: logs.slice(0, 20).map((log) => ({
        id: log.id,
        startedAt: log.startedAt,
        endedAt: log.endedAt,
        direction: log.direction || 'outbound',
        callStatus: log.callStatus,
        disposition: log.disposition,
        fromNumber: log.fromNumber,
        toNumber: log.toNumber,
        dealValue: log.dealValue || 0,
        recordingUrl: log.recordingUrl,
        vmRecordingUrl: log.vmRecordingUrl,
        agentName: log.agent?.name || 'Unknown',
        campaignName: log.campaign?.name || 'Unassigned',
        leadName: log.lead ? `${log.lead.firstName} ${log.lead.lastName}`.trim() : 'Unknown Lead',
        leadPhone: log.lead?.phone || null,
      })),
    };
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
      data: { status: AccountStatus.INACTIVE, rejectionReason: null },
    });
  }

  async deleteCompany(accountId: string) {
    const account = await this.prisma.account.findUnique({ where: { id: accountId } });
    if (!account) throw new NotFoundException('Company not found');
    if (accountId === 'super-admin-account') throw new BadRequestException('Cannot delete super admin account');

    // Cascade delete all company data
    const userIds = (await this.prisma.user.findMany({
      where: { accountId },
      select: { id: true },
    })).map(u => u.id);

    await this.prisma.callLog.deleteMany({ where: { agentId: { in: userIds } } });
    await this.prisma.smsMessage.deleteMany({ where: { accountId } });
    await this.prisma.agentList.deleteMany({ where: { agentId: { in: userIds } } });
    await this.prisma.lead.deleteMany({ where: { accountId } });
    await this.prisma.list.deleteMany({ where: { accountId } });
    await this.prisma.campaign.deleteMany({ where: { accountId } });
    try { await (this.prisma as any).voicemailTemplate.deleteMany({ where: { accountId } }); } catch { }
    await this.prisma.user.deleteMany({ where: { accountId } });
    await this.prisma.account.delete({ where: { id: accountId } });

    return { success: true, message: 'Company and all associated data permanently deleted' };
  }

  async activateCompany(accountId: string) {
    const account = await this.prisma.account.findUnique({ where: { id: accountId } });
    if (!account) throw new NotFoundException('Company not found');

    return this.prisma.account.update({
      where: { id: accountId },
      data: { status: AccountStatus.ACTIVE, approved: true, rejectionReason: null },
    });
  }

  async getAnalytics() {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const accounts = await this.prisma.account.findMany({
      where: { id: { not: SUPERADMIN_ACCOUNT_ID } },
      select: { id: true, name: true, status: true },
    });

    const results = await Promise.all(
      accounts.map(async (account) => {
        const [daily, weekly, monthly] = await Promise.all([
          this.getAccountStats(account.id, dayAgo),
          this.getAccountStats(account.id, weekAgo),
          this.getAccountStats(account.id, monthAgo),
        ]);
        return {
          accountId: account.id,
          companyName: account.name,
          status: account.status,
          daily,
          weekly,
          monthly,
        };
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

  async getPendingVerifications() {
    const records = await this.prisma.signupVerification.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return records.map(r => {
      const payload = r.payload as any;
      return {
        email: r.email,
        companyName: payload?.companyName || '',
        name: `${payload?.name || ''} ${payload?.lastName || ''}`.trim(),
        phone: payload?.phone || '',
        otpCode: r.otpCode,
        expired: r.expiresAt < new Date(),
        createdAt: r.createdAt,
      };
    });
  }

  async regenerateOtp(email: string) {
    const record = await this.prisma.signupVerification.findUnique({ where: { email } });
    if (!record) throw new Error('No pending verification for this email');
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    await this.prisma.signupVerification.update({
      where: { email },
      data: { otpCode: newOtp, expiresAt: new Date(Date.now() + 30 * 60 * 1000) },
    });
    return { otpCode: newOtp, message: 'OTP refreshed — share with user' };
  }

  async getAvailableNumbers() {
    // Fetch all numbers from Telnyx
    const telnyxNumbers = await this.fetchTelnyxNumbers();

    // Find which numbers are already assigned to companies
    const allCompanies = await this.prisma.account.findMany({
      where: { id: { not: SUPERADMIN_ACCOUNT_ID } },
      select: { numberPool: true },
    });

    const assignedNumbers = new Set<string>();
    for (const company of allCompanies) {
      if (Array.isArray(company.numberPool)) {
        for (const entry of company.numberPool as any[]) {
          if (entry?.number) assignedNumbers.add(entry.number);
        }
      }
    }

    return telnyxNumbers.map(entry => ({
      ...entry,
      assigned: assignedNumbers.has(entry.number),
    }));
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

      return data.map(item => {
        const raw: string = item.phone_number || '';
        const countryCode = this.extractCountryCode(raw);
        return {
          number: raw,
          callerName: item.caller_name || '',
          countryCode,
        };
      });
    } catch {
      return [];
    }
  }

  private extractCountryCode(e164: string): string {
    if (!e164.startsWith('+')) return '';
    // Common country code lengths: +1 (US/CA), +44, +92, +971, etc.
    const knownCodes: Record<string, number> = {
      '1': 1, '7': 1, '20': 2, '27': 2, '30': 2, '31': 2, '32': 2, '33': 2, '34': 2,
      '36': 2, '39': 2, '40': 2, '41': 2, '43': 2, '44': 2, '45': 2, '46': 2, '47': 2,
      '48': 2, '49': 2, '51': 2, '52': 2, '53': 2, '54': 2, '55': 2, '56': 2, '57': 2,
      '58': 2, '60': 2, '61': 2, '62': 2, '63': 2, '64': 2, '65': 2, '66': 2, '81': 2,
      '82': 2, '84': 2, '86': 2, '90': 2, '91': 2, '92': 2, '93': 2, '94': 2, '95': 2,
      '98': 2, '212': 3, '213': 3, '216': 3, '218': 3, '220': 3, '221': 3, '234': 3,
      '971': 3, '972': 3, '966': 3, '964': 3, '963': 3, '961': 3,
    };

    const digits = e164.slice(1);
    for (const len of [3, 2, 1]) {
      const prefix = digits.slice(0, len);
      if (knownCodes[prefix] !== undefined) return `+${prefix}`;
    }
    return `+${digits.slice(0, 1)}`;
  }

  async assignNumbers(
    accountId: string,
    numbers: Array<{ number: string; callerName: string; areaCode: string }>,
  ) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      select: { numberPool: true },
    });
    if (!account) throw new NotFoundException('Company not found');

    const pool: any[] = Array.isArray(account.numberPool) ? (account.numberPool as any[]) : [];
    const existing = new Set(pool.map((e: any) => e.number));

    const toAdd = numbers.filter(n => !existing.has(n.number));
    const updated = [...pool, ...toAdd];

    await this.prisma.account.update({
      where: { id: accountId },
      data: { numberPool: updated },
    });

    return { message: `${toAdd.length} number(s) assigned`, assigned: toAdd };
  }

  async unassignNumber(accountId: string, number: string) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      select: { numberPool: true },
    });
    if (!account) throw new NotFoundException('Company not found');

    const pool: any[] = Array.isArray(account.numberPool) ? (account.numberPool as any[]) : [];
    const updated = pool.filter(e => e.number !== number);

    if (updated.length === pool.length) {
      throw new NotFoundException('Number not found in this company pool');
    }

    await this.prisma.account.update({
      where: { id: accountId },
      data: { numberPool: updated },
    });

    return { message: 'Number unassigned', number };
  }

  async regenerateAccessCode(accountId: string) {
    const account = await this.prisma.account.findUnique({ where: { id: accountId } });
    if (!account) throw new NotFoundException('Company not found');

    return this.prisma.account.update({
      where: { id: accountId },
      data: {
        accessCode: this.generateAccessCode(),
        accessCodeIssuedAt: new Date(),
        accessCodeUsedAt: null,
      },
      select: {
        id: true,
        name: true,
        accessCode: true,
        accessCodeIssuedAt: true,
      },
    });
  }

  static readonly PACKAGES: Record<string, {
    canOutboundCall: boolean; canInboundCall: boolean;
    canSendSms: boolean; canRecord: boolean;
    monthlyCallLimit: number | null; monthlySmsLimit: number | null;
    agentLimit: number;
  }> = {
    Starter:    { canOutboundCall: true,  canInboundCall: false, canSendSms: false, canRecord: false, monthlyCallLimit: 300,   monthlySmsLimit: 0,    agentLimit: 1  },
    Basic:      { canOutboundCall: true,  canInboundCall: true,  canSendSms: true,  canRecord: false, monthlyCallLimit: 500,   monthlySmsLimit: 400,  agentLimit: 3  },
    Growth:     { canOutboundCall: true,  canInboundCall: true,  canSendSms: true,  canRecord: true,  monthlyCallLimit: 1000,  monthlySmsLimit: 800,  agentLimit: 5  },
    Pro:        { canOutboundCall: true,  canInboundCall: true,  canSendSms: true,  canRecord: true,  monthlyCallLimit: 2500,  monthlySmsLimit: 2000, agentLimit: 10 },
    Agency:     { canOutboundCall: true,  canInboundCall: true,  canSendSms: true,  canRecord: true,  monthlyCallLimit: 6000,  monthlySmsLimit: 5000, agentLimit: 25 },
    Enterprise: { canOutboundCall: true,  canInboundCall: true,  canSendSms: true,  canRecord: true,  monthlyCallLimit: null,  monthlySmsLimit: null, agentLimit: 100 },
  };

  async assignPackage(accountId: string, packageName: string) {
    const preset = SuperAdminService.PACKAGES[packageName];
    if (!preset) throw new BadRequestException(`Unknown package: ${packageName}`);

    return this.prisma.account.update({
      where: { id: accountId },
      data: { packageName, ...preset },
      select: {
        id: true, name: true, packageName: true,
        canOutboundCall: true, canInboundCall: true,
        canSendSms: true, canRecord: true,
        monthlyCallLimit: true, monthlySmsLimit: true, agentLimit: true,
      },
    });
  }

  async getPackageUsage(accountId: string) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [callCount, smsCount, account] = await Promise.all([
      this.prisma.callLog.count({
        where: { agent: { accountId }, startedAt: { gte: monthStart } },
      }),
      this.prisma.smsMessage.count({
        where: { accountId, direction: 'outbound', createdAt: { gte: monthStart } },
      }),
      this.prisma.account.findUnique({
        where: { id: accountId },
        select: {
          packageName: true, canOutboundCall: true, canInboundCall: true,
          canSendSms: true, canRecord: true,
          monthlyCallLimit: true, monthlySmsLimit: true, agentLimit: true,
        },
      }),
    ]);

    if (!account) throw new NotFoundException('Company not found');

    return {
      ...account,
      usage: {
        callsThisMonth: callCount,
        smsThisMonth: smsCount,
        callLimitReached: account.monthlyCallLimit !== null && callCount >= account.monthlyCallLimit,
        smsLimitReached: account.monthlySmsLimit !== null && smsCount >= account.monthlySmsLimit,
      },
    };
  }

  private async getAccountStats(accountId: string, since: Date) {
    const logs = await this.prisma.callLog.findMany({
      where: {
        startedAt: { gte: since },
        agent: { accountId },
      },
      include: {
        lead: {
          select: {
            phone: true,
          },
        },
      },
    });

    const stats = this.computeLogStats(logs);
    return {
      calls: stats.totalCalls,
      connectedCalls: stats.connectedCalls,
      totalMinutes: stats.totalMinutes,
      avgDuration: stats.avgDuration,
      revenue: stats.revenue,
      inboundCalls: stats.inboundCalls,
      outboundCalls: stats.outboundCalls,
      recordings: stats.recordings,
      topStates: this.buildTopStates(logs).slice(0, 5),
    };
  }

  private getDashboardLogs() {
    return this.prisma.callLog.findMany({
      select: {
        id: true,
        startedAt: true,
        endedAt: true,
        callStatus: true,
        dealValue: true,
        recordingUrl: true,
        direction: true,
        toNumber: true,
        fromNumber: true,
        agent: {
          select: {
            accountId: true,
          },
        },
        lead: {
          select: {
            phone: true,
          },
        },
      },
      orderBy: { startedAt: 'desc' },
      take: 5000,
    });
  }

  private groupLogsByAccount(logs: Array<any>) {
    const byAccount = new Map<string, any[]>();
    for (const log of logs) {
      const accountId = log.agent?.accountId;
      if (!accountId) continue;
      const current = byAccount.get(accountId) || [];
      current.push(log);
      byAccount.set(accountId, current);
    }
    return byAccount;
  }

  private buildCompanySnapshot(account: any, logs: any[]) {
    const stats = this.computeLogStats(logs);
    const adminUsers = account.users.filter((user: any) => user.role?.name?.toLowerCase() === 'admin');
    const agentUsers = account.users.filter((user: any) => user.role?.name?.toLowerCase() === 'agent');

    return {
      id: account.id,
      name: account.name,
      status: account.status,
      approved: account.approved,
      agentLimit: account.agentLimit,
      requestedAgentLimit: account.requestedAgentLimit,
      requestedNumbers: account.requestedNumbers,
      accessCode: account.accessCode,
      accessCodeUsed: !!account.accessCodeUsedAt,
      adminPhone: account.adminPhone,
      ntn: (account as any).ntn || null,
      website: null,
      rejectionReason: account.rejectionReason,
      reactivationRequested:
        account.status === AccountStatus.INACTIVE &&
        typeof account.rejectionReason === 'string' &&
        account.rejectionReason.startsWith('[REACTIVATION_REQUEST]'),
      approvedAt: account.approvedAt,
      createdAt: account.createdAt,
      userCount: account._count.users,
      agentCount: agentUsers.length,
      adminCount: adminUsers.length,
      leadCount: account._count.leads,
      listCount: account._count.lists,
      campaignCount: account._count.campaigns,
      numberCount: Array.isArray(account.numberPool) ? account.numberPool.length : 0,
      adminEmail: adminUsers[0]?.email ?? null,
      adminName: adminUsers[0]?.name ?? null,
      totalCalls: stats.totalCalls,
      connectedCalls: stats.connectedCalls,
      totalMinutes: stats.totalMinutes,
      avgDuration: stats.avgDuration,
      revenue: stats.revenue,
      recordings: stats.recordings,
      inboundCalls: stats.inboundCalls,
      outboundCalls: stats.outboundCalls,
      services: this.detectServices(account, logs),
      topStates: this.buildTopStates(logs).slice(0, 5),
    };
  }

  private computeLogStats(logs: any[]) {
    const totalCalls = logs.length;
    const connectedCalls = logs.filter(
      (log) => log.callStatus === CallStatus.CONNECTED || log.callStatus === CallStatus.COMPLETED,
    ).length;
    const totalSeconds = logs.reduce((sum, log) => {
      if (log.durationSeconds != null) return sum + log.durationSeconds;
      if (!log.endedAt || !log.startedAt) return sum;
      return sum + (new Date(log.endedAt).getTime() - new Date(log.startedAt).getTime()) / 1000;
    }, 0);
    const totalMinutes = parseFloat((totalSeconds / 60).toFixed(2));
    const avgDuration = totalCalls > 0 ? Math.round(totalSeconds / totalCalls) : 0;
    const revenue = logs.reduce((sum, log) => sum + (log.dealValue || 0), 0);
    const recordings = logs.filter((log) => !!log.recordingUrl).length;
    const inboundCalls = logs.filter((log) => (log.direction || '').toLowerCase() === 'inbound').length;
    const outboundCalls = totalCalls - inboundCalls;

    return {
      totalCalls,
      connectedCalls,
      totalMinutes,
      avgDuration,
      revenue,
      recordings,
      inboundCalls,
      outboundCalls,
    };
  }

  private buildTopStates(logs: any[]) {
    const stateCounts: Record<string, number> = {};
    for (const log of logs) {
      const phone = log.lead?.phone || log.toNumber;
      const state = phone ? getStateFromE164(phone) : null;
      if (!state) continue;
      stateCounts[state] = (stateCounts[state] || 0) + 1;
    }
    return Object.entries(stateCounts)
      .map(([state, calls]) => ({ state, calls }))
      .sort((a, b) => b.calls - a.calls);
  }

  private buildTopCountries(logs: any[]) {
    const PHONE_COUNTRY_MAP: Record<string, string> = {
      '1': 'US', '7': 'RU', '20': 'EG', '27': 'ZA', '30': 'GR', '31': 'NL',
      '32': 'BE', '33': 'FR', '34': 'ES', '36': 'HU', '39': 'IT', '40': 'RO',
      '41': 'CH', '43': 'AT', '44': 'GB', '45': 'DK', '46': 'SE', '47': 'NO',
      '48': 'PL', '49': 'DE', '51': 'PE', '52': 'MX', '54': 'AR', '55': 'BR',
      '56': 'CL', '57': 'CO', '58': 'VE', '60': 'MY', '61': 'AU', '62': 'ID',
      '63': 'PH', '64': 'NZ', '65': 'SG', '66': 'TH', '81': 'JP', '82': 'KR',
      '84': 'VN', '86': 'CN', '90': 'TR', '91': 'IN', '92': 'PK', '93': 'AF',
      '94': 'LK', '95': 'MM', '98': 'IR', '212': 'MA', '213': 'DZ', '216': 'TN',
      '218': 'LY', '234': 'NG', '249': 'SD', '251': 'ET', '254': 'KE',
      '255': 'TZ', '256': 'UG', '260': 'ZM', '263': 'ZW', '351': 'PT',
      '353': 'IE', '358': 'FI', '380': 'UA', '420': 'CZ', '421': 'SK',
      '971': 'AE', '966': 'SA', '965': 'KW', '974': 'QA', '973': 'BH',
      '968': 'OM', '967': 'YE', '962': 'JO', '961': 'LB', '964': 'IQ', '972': 'IL',
    };

    const counts: Record<string, number> = {};
    for (const log of logs) {
      const phone = (log.lead?.phone || log.toNumber || '').replace(/[^0-9]/g, '');
      if (!phone) continue;
      let country: string | null = null;
      for (const len of [3, 2, 1]) {
        const prefix = phone.slice(0, len);
        if (PHONE_COUNTRY_MAP[prefix]) { country = PHONE_COUNTRY_MAP[prefix]; break; }
      }
      if (!country) continue;
      counts[country] = (counts[country] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([id, calls]) => ({ id, calls }))
      .sort((a, b) => b.calls - a.calls);
  }

  private buildDailyActivity(logs: any[]) {
    const bucket: Record<string, { date: string; calls: number; revenue: number }> = {};
    for (const log of logs) {
      const date = new Date(log.startedAt).toISOString().slice(0, 10);
      if (!bucket[date]) {
        bucket[date] = { date, calls: 0, revenue: 0 };
      }
      bucket[date].calls += 1;
      bucket[date].revenue += log.dealValue || 0;
    }

    return Object.values(bucket)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14);
  }

  private buildTopAgents(logs: any[], users: any[]) {
    const byAgent = new Map<string, { id: string; name: string; email: string; calls: number; revenue: number }>();

    for (const log of logs) {
      if (!log.agentId) continue;
      const current = byAgent.get(log.agentId) || {
        id: log.agentId,
        name: log.agent?.name || 'Unknown',
        email: log.agent?.email || '',
        calls: 0,
        revenue: 0,
      };
      current.calls += 1;
      current.revenue += log.dealValue || 0;
      byAgent.set(log.agentId, current);
    }

    const results = Array.from(byAgent.values()).sort((a, b) => b.calls - a.calls).slice(0, 8);
    if (results.length > 0) return results;

    return users
      .filter((user: any) => user.role?.name?.toLowerCase() === 'agent')
      .slice(0, 8)
      .map((user: any) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        calls: 0,
        revenue: 0,
      }));
  }

  private detectServices(account: any, logs: any[]) {
    const numberPool = Array.isArray(account.numberPool) ? account.numberPool : [];
    const inboundCalls = logs.some((log) => (log.direction || '').toLowerCase() === 'inbound');
    const recordings = logs.some((log) => !!log.recordingUrl);
    const localPresence = (account.campaigns || []).some((campaign: any) => !!campaign.localPresence);

    return [
      numberPool.length > 0 ? 'Outbound' : null,
      inboundCalls ? 'Inbound' : null,
      recordings ? 'Recordings' : null,
      localPresence ? 'Local Presence' : null,
    ].filter(Boolean);
  }

  private generateAccessCode() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const part = () =>
      Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
    return `${part()}-${part()}`;
  }
}

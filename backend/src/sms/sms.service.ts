import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  async send(to: string, body: string, fromOverride: string | undefined, agentId: string, accountId: string) {
    // Feature gate: check SMS permission + monthly limit
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      select: { canSendSms: true, monthlySmsLimit: true, isTrial: true, trialEndsAt: true },
    });
    if (account && !account.canSendSms) {
      throw new ForbiddenException('SMS sending is not enabled for your plan. Please upgrade.');
    }
    if (account?.isTrial && account.trialEndsAt && new Date(account.trialEndsAt) < new Date()) {
      throw new ForbiddenException('Your free trial has expired. Please upgrade to continue.');
    }
    if (account?.monthlySmsLimit !== null && account?.monthlySmsLimit !== undefined) {
      const monthStart = new Date();
      monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
      const used = await this.prisma.smsMessage.count({
        where: { accountId, direction: 'outbound', createdAt: { gte: monthStart } },
      });
      if (used >= account.monthlySmsLimit) {
        throw new ForbiddenException(`Monthly SMS limit reached (${used}/${account.monthlySmsLimit}). Please upgrade your plan.`);
      }
    }

    const apiKey = this.config.get<string>('TELNYX_API_KEY');
    const defaultFrom = this.config.get<string>('DEFAULT_OUTBOUND_NUMBER') || '+14422039259';
    const from = fromOverride || defaultFrom;

    const formattedTo = to.startsWith('+') ? to : `+1${to.replace(/\D/g, '').slice(-10)}`;
    const formattedFrom = from.startsWith('+') ? from : `+1${from.replace(/\D/g, '').slice(-10)}`;

    let telnyxMessageId: string | null = null;
    let status = 'sent';

    try {
      const response = await fetch('https://api.telnyx.com/v2/messages', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ to: formattedTo, from: formattedFrom, text: body }),
      });
      const json = await response.json() as any;
      if (!response.ok) {
        const detail = json?.errors?.[0]?.detail || 'Send failed';
        this.logger.error(`Telnyx SMS error: ${detail}`);
        status = 'failed';
      } else {
        telnyxMessageId = json?.data?.id || null;
      }
    } catch (err) {
      this.logger.error(`SMS send exception: ${err.message}`);
      status = 'failed';
    }

    return this.prisma.smsMessage.create({
      data: {
        accountId,
        agentId,
        direction: 'outbound',
        fromNumber: formattedFrom,
        toNumber: formattedTo,
        body,
        status,
        telnyxMessageId,
      },
    });
  }

  async saveInbound(from: string, to: string, body: string, telnyxMessageId: string | null, accountId: string) {
    return this.prisma.smsMessage.create({
      data: {
        accountId,
        agentId: null,
        direction: 'inbound',
        fromNumber: from,
        toNumber: to,
        body,
        status: 'received',
        telnyxMessageId,
      },
    });
  }

  async getConversations(accountId: string, agentId?: string) {
    const where: any = { accountId };
    if (agentId) {
      where.OR = [{ agentId }, { direction: 'inbound' }];
    }

    const messages = await this.prisma.smsMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { agent: { select: { id: true, name: true } } },
    });

    const threads = new Map<string, any>();
    for (const msg of messages) {
      const contactNumber = msg.direction === 'outbound' ? msg.toNumber : msg.fromNumber;
      if (!threads.has(contactNumber)) {
        threads.set(contactNumber, {
          contactNumber,
          lastMessage: msg.body,
          lastMessageAt: msg.createdAt,
          direction: msg.direction,
          agentId: msg.agentId,
          agentName: (msg as any).agent?.name ?? null,
        });
      }
    }

    return Array.from(threads.values()).sort(
      (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
    );
  }

  async getThread(contactNumber: string, accountId: string) {
    const formatted = contactNumber.startsWith('+')
      ? contactNumber
      : `+1${contactNumber.replace(/\D/g, '').slice(-10)}`;

    const messages = await this.prisma.smsMessage.findMany({
      where: {
        accountId,
        OR: [{ toNumber: formatted }, { fromNumber: formatted }],
      },
      orderBy: { createdAt: 'asc' },
      include: { agent: { select: { id: true, name: true } } },
    });

    return messages.map((m) => ({
      id: m.id,
      direction: m.direction,
      fromNumber: m.fromNumber,
      toNumber: m.toNumber,
      body: m.body,
      status: m.status,
      createdAt: m.createdAt,
      agentId: m.agentId,
      agentName: (m as any).agent?.name ?? null,
    }));
  }

  async findAccountByNumber(toNumber: string): Promise<string | null> {
    const user = await this.prisma.user.findFirst({
      where: { callerNumber: toNumber },
      select: { accountId: true },
    });
    return user?.accountId ?? null;
  }
}

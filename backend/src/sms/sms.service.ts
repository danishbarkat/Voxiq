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

  async send(
    to: string,
    body: string,
    fromOverride: string | undefined,
    agentId: string,
    accountId: string,
    channel: 'sms' | 'whatsapp' = 'sms',
  ) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      select: {
        canSendSms: true, canSendWhatsapp: true,
        monthlySmsLimit: true, monthlyWhatsappLimit: true,
        isTrial: true, trialEndsAt: true,
      },
    });

    if (channel === 'whatsapp') {
      if (account && !account.canSendWhatsapp) {
        throw new ForbiddenException('WhatsApp is not enabled for your plan. Contact your administrator.');
      }
      if (account?.monthlyWhatsappLimit !== null && account?.monthlyWhatsappLimit !== undefined) {
        const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
        const used = await this.prisma.smsMessage.count({
          where: { accountId, direction: 'outbound', channel: 'whatsapp', createdAt: { gte: monthStart } },
        });
        if (used >= account.monthlyWhatsappLimit) {
          throw new ForbiddenException(`Monthly WhatsApp limit reached (${used}/${account.monthlyWhatsappLimit}).`);
        }
      }
    } else {
      if (account && !account.canSendSms) {
        throw new ForbiddenException('SMS sending is not enabled for your plan. Please upgrade.');
      }
      if (account?.isTrial && account.trialEndsAt && new Date(account.trialEndsAt) < new Date()) {
        throw new ForbiddenException('Your free trial has expired. Please upgrade to continue.');
      }
      if (account?.monthlySmsLimit !== null && account?.monthlySmsLimit !== undefined) {
        const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
        const used = await this.prisma.smsMessage.count({
          where: { accountId, direction: 'outbound', channel: 'sms', createdAt: { gte: monthStart } },
        });
        if (used >= account.monthlySmsLimit) {
          throw new ForbiddenException(`Monthly SMS limit reached (${used}/${account.monthlySmsLimit}). Please upgrade.`);
        }
      }
    }

    // Per-agent daily limit (100/day per channel)
    const AGENT_DAILY_LIMIT = 100;
    if (agentId) {
      const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
      const todayCount = await this.prisma.smsMessage.count({
        where: { agentId, direction: 'outbound', channel, createdAt: { gte: dayStart } },
      });
      if (todayCount >= AGENT_DAILY_LIMIT) {
        throw new ForbiddenException(`Daily ${channel.toUpperCase()} limit reached (${todayCount}/${AGENT_DAILY_LIMIT}). Resets at midnight.`);
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
      const msgBody: any = { to: formattedTo, from: formattedFrom, text: body };
      if (channel === 'whatsapp') msgBody.type = 'WhatsApp';

      const response = await fetch('https://api.telnyx.com/v2/messages', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(msgBody),
      });
      const json = await response.json() as any;
      if (!response.ok) {
        const detail = json?.errors?.[0]?.detail || 'Send failed';
        this.logger.error(`Telnyx ${channel} error: ${detail}`);
        status = 'failed';
      } else {
        telnyxMessageId = json?.data?.id || null;
      }
    } catch (err) {
      this.logger.error(`${channel} send exception: ${err.message}`);
      status = 'failed';
    }

    return this.prisma.smsMessage.create({
      data: { accountId, agentId, direction: 'outbound', fromNumber: formattedFrom, toNumber: formattedTo, body, status, telnyxMessageId, channel },
    });
  }

  async saveInbound(from: string, to: string, body: string, telnyxMessageId: string | null, accountId: string, channel: 'sms' | 'whatsapp' = 'sms') {
    return this.prisma.smsMessage.create({
      data: { accountId, agentId: null, direction: 'inbound', fromNumber: from, toNumber: to, body, status: 'received', telnyxMessageId, channel },
    });
  }

  async getConversations(accountId: string, agentId?: string, channel?: string) {
    const where: any = { accountId };
    if (channel) where.channel = channel;
    if (agentId) where.OR = [{ agentId }, { direction: 'inbound' }];

    const messages = await this.prisma.smsMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { agent: { select: { id: true, name: true } } },
    });

    const threads = new Map<string, any>();
    for (const msg of messages) {
      const contactNumber = msg.direction === 'outbound' ? msg.toNumber : msg.fromNumber;
      const key = `${contactNumber}:${msg.channel}`;
      if (!threads.has(key)) {
        threads.set(key, {
          contactNumber,
          channel: msg.channel,
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

  async getThread(contactNumber: string, accountId: string, channel?: string) {
    const formatted = contactNumber.startsWith('+')
      ? contactNumber
      : `+1${contactNumber.replace(/\D/g, '').slice(-10)}`;

    const where: any = {
      accountId,
      OR: [{ toNumber: formatted }, { fromNumber: formatted }],
    };
    if (channel) where.channel = channel;

    const messages = await this.prisma.smsMessage.findMany({
      where,
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
      channel: m.channel,
      createdAt: m.createdAt,
      agentId: m.agentId,
      agentName: (m as any).agent?.name ?? null,
    }));
  }

  async deleteConversation(contactNumber: string, accountId: string, channel?: string) {
    const formatted = contactNumber.startsWith('+')
      ? contactNumber
      : `+1${contactNumber.replace(/\D/g, '').slice(-10)}`;

    const where: any = {
      accountId,
      OR: [{ toNumber: formatted }, { fromNumber: formatted }],
    };
    if (channel) where.channel = channel;

    const result = await this.prisma.smsMessage.deleteMany({ where });
    return { deleted: result.count };
  }

  async findAccountByNumber(toNumber: string): Promise<string | null> {
    const user = await this.prisma.user.findFirst({
      where: { callerNumber: toNumber },
      select: { accountId: true },
    });
    return user?.accountId ?? null;
  }
}

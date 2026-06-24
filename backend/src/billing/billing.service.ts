import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { createHmac } from 'crypto';

const PLAN_FEATURES: Record<string, {
  canOutboundCall: boolean; canInboundCall: boolean; canSendSms: boolean;
  canRecord: boolean; canSendWhatsapp: boolean; canAiInsights: boolean;
}> = {
  Basic:    { canOutboundCall: true,  canInboundCall: true,  canSendSms: false, canRecord: false, canSendWhatsapp: false, canAiInsights: false },
  Pro:      { canOutboundCall: true,  canInboundCall: true,  canSendSms: true,  canRecord: true,  canSendWhatsapp: false, canAiInsights: false },
  Business: { canOutboundCall: true,  canInboundCall: true,  canSendSms: true,  canRecord: true,  canSendWhatsapp: true,  canAiInsights: true  },
};

@Injectable()
export class BillingService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  private get apiKey()        { return this.config.get<string>('LS_API_KEY'); }
  private get storeId()       { return this.config.get<string>('LS_STORE_ID'); }
  private get webhookSecret() { return this.config.get<string>('LS_WEBHOOK_SECRET'); }

  getVariantId(packageName: string, billingCycle: string): string {
    const key = `LS_VARIANT_${packageName.toUpperCase()}_${billingCycle.toUpperCase()}`;
    const variantId = this.config.get<string>(key);
    if (!variantId) throw new BadRequestException(`No variant configured for ${packageName} ${billingCycle}`);
    return variantId;
  }

  async createCheckout(
    accountId: string,
    packageName: string,
    billingCycle: string,
    seats: number,
    email: string,
    successUrl: string,
    cancelUrl: string,
  ): Promise<string> {
    const variantId = this.getVariantId(packageName, billingCycle);

    const body = {
      data: {
        type: 'checkouts',
        attributes: {
          checkout_data: {
            email,
            quantity: seats,
            custom: { accountId, packageName, billingCycle, seats: String(seats) },
          },
          product_options: { redirect_url: successUrl },
        },
        relationships: {
          store:   { data: { type: 'stores',  id: this.storeId } },
          variant: { data: { type: 'variants', id: variantId   } },
        },
      },
    };

    const res = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type':  'application/vnd.api+json',
        'Accept':        'application/vnd.api+json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new BadRequestException(`LemonSqueezy checkout error: ${err}`);
    }

    const data = await res.json();
    return data.data.attributes.url;
  }

  async activateAccount(
    accountId: string,
    packageName: string,
    billingCycle: string,
    seats: number,
    lsSubscriptionId: string,
    lsCustomerId: string,
    lsVariantId: string,
    periodEnd: Date | null,
    lsStatus: string = 'active',
    trialEndsAt: Date | null = null,
  ): Promise<void> {
    const features = PLAN_FEATURES[packageName];
    if (!features) return;

    const isOnTrial = lsStatus === 'on_trial';

    await this.prisma.account.update({
      where: { id: accountId },
      data: {
        status: 'ACTIVE',
        isTrial: isOnTrial,
        trialEndsAt: isOnTrial ? trialEndsAt : null,
        packageName,
        billingCycle,
        seatCount: seats,
        agentLimit: seats,
        lsSubscriptionId,
        lsCustomerId,
        lsVariantId,
        lsCurrentPeriodEnd: periodEnd,
        ...features,
        monthlyCallLimit: null,
        monthlySmsLimit: null,
      },
    });
  }

  async renewAccount(lsSubscriptionId: string, periodEnd: Date): Promise<void> {
    await this.prisma.account.updateMany({
      where: { lsSubscriptionId },
      data: { status: 'ACTIVE', isTrial: false, trialEndsAt: null, lsCurrentPeriodEnd: periodEnd },
    });
  }

  async deactivateAccount(lsSubscriptionId: string): Promise<void> {
    await this.prisma.account.updateMany({
      where: { lsSubscriptionId },
      data: { status: 'INACTIVE' },
    });
  }

  verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
    const secret = this.webhookSecret;
    if (!secret) return false;
    const hmac = createHmac('sha256', secret);
    hmac.update(rawBody);
    return hmac.digest('hex') === signature;
  }
}

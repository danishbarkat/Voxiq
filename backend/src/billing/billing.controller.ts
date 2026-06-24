import {
  Controller, Post, Body, Req, Headers,
  UnauthorizedException, BadRequestException, UseGuards,
} from '@nestjs/common';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Controller('billing')
export class BillingController {
  constructor(
    private billing: BillingService,
    private prisma: PrismaService,
  ) {}

  // Authenticated — existing admin upgrades plan from /admin dashboard
  @UseGuards(JwtAuthGuard)
  @Post('checkout')
  async createCheckout(
    @Body() body: { packageName: string; billingCycle: string; seats: number },
    @Req() req: any,
  ) {
    const accountId = req.user?.accountId;
    if (!accountId) throw new BadRequestException('Account not found');

    const user = await this.prisma.user.findFirst({
      where: { accountId },
      select: { email: true },
    });

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const successUrl = `${baseUrl}/billing/success?plan=${body.packageName}&seats=${body.seats}`;
    const cancelUrl  = `${baseUrl}/admin`;

    const checkoutUrl = await this.billing.createCheckout(
      accountId,
      body.packageName,
      body.billingCycle || 'monthly',
      body.seats || 1,
      user?.email || '',
      successUrl,
      cancelUrl,
    );

    return { checkoutUrl };
  }

  // Public — called right after OTP verify for brand-new accounts (status PENDING)
  @Public()
  @Post('checkout/new-user')
  async createNewUserCheckout(
    @Body() body: { accountId: string; packageName: string; billingCycle: string; seats: number },
  ) {
    if (!body.accountId) throw new BadRequestException('accountId required');

    const account = await this.prisma.account.findUnique({
      where: { id: body.accountId },
      select: { status: true, users: { select: { email: true }, take: 1 } },
    });
    if (!account) throw new BadRequestException('Account not found');
    if (account.status !== 'PENDING') throw new BadRequestException('Account is not pending setup');

    const email = account.users?.[0]?.email || '';
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const successUrl = `${baseUrl}/billing/success?plan=${body.packageName}&seats=${body.seats}&newuser=true`;
    const cancelUrl  = `${baseUrl}/signup`;

    const checkoutUrl = await this.billing.createCheckout(
      body.accountId,
      body.packageName || 'Basic',
      body.billingCycle || 'monthly',
      body.seats || 1,
      email,
      successUrl,
      cancelUrl,
    );

    return { checkoutUrl };
  }

  // Public — receives events from LemonSqueezy via webhook
  @Public()
  @Post('webhook')
  async handleWebhook(
    @Req() req: any,
    @Headers('x-signature') signature: string,
  ) {
    const rawBody: Buffer | undefined = req.rawBody;
    if (!rawBody || !signature) throw new UnauthorizedException('Missing signature');
    if (!this.billing.verifyWebhookSignature(rawBody, signature)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const payload        = JSON.parse(rawBody.toString());
    const eventName      = payload.meta?.event_name as string;
    const attrs          = payload.data?.attributes;
    const customData     = payload.meta?.custom_data || {};

    const lsSubscriptionId = String(payload.data?.id || '');
    const lsCustomerId     = String(attrs?.customer_id || '');
    const lsVariantId      = String(attrs?.variant_id  || '');
    const accountId        = customData.accountId as string | undefined;
    const packageName      = customData.packageName || attrs?.product_name || 'Basic';
    const billingCycle     = customData.billingCycle || 'monthly';
    const seats            = parseInt(customData.seats || String(attrs?.quantity ?? '1'), 10);
    const periodEnd        = attrs?.renews_at ? new Date(attrs.renews_at) : null;
    const lsStatus         = (attrs?.status as string) || 'active';
    const trialEndsAt      = attrs?.trial_ends_at ? new Date(attrs.trial_ends_at) : null;

    switch (eventName) {
      case 'subscription_created':
        if (accountId && (lsStatus === 'active' || lsStatus === 'on_trial')) {
          await this.billing.activateAccount(
            accountId, packageName, billingCycle, seats,
            lsSubscriptionId, lsCustomerId, lsVariantId, periodEnd,
            lsStatus, trialEndsAt,
          );
        }
        break;

      case 'subscription_updated':
        if (lsStatus === 'active') {
          if (accountId) {
            await this.billing.activateAccount(
              accountId, packageName, billingCycle, seats,
              lsSubscriptionId, lsCustomerId, lsVariantId, periodEnd,
              'active', null,
            );
          } else {
            await this.billing.renewAccount(lsSubscriptionId, periodEnd || new Date());
          }
        }
        break;

      case 'subscription_payment_success':
        if (lsSubscriptionId) {
          await this.billing.renewAccount(lsSubscriptionId, periodEnd || new Date());
        }
        break;

      case 'subscription_payment_failed':
      case 'subscription_cancelled':
      case 'subscription_expired':
        if (lsSubscriptionId) {
          await this.billing.deactivateAccount(lsSubscriptionId);
        }
        break;
    }

    return { received: true };
  }
}

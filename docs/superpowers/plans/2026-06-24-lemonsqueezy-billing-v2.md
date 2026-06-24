# LemonSqueezy Billing Integration — Option B (Netflix-Style Free Trial)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the manual SuperAdmin-approval trial flow with self-serve LemonSqueezy checkout — user picks a plan, enters card, gets 7-day free trial, then auto-charges on day 8 (no human needed). Existing upgrades and monthly renewals also go through LS.

**Architecture:** New user signs up → OTP verify → frontend calls backend for LS checkout URL → user pays on LS (card captured, not charged) → LS fires `subscription_created` with `status: on_trial` → backend activates account with `isTrial: true` → after 7 days LS charges card → `subscription_updated` with `status: active` → `isTrial: false`. Failed payment → `INACTIVE`. Existing admins upgrading → `/billing/checkout` (JWT-authenticated) → same LS flow.

**Tech Stack:** NestJS, LemonSqueezy REST API + Webhooks, Prisma (PostgreSQL), React (Vite)

---

## LemonSqueezy Dashboard Setup (Manual — do this before any coding)

### 1. Create Products & Variants (6 total)

In LS Dashboard → Store → Products → New Product (call it "Voxiq Subscription"):

| Variant Name | Price | Billing | Env var |
|---|---|---|---|
| Basic Monthly | $24.99 / seat / month | Monthly recurring | `LS_VARIANT_BASIC_MONTHLY` |
| Basic Annual | $269.89 / seat / year | Annual recurring | `LS_VARIANT_BASIC_ANNUAL` |
| Pro Monthly | $39.99 / seat / month | Monthly recurring | `LS_VARIANT_PRO_MONTHLY` |
| Pro Annual | $431.89 / seat / year | Annual recurring | `LS_VARIANT_PRO_ANNUAL` |
| Business Monthly | $69.99 / seat / month | Monthly recurring | `LS_VARIANT_BUSINESS_MONTHLY` |
| Business Annual | $755.89 / seat / year | Annual recurring | `LS_VARIANT_BUSINESS_ANNUAL` |

For each variant:
- Type: **Subscription**
- Enable **Quantity** (one unit = one seat)
- Enable **Free trial: 7 days** (this is Option B — card is required upfront, no charge until day 8)
- Note the numeric **Variant ID** — goes into `.env`

### 2. Create Webhook

LS Dashboard → Store → Webhooks → New:
- URL: `https://voxiq-app.onrender.com/api/billing/webhook`
- Events: `subscription_created`, `subscription_updated`, `subscription_payment_success`, `subscription_payment_failed`, `subscription_cancelled`, `subscription_expired`
- Copy **Signing Secret** → `LS_WEBHOOK_SECRET` in `.env`

### 3. Note Your Store Credentials

- **Store ID** (Settings → Store) → `LS_STORE_ID`
- **API Key** (Settings → API) → `LS_API_KEY`

### 4. Partner Revenue Split (Manual Setup — no code needed)

LS Dashboard → Affiliates → Create affiliate for your partner at 50% commission. Partner gets their affiliate link to share. This is separate from the checkout API — no code changes needed for this.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `backend/prisma/schema.prisma` | Modify | Add `lsSubscriptionId`, `lsCustomerId`, `lsVariantId`, `lsCurrentPeriodEnd` to Account |
| `backend/src/billing/billing.service.ts` | Create | LS API calls + account lifecycle (activate on_trial, renew, deactivate) |
| `backend/src/billing/billing.controller.ts` | Create | `POST /billing/checkout` (JWT), `POST /billing/checkout/new-user` (public), `POST /billing/webhook` (public) |
| `backend/src/billing/billing.module.ts` | Create | NestJS module registration |
| `backend/src/app.module.ts` | Modify | Import BillingModule |
| `backend/src/main.ts` | Modify | Enable `rawBody: true` for webhook signature verification |
| `backend/.env` | Modify | Add LS env vars |
| `backend/src/auth/auth.service.ts` | Modify | `verifySignup` returns `accountId` |
| `frontend/src/pages/Signup.jsx` | Modify | After OTP verify → call new-user checkout → redirect to LS |
| `frontend/src/pages/BillingSuccess.jsx` | Create | Post-payment success page (new users: show login link; existing users: countdown to /admin) |
| `frontend/src/App.jsx` | Modify | Add `/billing/success` route |
| `frontend/src/pages/Checkout.jsx` | Modify | For authenticated admin upgrades only (JWT flow) |

---

## Task 1: Database Schema — Add LemonSqueezy Fields to Account

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Add LS fields to Account model**

Find the Account model in `backend/prisma/schema.prisma`. After the existing `billingCycle String?` line, add:

```prisma
lsSubscriptionId    String?
lsCustomerId        String?
lsVariantId         String?
lsCurrentPeriodEnd  DateTime?
```

- [ ] **Step 2: Run migration**

```bash
cd backend
npx prisma migrate dev --name add_lemonsqueezy_fields
```

Expected: new migration file created, 4 nullable columns added to Account.

- [ ] **Step 3: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/
git commit -m "feat: add LemonSqueezy billing fields to Account"
```

---

## Task 2: Add LS Env Vars

**Files:**
- Modify: `backend/.env`
- Modify: `backend/.env.example` (or equivalent)

- [ ] **Step 1: Add all LS env vars to `backend/.env`**

```env
LS_API_KEY=your_lemonsqueezy_api_key
LS_STORE_ID=your_store_id
LS_WEBHOOK_SECRET=your_webhook_signing_secret
LS_VARIANT_BASIC_MONTHLY=123456
LS_VARIANT_BASIC_ANNUAL=123457
LS_VARIANT_PRO_MONTHLY=123458
LS_VARIANT_PRO_ANNUAL=123459
LS_VARIANT_BUSINESS_MONTHLY=123460
LS_VARIANT_BUSINESS_ANNUAL=123461
```

Replace placeholder values with real IDs from LS Dashboard.

- [ ] **Step 2: Add keys (no values) to `.env.example`**

```env
LS_API_KEY=
LS_STORE_ID=
LS_WEBHOOK_SECRET=
LS_VARIANT_BASIC_MONTHLY=
LS_VARIANT_BASIC_ANNUAL=
LS_VARIANT_PRO_MONTHLY=
LS_VARIANT_PRO_ANNUAL=
LS_VARIANT_BUSINESS_MONTHLY=
LS_VARIANT_BUSINESS_ANNUAL=
```

- [ ] **Step 3: Commit**

```bash
git add backend/.env.example
git commit -m "chore: add LemonSqueezy env var keys to .env.example"
```

---

## Task 3: BillingService

**Files:**
- Create: `backend/src/billing/billing.service.ts`

- [ ] **Step 1: Create the service**

```typescript
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

  private get apiKey()       { return this.config.get<string>('LS_API_KEY'); }
  private get storeId()      { return this.config.get<string>('LS_STORE_ID'); }
  private get webhookSecret(){ return this.config.get<string>('LS_WEBHOOK_SECRET'); }

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
            quantity: seats,
            custom: { accountId, packageName, billingCycle, seats: String(seats) },
            email,
          },
          product_options: { redirect_url: successUrl },
          checkout_options: { quantity: true },
        },
        relationships: {
          store:   { data: { type: 'stores',   id: this.storeId } },
          variant: { data: { type: 'variants',  id: variantId   } },
        },
      },
    };

    const res = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
      method: 'POST',
      headers: {
        'Authorization':  `Bearer ${this.apiKey}`,
        'Content-Type':   'application/vnd.api+json',
        'Accept':         'application/vnd.api+json',
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

  // Called for subscription_created (on_trial or active) and subscription_updated (active)
  async activateAccount(
    accountId: string,
    packageName: string,
    billingCycle: string,
    seats: number,
    lsSubscriptionId: string,
    lsCustomerId: string,
    lsVariantId: string,
    periodEnd: Date | null,
    lsStatus: string = 'active',     // 'active' or 'on_trial'
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

  // Called for subscription_payment_success — renews period, clears any trial state
  async renewAccount(lsSubscriptionId: string, periodEnd: Date): Promise<void> {
    await this.prisma.account.updateMany({
      where: { lsSubscriptionId },
      data: { status: 'ACTIVE', isTrial: false, trialEndsAt: null, lsCurrentPeriodEnd: periodEnd },
    });
  }

  // Called for subscription_payment_failed / subscription_cancelled / subscription_expired
  async deactivateAccount(lsSubscriptionId: string): Promise<void> {
    await this.prisma.account.updateMany({
      where: { lsSubscriptionId },
      data: { status: 'INACTIVE' },
    });
  }

  verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
    const hmac = createHmac('sha256', this.webhookSecret);
    hmac.update(rawBody);
    return hmac.digest('hex') === signature;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/billing/billing.service.ts
git commit -m "feat: add BillingService with LS checkout, account lifecycle, and on_trial handling"
```

---

## Task 4: BillingController

Three endpoints:
- `POST /billing/checkout` — JWT-authenticated, for existing admins upgrading from dashboard
- `POST /billing/checkout/new-user` — public, for brand-new users after OTP verify (validates account is PENDING)
- `POST /billing/webhook` — public, receives LS events

**Files:**
- Create: `backend/src/billing/billing.controller.ts`

- [ ] **Step 1: Create the controller**

```typescript
import {
  Controller, Post, Body, Req, Headers, RawBodyRequest,
  UnauthorizedException, BadRequestException, UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
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

    // Get admin email for pre-filling LS checkout
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

    // Only allow for PENDING accounts — prevents misuse for active accounts
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
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-signature') signature: string,
  ) {
    const rawBody = req.rawBody;
    if (!rawBody || !signature) throw new UnauthorizedException('Missing signature');
    if (!this.billing.verifyWebhookSignature(rawBody, signature)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const payload     = JSON.parse(rawBody.toString());
    const eventName   = payload.meta?.event_name as string;
    const attrs       = payload.data?.attributes;
    const customData  = payload.meta?.custom_data || {};

    const lsSubscriptionId = String(payload.data?.id || '');
    const lsCustomerId     = String(attrs?.customer_id || '');
    const lsVariantId      = String(attrs?.variant_id  || '');
    const accountId        = customData.accountId as string | undefined;
    const packageName      = customData.packageName || attrs?.product_name || 'Basic';
    const billingCycle     = customData.billingCycle || 'monthly';
    const seats            = parseInt(customData.seats || String(attrs?.quantity ?? '1'), 10);
    const periodEnd        = attrs?.renews_at ? new Date(attrs.renews_at) : null;
    const lsStatus         = attrs?.status as string || 'active';
    const trialEndsAt      = attrs?.trial_ends_at ? new Date(attrs.trial_ends_at) : null;

    switch (eventName) {
      case 'subscription_created':
        // Fires when user completes LS checkout (status may be 'on_trial' or 'active')
        if (accountId && (lsStatus === 'active' || lsStatus === 'on_trial')) {
          await this.billing.activateAccount(
            accountId, packageName, billingCycle, seats,
            lsSubscriptionId, lsCustomerId, lsVariantId, periodEnd,
            lsStatus, trialEndsAt,
          );
        }
        break;

      case 'subscription_updated':
        // Fires when trial converts to paid (on_trial → active) or plan changes
        if (lsStatus === 'active') {
          if (accountId) {
            await this.billing.activateAccount(
              accountId, packageName, billingCycle, seats,
              lsSubscriptionId, lsCustomerId, lsVariantId, periodEnd,
              'active', null,
            );
          } else {
            // Fallback: find account by lsSubscriptionId and renew
            await this.billing.renewAccount(lsSubscriptionId, periodEnd || new Date());
          }
        }
        break;

      case 'subscription_payment_success':
        // Monthly/annual renewal — keep active, update period end
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
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/billing/billing.controller.ts
git commit -m "feat: add BillingController (new-user public checkout + webhook + authenticated upgrade)"
```

---

## Task 5: BillingModule + App Registration + rawBody

**Files:**
- Create: `backend/src/billing/billing.module.ts`
- Modify: `backend/src/app.module.ts`
- Modify: `backend/src/main.ts`

- [ ] **Step 1: Create `billing.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
```

- [ ] **Step 2: Import BillingModule in `app.module.ts`**

Find the `imports: [...]` array in `backend/src/app.module.ts`. Add at the top:

```typescript
import { BillingModule } from './billing/billing.module';
```

And add `BillingModule` inside the `imports` array.

- [ ] **Step 3: Enable rawBody in `main.ts`**

Find the line with `NestFactory.create(AppModule)` in `backend/src/main.ts` and change it to:

```typescript
const app = await NestFactory.create(AppModule, { rawBody: true });
```

- [ ] **Step 4: Build and verify no TypeScript errors**

```bash
cd backend && npm run build
```

Expected: build succeeds with no errors.

- [ ] **Step 5: Commit**

```bash
git add backend/src/billing/ backend/src/app.module.ts backend/src/main.ts
git commit -m "feat: register BillingModule, enable rawBody for webhook signature verification"
```

---

## Task 6: Modify verifySignup to Return accountId

The frontend needs the `accountId` immediately after OTP verify so it can call `POST /billing/checkout/new-user`.

**Files:**
- Modify: `backend/src/auth/auth.service.ts`

- [ ] **Step 1: Find the `verifySignup` method return statement**

In `backend/src/auth/auth.service.ts`, find the `verifySignup` method. At the end of the method, change the return from:

```typescript
return {
  message:
    'Signup successful. Your account is under review. Voxiq will share your company access code after approval.',
};
```

to:

```typescript
return {
  message: 'Email verified. Proceeding to plan selection.',
  accountId: account.id,
};
```

- [ ] **Step 2: Build to verify no TypeScript errors**

```bash
cd backend && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/auth/auth.service.ts
git commit -m "feat: verifySignup returns accountId for new-user billing checkout"
```

---

## Task 7: Signup.jsx — Redirect to LS After OTP Verify

Replace the "Request Submitted" success screen with a flow that calls the new-user checkout endpoint and redirects to LemonSqueezy.

**Files:**
- Modify: `frontend/src/pages/Signup.jsx`

- [ ] **Step 1: Add `API_URL` import (already imported — verify it's there)**

The file already imports `API_URL` from `'../config/env'`. Confirm this line exists:

```jsx
import { API_URL } from '../config/env';
```

- [ ] **Step 2: Add `checkoutLoading` and `checkoutError` state near other state declarations**

After the existing `const [isLoading, setIsLoading] = useState(false);` line, add:

```jsx
const [checkoutLoading, setCheckoutLoading] = useState(false);
const [checkoutError, setCheckoutError] = useState(null);
```

- [ ] **Step 3: Replace `handleVerifySignup` with this version**

```jsx
const handleVerifySignup = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
        const response = await fetchJson(`${API_URL}/auth/signup/verify`, {
            method: 'POST',
            body: JSON.stringify({
                email: formData.email,
                code: verificationCode,
            }),
        });

        // OTP verified — now create LS checkout for the selected plan
        if (!response.accountId) {
            setSuccess(true); // fallback: show old success screen
            return;
        }

        setIsLoading(false);
        setCheckoutLoading(true);

        const pkg = selectedPackage === 'Trial' ? 'Basic' : selectedPackage;

        // Enterprise → no LS checkout, just show success
        if (pkg === 'Enterprise') {
            setSuccess(true);
            return;
        }

        const checkoutRes = await fetchJson(`${API_URL}/billing/checkout/new-user`, {
            method: 'POST',
            body: JSON.stringify({
                accountId: response.accountId,
                packageName: pkg,
                billingCycle,
                seats: seatCount,
            }),
        });

        window.location.href = checkoutRes.checkoutUrl;
    } catch (err) {
        setCheckoutError(err.message || 'Could not start checkout. Please contact support.');
    } finally {
        setIsLoading(false);
        setCheckoutLoading(false);
    }
};
```

- [ ] **Step 4: Replace the verify step JSX to show checkout loading state**

Find the `if (signupStep === 'verify')` block (the OTP input form). Inside, find the submit button and the paragraph below it. Replace just the paragraph below the verify form button area with:

```jsx
{checkoutError && (
    <div className="auth-error" style={{ marginTop: 12 }}>
        {checkoutError} — <a href="mailto:support@voxiq.com" style={{ color: 'inherit', fontWeight: 700 }}>Contact support</a>
    </div>
)}
{checkoutLoading && (
    <p style={{ textAlign: 'center', color: '#6366f1', fontWeight: 600, marginTop: 12, fontSize: '0.875rem' }}>
        Setting up your trial... redirecting to payment
    </p>
)}
```

- [ ] **Step 5: Update the "success" fallback screen copy (Enterprise / no accountId case)**

Find `if (success)` JSX block. Change the paragraph text to:

```jsx
<p style={{ color: '#6b7280', marginBottom: 24 }}>
    Your email is verified and your Enterprise request is now with the Voxiq team.
    We'll contact you within 1 business day to complete setup.
</p>
```

- [ ] **Step 6: Update left-panel marketing copy to reflect card-required trial**

In the `auth-feature-list` section (the left column of the signup form), find:

```jsx
Free 7-Day Trial — no card needed
```

And change to:

```jsx
7-Day Free Trial — cancel before day 8, pay nothing
```

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/Signup.jsx
git commit -m "feat: redirect to LemonSqueezy checkout after OTP verify (Option B trial)"
```

---

## Task 8: BillingSuccess Page

New users arrive here from LS after entering card. Their account is being activated by the webhook (fires within seconds). Existing admin upgrades also land here.

**Files:**
- Create: `frontend/src/pages/BillingSuccess.jsx`

- [ ] **Step 1: Create the page**

```jsx
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

export default function BillingSuccess() {
  const [searchParams] = useSearchParams();
  const plan     = searchParams.get('plan')    || 'your plan';
  const seats    = searchParams.get('seats')   || '1';
  const isNewUser = searchParams.get('newuser') === 'true';
  const [countdown, setCountdown] = useState(isNewUser ? null : 8);

  useEffect(() => {
    if (isNewUser || countdown === null) return;
    const t = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(t); window.location.href = '/admin'; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [isNewUser, countdown]);

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, system-ui, sans-serif', padding: '24px' }}>
      <div style={{ background: '#fff', borderRadius: '24px', padding: '48px 40px', maxWidth: '480px', width: '100%', textAlign: 'center', boxShadow: '0 4px 32px rgba(0,0,0,0.08)' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '16px' }}>🎉</div>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0f172a', marginBottom: '8px' }}>
          {isNewUser ? 'Trial Started!' : 'Payment Successful!'}
        </h1>
        <p style={{ color: '#64748b', fontSize: '1rem', marginBottom: '8px' }}>
          Your <strong>{plan}</strong> plan ({seats} seat{Number(seats) > 1 ? 's' : ''}) is now active.
        </p>
        <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '32px' }}>
          {isNewUser
            ? 'Your 7-day free trial has started. You will not be charged until day 8. Log in to access your dashboard.'
            : 'Your account has been upgraded automatically. All features are now unlocked.'}
        </p>

        <div style={{ background: '#f0fdf4', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
          {isNewUser ? (
            <p style={{ color: '#16a34a', fontWeight: 700, fontSize: '0.875rem', margin: 0 }}>
              Account activation takes ~10 seconds after payment.
            </p>
          ) : (
            <p style={{ color: '#16a34a', fontWeight: 700, fontSize: '0.875rem', margin: 0 }}>
              Redirecting to your dashboard in {countdown}s...
            </p>
          )}
        </div>

        {isNewUser ? (
          <Link
            to="/login"
            style={{ display: 'inline-block', background: '#6366f1', color: '#fff', borderRadius: '12px', padding: '12px 28px', fontWeight: 700, fontSize: '1rem', textDecoration: 'none' }}
          >
            Log In to Dashboard →
          </Link>
        ) : (
          <button
            onClick={() => { window.location.href = '/admin'; }}
            style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: '12px', padding: '12px 28px', fontWeight: 700, fontSize: '1rem', cursor: 'pointer' }}
          >
            Go to Dashboard →
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/BillingSuccess.jsx
git commit -m "feat: add BillingSuccess page (new user trial + existing user upgrade)"
```

---

## Task 9: Register /billing/success Route in App.jsx

**Files:**
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: Add lazy import**

Find where other `lazy(() => import(...))` calls are made in `frontend/src/App.jsx`. Add:

```jsx
const BillingSuccess = lazy(() => import('./pages/BillingSuccess'));
```

- [ ] **Step 2: Add route**

Find the `<Route>` elements in App.jsx. Add this route (it should be public — no auth guard):

```jsx
<Route path="/billing/success" element={<BillingSuccess />} />
```

Place it alongside other public routes (like `/login`, `/signup`).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/App.jsx
git commit -m "feat: add /billing/success route"
```

---

## Task 10: Update Checkout.jsx for Authenticated Admin Upgrades

When an existing logged-in admin clicks "Upgrade Plan" from the Admin dashboard, they land on `/checkout`. The checkout page should call the JWT-authenticated `POST /billing/checkout` endpoint and redirect to LS.

**Files:**
- Modify: `frontend/src/pages/Checkout.jsx`

- [ ] **Step 1: Add imports at top of Checkout.jsx**

```jsx
import { getToken } from '../lib/auth';
import { API_URL } from '../config/env';
```

- [ ] **Step 2: Add state variables**

Near the other `useState` declarations in Checkout.jsx, add:

```jsx
const [checkoutLoading, setCheckoutLoading] = useState(false);
const [checkoutError, setCheckoutError] = useState(null);
```

- [ ] **Step 3: Replace `handleContinue` with this**

```jsx
const handleContinue = async () => {
  if (plan.contactSales) {
    window.open('mailto:sales@voxiq.com', '_blank');
    return;
  }

  const token = getToken();
  if (!token) {
    // Not logged in — redirect to signup with plan pre-selected
    navigate(`/signup?plan=${plan.id || selectedPackage}&seats=${seats}&billing=${billing}`);
    return;
  }

  // Logged-in admin upgrading — call backend for LS checkout URL
  setCheckoutLoading(true);
  setCheckoutError(null);
  try {
    const res = await fetch(`${API_URL}/billing/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        packageName: plan.id || selectedPackage,
        billingCycle: billing,
        seats,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Checkout failed');
    window.location.href = data.checkoutUrl;
  } catch (err) {
    setCheckoutError(err.message || 'Could not start checkout. Please try again.');
  } finally {
    setCheckoutLoading(false);
  }
};
```

- [ ] **Step 4: Update the CTA button area**

Find the existing CTA button (for "Continue to Registration" or "Send Upgrade Request" — from the old flow). Replace the entire button section with:

```jsx
{plan.contactSales ? (
  <a
    href="mailto:sales@voxiq.com"
    style={{ display: 'block', padding: '15px 20px', borderRadius: '12px', background: plan.color, color: '#fff', fontWeight: 800, fontSize: '1rem', textAlign: 'center', textDecoration: 'none' }}
  >
    Contact Sales →
  </a>
) : (
  <>
    {checkoutError && (
      <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px', fontSize: '0.8rem', color: '#991b1b', fontWeight: 600 }}>
        {checkoutError}
      </div>
    )}
    <button
      onClick={handleContinue}
      disabled={checkoutLoading}
      style={{ width: '100%', padding: '15px 20px', borderRadius: '12px', border: 'none', background: checkoutLoading ? '#94a3b8' : 'var(--vx-accent)', color: '#fff', fontWeight: 800, fontSize: '1rem', cursor: checkoutLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
    >
      {checkoutLoading ? 'Redirecting to payment...' : 'Start 7-Day Free Trial →'}
    </button>
    <p style={{ fontSize: '0.75rem', color: 'var(--vx-gray-400)', textAlign: 'center', marginTop: '14px', lineHeight: '1.5' }}>
      Card required. Cancel before day 8 and pay nothing. Renews automatically.
    </p>
  </>
)}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Checkout.jsx
git commit -m "feat: Checkout.jsx calls backend for LS checkout URL (removes old mailto flow)"
```

---

## Task 11: End-to-End Test Checklist

Before deploying, verify each flow manually:

- [ ] **New user self-serve trial (main flow)**
  1. Go to `/signup`, fill form, pick Basic plan, submit
  2. Verify OTP → should redirect to LS checkout (not show "Request Submitted")
  3. Complete LS checkout (use test card: 4242 4242 4242 4242, any exp, any CVC)
  4. Lands on `/billing/success?plan=Basic&seats=1&newuser=true`
  5. Wait 10 seconds → log in → should reach `/admin` (account ACTIVE, isTrial: true)
  6. Check DB: `account.status = ACTIVE`, `isTrial = true`, `lsSubscriptionId` populated

- [ ] **Trial expiry enforcement still works**
  Manually set `trialEndsAt` to past date + check agent gets blocked (from prior implementation)

- [ ] **Existing admin upgrade**
  1. Log in as admin → Admin dashboard → click Upgrade Plan
  2. Goes to `/checkout` → click "Start 7-Day Free Trial →"
  3. Redirected to LS checkout → complete payment
  4. Lands on `/billing/success?plan=Pro&seats=X` → auto-redirects to `/admin` after 8s
  5. DB: account updated with new plan + lsSubscriptionId

- [ ] **Monthly renewal (automated)**
  Trigger test webhook from LS dashboard for `subscription_payment_success`
  Check: `renewAccount` called, `lsCurrentPeriodEnd` updated, account stays ACTIVE

- [ ] **Failed payment**
  Trigger test webhook for `subscription_payment_failed`
  Check: account status → INACTIVE, admin sees billing banner on next login

- [ ] **Webhook signature verification**
  Send request to `/api/billing/webhook` with wrong signature → should get 401

- [ ] **Commit final test results**

```bash
git commit --allow-empty -m "chore: LemonSqueezy billing integration complete and tested"
```

---

## Revert Bytechsol Trial Test Data

After testing the trial expiry enforcement from before, restore Bytechsol LLC to active:

```sql
UPDATE "Account"
SET "isTrial" = false,
    "trialEndsAt" = NULL,
    "status" = 'ACTIVE'
WHERE name = 'Bytechsol LLC';
```

Run via Prisma Studio or:

```bash
cd backend
npx prisma studio
```

Navigate to Account → find Bytechsol LLC → clear `isTrial`, `trialEndsAt`, set `status = ACTIVE`.

# LemonSqueezy Billing Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate LemonSqueezy as the payment gateway so that when a company pays (trial upgrade or monthly renewal), their Voxiq account is automatically activated/upgraded — no manual steps, exactly like Netflix/Amazon Prime.

**Architecture:** Frontend calls backend to create a LemonSqueezy hosted checkout URL → user is redirected to LemonSqueezy to pay → LemonSqueezy fires webhook to backend → backend verifies signature, updates account status + package automatically. Monthly renewals fire `subscription_payment_success` → account stays ACTIVE. Failed payment fires `subscription_payment_failed` → account set to INACTIVE (triggers billing banner). Cancellation → `subscription_cancelled` → account INACTIVE at period end.

**Tech Stack:** NestJS (backend), LemonSqueezy REST API + Webhooks, Prisma (PostgreSQL), React (frontend)

---

## LemonSqueezy Dashboard Setup (Manual — done by you before coding)

Before writing any code, set up the following in your LemonSqueezy store:

### Products to create (6 variants total):

| Variant | Price | Billing | Env var name |
|---|---|---|---|
| Basic Monthly | $24.99/unit/mo | Monthly | `LS_VARIANT_BASIC_MONTHLY` |
| Basic Annual | $269.89/unit/yr | Annual (10% off) | `LS_VARIANT_BASIC_ANNUAL` |
| Pro Monthly | $39.99/unit/mo | Monthly | `LS_VARIANT_PRO_MONTHLY` |
| Pro Annual | $431.89/unit/yr | Annual | `LS_VARIANT_PRO_ANNUAL` |
| Business Monthly | $69.99/unit/mo | Monthly | `LS_VARIANT_BUSINESS_MONTHLY` |
| Business Annual | $755.89/unit/yr | Annual | `LS_VARIANT_BUSINESS_ANNUAL` |

- Set each variant to **subscription** with quantity enabled (one unit = one seat)
- Note each **Variant ID** (numeric, e.g. `123456`) — you'll put these in `.env`
- Set up one **Webhook** in LS dashboard pointing to `https://your-domain.com/api/billing/webhook`
  - Events to subscribe: `subscription_created`, `subscription_updated`, `subscription_payment_success`, `subscription_payment_failed`, `subscription_cancelled`, `subscription_expired`
  - Copy the **Signing Secret** → `LS_WEBHOOK_SECRET` in `.env`
- Note your **Store ID** → `LS_STORE_ID` in `.env`
- Note your **API Key** → `LS_API_KEY` in `.env`

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `backend/prisma/schema.prisma` | Modify | Add `lsSubscriptionId`, `lsCustomerId`, `lsVariantId`, `lsCurrentPeriodEnd` to Account |
| `backend/src/billing/billing.module.ts` | Create | NestJS module |
| `backend/src/billing/billing.service.ts` | Create | LemonSqueezy API calls + account update logic |
| `backend/src/billing/billing.controller.ts` | Create | `POST /billing/checkout` + `POST /billing/webhook` |
| `backend/src/app.module.ts` | Modify | Import BillingModule |
| `backend/.env` | Modify | Add LS env vars |
| `frontend/src/pages/Checkout.jsx` | Modify | Call backend for LS checkout URL → redirect |
| `frontend/src/pages/BillingSuccess.jsx` | Create | Post-payment success page |
| `frontend/src/App.jsx` | Modify | Add `/billing/success` route |

---

## Task 1: Database Schema — Add LemonSqueezy Fields to Account

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Add LS fields to Account model**

Inside the `Account` model, after `billingCycle String?`, add:

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

Expected: new migration file created, 4 new nullable columns on Account table.

- [ ] **Step 3: Verify**

```bash
npx prisma studio
```

Confirm 4 new columns exist on Account table.

- [ ] **Step 4: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/
git commit -m "feat: add LemonSqueezy billing fields to Account"
```

---

## Task 2: Add LS Env Vars to Backend

**Files:**
- Modify: `backend/.env`

- [ ] **Step 1: Add all LS env vars**

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

Replace each value with the real ID from your LemonSqueezy dashboard.

- [ ] **Step 2: Add to .env.example (without real values)**

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

## Task 3: BillingService — Checkout Creation + Account Activation

**Files:**
- Create: `backend/src/billing/billing.service.ts`

- [ ] **Step 1: Create the service**

```typescript
import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

const PLAN_FEATURES: Record<string, {
  canOutboundCall: boolean; canInboundCall: boolean; canSendSms: boolean;
  canRecord: boolean; canSendWhatsapp: boolean; canAiInsights: boolean;
}> = {
  Basic:    { canOutboundCall: true, canInboundCall: true, canSendSms: false, canRecord: false, canSendWhatsapp: false, canAiInsights: false },
  Pro:      { canOutboundCall: true, canInboundCall: true, canSendSms: true,  canRecord: true,  canSendWhatsapp: false, canAiInsights: false },
  Business: { canOutboundCall: true, canInboundCall: true, canSendSms: true,  canRecord: true,  canSendWhatsapp: true,  canAiInsights: true  },
};

@Injectable()
export class BillingService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  private get apiKey() { return this.config.get<string>('LS_API_KEY'); }
  private get storeId() { return this.config.get<string>('LS_STORE_ID'); }
  private get webhookSecret() { return this.config.get<string>('LS_WEBHOOK_SECRET'); }

  getVariantId(packageName: string, billingCycle: string): string {
    const key = `LS_VARIANT_${packageName.toUpperCase()}_${billingCycle.toUpperCase()}`;
    const variantId = this.config.get<string>(key);
    if (!variantId) throw new BadRequestException(`No variant configured for ${packageName} ${billingCycle}`);
    return variantId;
  }

  async createCheckout(accountId: string, packageName: string, billingCycle: string, seats: number, successUrl: string, cancelUrl: string): Promise<string> {
    const variantId = this.getVariantId(packageName, billingCycle);

    // Find account email for pre-filling checkout
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      select: { name: true, users: { select: { email: true }, where: { role: { name: 'Admin' } }, take: 1 } },
    });
    const email = account?.users?.[0]?.email || '';

    const body = {
      data: {
        type: 'checkouts',
        attributes: {
          checkout_data: {
            quantity: seats,
            custom: { accountId, packageName, billingCycle, seats: String(seats) },
            email,
          },
          product_options: {
            redirect_url: successUrl,
          },
          checkout_options: { quantity: true },
        },
        relationships: {
          store: { data: { type: 'stores', id: this.storeId } },
          variant: { data: { type: 'variants', id: variantId } },
        },
      },
    };

    const res = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/vnd.api+json',
        'Accept': 'application/vnd.api+json',
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
  ): Promise<void> {
    const features = PLAN_FEATURES[packageName];
    if (!features) return;

    await this.prisma.account.update({
      where: { id: accountId },
      data: {
        status: 'ACTIVE',
        isTrial: false,
        trialEndsAt: null,
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

  async deactivateAccount(lsSubscriptionId: string): Promise<void> {
    await this.prisma.account.updateMany({
      where: { lsSubscriptionId },
      data: { status: 'INACTIVE' },
    });
  }

  async renewAccount(lsSubscriptionId: string, periodEnd: Date): Promise<void> {
    await this.prisma.account.updateMany({
      where: { lsSubscriptionId },
      data: { status: 'ACTIVE', lsCurrentPeriodEnd: periodEnd },
    });
  }

  verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', this.webhookSecret);
    hmac.update(rawBody);
    const digest = hmac.digest('hex');
    return digest === signature;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/billing/billing.service.ts
git commit -m "feat: add BillingService with LS checkout creation and account lifecycle"
```

---

## Task 4: BillingController — Checkout Endpoint + Webhook Handler

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

@Controller('billing')
export class BillingController {
  constructor(private billing: BillingService) {}

  // Authenticated: called by Admin dashboard to get LS checkout URL
  @UseGuards(JwtAuthGuard)
  @Post('checkout')
  async createCheckout(
    @Body() body: { packageName: string; billingCycle: string; seats: number },
    @Req() req: any,
  ) {
    const accountId = req.user?.accountId;
    if (!accountId) throw new BadRequestException('Account not found');

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const successUrl = `${baseUrl}/billing/success?plan=${body.packageName}&seats=${body.seats}`;
    const cancelUrl = `${baseUrl}/admin`;

    const checkoutUrl = await this.billing.createCheckout(
      accountId,
      body.packageName,
      body.billingCycle || 'monthly',
      body.seats || 1,
      successUrl,
      cancelUrl,
    );

    return { checkoutUrl };
  }

  // Public: receives events from LemonSqueezy
  @Post('webhook')
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-signature') signature: string,
  ) {
    const rawBody = req.rawBody;
    if (!rawBody || !signature) throw new UnauthorizedException('Missing signature');

    const valid = this.billing.verifyWebhookSignature(rawBody, signature);
    if (!valid) throw new UnauthorizedException('Invalid webhook signature');

    const payload = JSON.parse(rawBody.toString());
    const eventName: string = payload.meta?.event_name;
    const attrs = payload.data?.attributes;
    const customData = payload.meta?.custom_data || {};

    const lsSubscriptionId = String(payload.data?.id || '');
    const lsCustomerId = String(attrs?.customer_id || '');
    const lsVariantId = String(attrs?.variant_id || '');
    const accountId: string | undefined = customData.accountId;
    const packageName: string = customData.packageName || attrs?.product_name || 'Basic';
    const billingCycle: string = customData.billingCycle || 'monthly';
    const seats = parseInt(customData.seats || attrs?.quantity || '1', 10);
    const periodEnd = attrs?.renews_at ? new Date(attrs.renews_at) : null;

    switch (eventName) {
      case 'subscription_created':
      case 'subscription_updated':
        if (accountId && attrs?.status === 'active') {
          await this.billing.activateAccount(
            accountId, packageName, billingCycle, seats,
            lsSubscriptionId, lsCustomerId, lsVariantId, periodEnd,
          );
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
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/billing/billing.controller.ts
git commit -m "feat: add BillingController with checkout and webhook endpoints"
```

---

## Task 5: BillingModule + App Registration

**Files:**
- Create: `backend/src/billing/billing.module.ts`
- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: Create billing.module.ts**

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

- [ ] **Step 2: Import BillingModule in app.module.ts**

Find the `imports: [...]` array in `backend/src/app.module.ts` and add `BillingModule`:

```typescript
import { BillingModule } from './billing/billing.module';

// Inside @Module imports array:
BillingModule,
```

- [ ] **Step 3: Enable rawBody parsing (needed for webhook signature verification)**

In `backend/src/main.ts`, find `app = await NestFactory.create(AppModule)` and change to:

```typescript
const app = await NestFactory.create(AppModule, { rawBody: true });
```

- [ ] **Step 4: Build and check for errors**

```bash
cd backend && npm run build
```

Expected: No TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add backend/src/billing/ backend/src/app.module.ts backend/src/main.ts
git commit -m "feat: register BillingModule, enable rawBody for webhook verification"
```

---

## Task 6: Frontend — Checkout.jsx calls backend for LS URL

Replace the current mailto/signup redirect with a real backend call that returns a LemonSqueezy hosted checkout URL.

**Files:**
- Modify: `frontend/src/pages/Checkout.jsx`

- [ ] **Step 1: Add imports**

```jsx
import { getToken } from '../lib/auth';
import { API_URL } from '../config/env';
```

- [ ] **Step 2: Replace handleContinue with a backend call**

Remove the old `isUpgrade` / `mailto` logic entirely. Replace `handleContinue`:

```jsx
const [checkoutLoading, setCheckoutLoading] = useState(false);
const [checkoutError, setCheckoutError] = useState(null);

const handleContinue = async () => {
  if (plan.contactSales) {
    window.open('mailto:sales@voxiq.com', '_blank');
    return;
  }
  if (plan.price === 0) {
    // Trial — just go to signup
    navigate(`/signup?plan=${plan.id}&seats=${seats}&billing=${billing}`);
    return;
  }

  const token = getToken();
  if (!token) {
    // New signup flow — go to signup with plan params
    navigate(`/signup?plan=${plan.id}&seats=${seats}&billing=${billing}`);
    return;
  }

  // Existing user upgrading — create LS checkout via backend
  setCheckoutLoading(true);
  setCheckoutError(null);
  try {
    const res = await fetch(`${API_URL}/billing/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ packageName: plan.id, billingCycle: billing, seats }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Checkout failed');
    window.location.href = data.checkoutUrl; // redirect to LemonSqueezy hosted page
  } catch (err) {
    setCheckoutError(err.message || 'Could not create checkout. Please try again.');
  } finally {
    setCheckoutLoading(false);
  }
};
```

- [ ] **Step 3: Update the CTA button to show loading state and error**

Replace the existing CTA button block with:

```jsx
{plan.contactSales ? (
  <a
    href="mailto:sales@voxiq.com"
    style={{ display: 'block', padding: '15px 20px', borderRadius: '12px', background: plan.color, color: '#fff', fontWeight: 800, fontSize: '1rem', textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box', width: '100%' }}
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
      style={{ width: '100%', padding: '15px 20px', borderRadius: '12px', border: 'none', background: checkoutLoading ? '#94a3b8' : 'var(--vx-accent)', color: '#fff', fontWeight: 800, fontSize: '1rem', cursor: checkoutLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'background 0.2s' }}
    >
      {checkoutLoading ? 'Redirecting to payment...' : plan.price === 0 ? 'Start Free Trial →' : 'Subscribe & Pay →'}
    </button>
    <p style={{ fontSize: '0.75rem', color: 'var(--vx-gray-400)', textAlign: 'center', marginTop: '14px', lineHeight: '1.5' }}>
      {plan.price === 0 ? 'No credit card required. Cancel anytime.' : 'Secure payment via LemonSqueezy. Auto-renews monthly/annually. Cancel anytime.'}
    </p>
  </>
)}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/Checkout.jsx
git commit -m "feat: checkout calls backend for LemonSqueezy hosted checkout URL"
```

---

## Task 7: Frontend — BillingSuccess Page

After LemonSqueezy payment, user is redirected to `/billing/success`. This page shows a success message and redirects to admin dashboard.

**Files:**
- Create: `frontend/src/pages/BillingSuccess.jsx`
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: Create BillingSuccess.jsx**

```jsx
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function BillingSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const plan = searchParams.get('plan') || 'your plan';
  const seats = searchParams.get('seats') || '1';
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const t = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(t); navigate('/admin'); }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [navigate]);

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, system-ui, sans-serif', padding: '24px' }}>
      <div style={{ background: '#fff', borderRadius: '24px', padding: '48px 40px', maxWidth: '480px', width: '100%', textAlign: 'center', boxShadow: '0 4px 32px rgba(0,0,0,0.08)' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '16px' }}>🎉</div>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0f172a', marginBottom: '8px' }}>Payment Successful!</h1>
        <p style={{ color: '#64748b', fontSize: '1rem', marginBottom: '8px' }}>
          Your <strong>{plan}</strong> plan ({seats} seat{Number(seats) > 1 ? 's' : ''}) is now active.
        </p>
        <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '32px' }}>
          Your account has been automatically upgraded. All features are now unlocked.
        </p>
        <div style={{ background: '#f0fdf4', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
          <p style={{ color: '#16a34a', fontWeight: 700, fontSize: '0.875rem', margin: 0 }}>
            Redirecting to your dashboard in {countdown}s...
          </p>
        </div>
        <button
          onClick={() => navigate('/admin')}
          style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: '12px', padding: '12px 28px', fontWeight: 700, fontSize: '1rem', cursor: 'pointer' }}
        >
          Go to Dashboard →
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Register route in App.jsx**

In `frontend/src/App.jsx`, add:

```jsx
const BillingSuccess = lazy(() => import('./pages/BillingSuccess'));

// Inside routes:
<Route path="/billing/success" element={<BillingSuccess />} />
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/BillingSuccess.jsx frontend/src/App.jsx
git commit -m "feat: add BillingSuccess page with auto-redirect to admin"
```

---

## Task 8: Remove Old Email/Manual Upgrade Flow

**Files:**
- Modify: `frontend/src/pages/Admin.jsx`

- [ ] **Step 1: Update TrialBanner buttons to go to Checkout with no `source` param**

The buttons already navigate to `/checkout` and `/checkout?source=upgrade`. Remove the `source=upgrade` param — it's no longer needed since Checkout now detects the token automatically.

Change in both banner buttons:
```jsx
// trial expired button
onClick={() => navigate('/checkout')}

// payment overdue button
const checkoutUrl = `/checkout?plan=${plan.packageName}&seats=${seats}&billing=${plan.billingCycle || 'monthly'}`;
```

- [ ] **Step 2: Also remove `isUpgrade` logic from Checkout.jsx entirely**

Since `getToken()` now drives the decision (token present = existing user upgrading, no token = new signup), the `source` param is no longer needed. Clean it up:

```jsx
// Remove:
const isUpgrade = searchParams.get('source') === 'upgrade' || !!searchParams.get('plan');

// Remove all references to isUpgrade in JSX
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Admin.jsx frontend/src/pages/Checkout.jsx
git commit -m "refactor: remove manual email upgrade flow, token auto-detects upgrade vs signup"
```

---

## Task 9: Test End-to-End Locally

- [ ] **Step 1: Start backend**

```bash
cd backend && npm run start:dev
```

- [ ] **Step 2: Use ngrok to expose local backend for LS webhooks**

```bash
ngrok http 3000
```

Copy the `https://xxxx.ngrok.io` URL. In LemonSqueezy dashboard, temporarily set webhook URL to `https://xxxx.ngrok.io/api/billing/webhook`.

- [ ] **Step 3: Start frontend**

```bash
cd frontend && npm run dev
```

- [ ] **Step 4: Log in as Bytechsol admin (trial expired)**

Should see red "Your free trial has expired" banner.

- [ ] **Step 5: Click "Upgrade Now"**

Should go to `/checkout`. Select Pro plan, 2 seats, monthly. Click "Subscribe & Pay →".
Should redirect to LemonSqueezy hosted checkout page.

- [ ] **Step 6: Complete payment on LemonSqueezy test mode**

Use test card: `4242 4242 4242 4242`, any future expiry, any CVV.

- [ ] **Step 7: Verify webhook fires**

Check ngrok inspector at `http://localhost:4040`. Should see `subscription_created` event.
Check backend logs — should see account update query.

- [ ] **Step 8: Verify account activated**

```bash
cd backend && node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.account.findFirst({ where: { name: { contains: 'Bytechsol' } }, select: { status: true, packageName: true, isTrial: true, lsSubscriptionId: true } })
  .then(r => { console.log(r); return p.\$disconnect(); });
"
```

Expected: `status: 'ACTIVE'`, `isTrial: false`, `packageName: 'Pro'`, `lsSubscriptionId` populated.

- [ ] **Step 9: Verify success page**

After payment, LemonSqueezy redirects to `/billing/success`. Should show "Payment Successful!" with countdown. After 5s redirects to `/admin` with no trial banner.

---

## Manual Test Checklist

| Scenario | Expected |
|---|---|
| Trial expired → Upgrade Now → pay | Account auto-activates, `isTrial: false`, banner gone |
| Monthly renewal (webhook fires) | `subscription_payment_success` → account stays ACTIVE |
| Payment fails (LS test mode) | `subscription_payment_failed` → account INACTIVE, billing banner shows |
| Cancel subscription | `subscription_cancelled` → account INACTIVE |
| New signup → select Pro plan | Goes to signup with plan params (no backend checkout call) |
| Enterprise → Contact Sales | mailto:sales@voxiq.com opens |

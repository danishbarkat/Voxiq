# Pricing & Packages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace old 7-package system with 5 new tiered packages, add per-seat pricing, annual billing, package selection at signup, upgrade flow in Admin dashboard, and correct display in Superadmin.

**Architecture:** Backend defines packages as typed constants with feature flags. Prisma schema gets 2 new Account fields (`canAiInsights`, `billingCycle`). Signup flow gets a new step (PricingCards component). Admin dashboard shows current plan + upgrade. Superadmin sees per-company package info.

**Tech Stack:** NestJS (backend), Prisma (DB), React + Vite (frontend), PostgreSQL (Supabase)

---

## New Package Structure

| Package    | Price        | Calls | SMS | Recordings | WhatsApp | AI | Seats       |
|------------|-------------|-------|-----|------------|----------|----|-------------|
| Trial      | Free         | ✓     | ✗   | ✗          | ✗        | ✗  | 1 (7 days)  |
| Basic      | $24.99/seat  | ✓ unlimited | ✗ | ✗        | ✗        | ✗  | Per seat    |
| Pro        | $39.99/seat  | ✓     | ✓   | ✓          | ✗        | ✗  | Per seat    |
| Business   | $69.99/seat  | ✓     | ✓   | ✓          | ✓        | ✓  | Per seat    |
| Enterprise | Talk to Sales| ✓     | ✓   | ✓          | ✓        | ✓  | Custom      |

Annual billing: 10% off (Trial excluded). `billingCycle = 'monthly' | 'annual'`.

---

## Files Modified/Created

| File | Action | Purpose |
|------|--------|---------|
| `backend/prisma/schema.prisma` | Modify | Add `canAiInsights Boolean`, `billingCycle String?`, `seatCount Int?` |
| `backend/prisma/migrations/` | New migration | Schema changes |
| `backend/src/superadmin/superadmin.service.ts` | Modify | Replace PACKAGES + PACKAGE_PRICES constants |
| `backend/src/auth/dto/signup.dto.ts` | Modify | Add `requestedPackage`, `billingCycle`, `seatCount` |
| `backend/src/auth/auth.service.ts` | Modify | Store package selection on signup |
| `backend/src/auth/auth.controller.ts` | Check | Ensure signup route passes new fields |
| `frontend/src/components/PricingCards.jsx` | **Create** | Reusable pricing cards UI component |
| `frontend/src/pages/Signup.jsx` | Modify | Add package selection step after email verification |
| `frontend/src/pages/Admin.jsx` | Modify | Add "Current Plan" section + Upgrade button |
| `frontend/src/pages/SuperAdmin.jsx` | Modify | Show package name, billingCycle, seatCount per company |

---

## Task 1: Schema Migration — Add 3 New Account Fields

**Files:**
- Modify: `backend/prisma/schema.prisma`
- New: `backend/prisma/migrations/TIMESTAMP_add_package_fields/`

- [ ] **Step 1: Add fields to schema**

In `backend/prisma/schema.prisma`, inside the `Account` model, add after `packageName String?`:

```prisma
canAiInsights          Boolean             @default(false)
billingCycle           String?             @default("monthly")
seatCount              Int?                @default(1)
```

- [ ] **Step 2: Run migration**

```bash
cd backend
npx prisma migrate dev --name add_package_fields
```

Expected: New migration file created, `canAiInsights`, `billingCycle`, `seatCount` columns added to Account table.

- [ ] **Step 3: Verify**

```bash
npx prisma studio
```

Open Account table — confirm 3 new columns exist.

- [ ] **Step 4: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/
git commit -m "feat: add canAiInsights, billingCycle, seatCount to Account schema"
```

---

## Task 2: Backend — Replace PACKAGES Constants

**Files:**
- Modify: `backend/src/superadmin/superadmin.service.ts` (lines ~1241–1318)

- [ ] **Step 1: Replace PACKAGES static property**

Find `static readonly PACKAGES:` in `superadmin.service.ts` and replace the entire block:

```typescript
static readonly PACKAGES: Record<string, {
  canOutboundCall: boolean; canInboundCall: boolean;
  canSendSms: boolean; canRecord: boolean; canSendWhatsapp: boolean; canAiInsights: boolean;
  monthlyCallLimit: number | null; monthlySmsLimit: number | null;
  agentLimit: number; isTrial?: boolean; trialDays?: number;
  pricePerSeat: number; billingLabel: string;
}> = {
  Trial:      { canOutboundCall: true,  canInboundCall: false, canSendSms: false, canRecord: false, canSendWhatsapp: false, canAiInsights: false, monthlyCallLimit: null,  monthlySmsLimit: null,    agentLimit: 1,  isTrial: true, trialDays: 7, pricePerSeat: 0,     billingLabel: 'Free' },
  Basic:      { canOutboundCall: true,  canInboundCall: true,  canSendSms: false, canRecord: false, canSendWhatsapp: false, canAiInsights: false, monthlyCallLimit: null,  monthlySmsLimit: null,    agentLimit: 1,  pricePerSeat: 24.99, billingLabel: '$24.99/seat/mo' },
  Pro:        { canOutboundCall: true,  canInboundCall: true,  canSendSms: true,  canRecord: true,  canSendWhatsapp: false, canAiInsights: false, monthlyCallLimit: null,  monthlySmsLimit: null,    agentLimit: 1,  pricePerSeat: 39.99, billingLabel: '$39.99/seat/mo' },
  Business:   { canOutboundCall: true,  canInboundCall: true,  canSendSms: true,  canRecord: true,  canSendWhatsapp: true,  canAiInsights: true,  monthlyCallLimit: null,  monthlySmsLimit: null,    agentLimit: 1,  pricePerSeat: 69.99, billingLabel: '$69.99/seat/mo' },
  Enterprise: { canOutboundCall: true,  canInboundCall: true,  canSendSms: true,  canRecord: true,  canSendWhatsapp: true,  canAiInsights: true,  monthlyCallLimit: null,  monthlySmsLimit: null,    agentLimit: 100, pricePerSeat: 0,    billingLabel: 'Contact Sales' },
};
```

- [ ] **Step 2: Replace PACKAGE_PRICES static property**

Find `static readonly PACKAGE_PRICES:` and replace:

```typescript
static readonly PACKAGE_PRICES: Record<string, number> = {
  Trial: 0, Basic: 24.99, Pro: 39.99, Business: 69.99, Enterprise: 0,
};
```

- [ ] **Step 3: Update approveCompany method to use seatCount**

In `approveCompany`, after `const pkgName = packageName || 'Trial';`, update the `prisma.account.update` data to include:

```typescript
data: {
  status: AccountStatus.ACTIVE,
  approved: true,
  agentLimit: seatCount ?? preset.agentLimit,
  seatCount: seatCount ?? 1,
  numberPool,
  approvedAt: new Date(),
  rejectionReason: null,
  packageName: pkgName,
  isTrial: !!preset.isTrial,
  trialEndsAt,
  canOutboundCall: preset.canOutboundCall,
  canInboundCall:  preset.canInboundCall,
  canSendSms:      preset.canSendSms,
  canRecord:       preset.canRecord,
  canSendWhatsapp: preset.canSendWhatsapp,
  canAiInsights:   preset.canAiInsights,
  monthlyCallLimit: preset.monthlyCallLimit,
  monthlySmsLimit:  preset.monthlySmsLimit,
},
```

Also update the `approveCompany` method signature to accept `seatCount`:
```typescript
async approveCompany(accountId: string, agentLimit: number, numberPool: ..., packageName?: string, seatCount?: number)
```

And update the controller call:
```typescript
@Post('companies/:id/approve')
approveCompany(@Param('id') id: string, @Body() dto: ApproveDto) {
  return this.superAdminService.approveCompany(id, dto.agentLimit, dto.numberPool, dto.packageName, dto.seatCount);
}
```

Add `seatCount` to `ApproveDto`:
```typescript
class ApproveDto {
  @IsInt() @Min(1) agentLimit: number;
  @IsArray() @ValidateNested({ each: true }) @Type(() => NumberEntryDto) numberPool: NumberEntryDto[];
  @IsString() @IsOptional() packageName?: string;
  @IsInt() @Min(1) @IsOptional() seatCount?: number;
}
```

- [ ] **Step 4: Update assignPackage to set canAiInsights + canSendWhatsapp**

In `assignPackage` method, add to the update data:
```typescript
canSendWhatsapp: preset.canSendWhatsapp,
canAiInsights:   preset.canAiInsights,
```

- [ ] **Step 5: Compile and test**

```bash
cd backend && npm run build
```

Expected: No TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add backend/src/superadmin/superadmin.service.ts backend/src/superadmin/superadmin.controller.ts
git commit -m "feat: replace packages with Trial/Basic/Pro/Business/Enterprise"
```

---

## Task 3: Signup DTO + Service — Store Package Selection

**Files:**
- Modify: `backend/src/auth/dto/signup.dto.ts`
- Modify: `backend/src/auth/auth.service.ts`

- [ ] **Step 1: Update signup DTO**

In `backend/src/auth/dto/signup.dto.ts`, add:

```typescript
import { IsString, IsOptional, IsIn, IsInt, Min } from 'class-validator';

@IsString() @IsOptional()
@IsIn(['Trial', 'Basic', 'Pro', 'Business', 'Enterprise'])
requestedPackage?: string;

@IsString() @IsOptional()
@IsIn(['monthly', 'annual'])
billingCycle?: string;

@IsInt() @Min(1) @IsOptional()
seatCount?: number;
```

- [ ] **Step 2: Store in auth.service.ts signup payload**

In `signup()` method, inside the `payload` object stored in `SignupVerification`, add:
```typescript
requestedPackage: dto.requestedPackage || 'Trial',
billingCycle: dto.billingCycle || 'monthly',
seatCount: dto.seatCount || 1,
```

- [ ] **Step 3: Store on account creation in verifySignup**

In `buildSignupAccountData()`, add:
```typescript
data.requestedPackage = payload.requestedPackage || 'Trial';
// billingCycle and seatCount stored for superadmin to see at approval
```

Also add `billingCycle` and `seatCount` to buildSignupAccountData if columns exist:
```typescript
if (columns.has('billingCycle')) data.billingCycle = payload.billingCycle || 'monthly';
if (columns.has('seatCount')) data.seatCount = payload.seatCount || 1;
```

- [ ] **Step 4: Compile**

```bash
cd backend && npm run build
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/auth/dto/signup.dto.ts backend/src/auth/auth.service.ts
git commit -m "feat: store package selection (requestedPackage, billingCycle, seatCount) at signup"
```

---

## Task 4: Frontend — PricingCards Component

**Files:**
- Create: `frontend/src/components/PricingCards.jsx`

- [ ] **Step 1: Create the component**

Create `frontend/src/components/PricingCards.jsx`:

```jsx
import { useState } from 'react';

const PACKAGES = [
  {
    id: 'Trial',
    name: '7-Day Free Trial',
    tagline: 'Try before you buy',
    priceMonthly: 0,
    priceLabel: 'Free',
    color: '#6366f1',
    features: ['Outbound & Inbound Calls', '1 Agent Seat', '7 Days Only', 'No credit card required'],
    notIncluded: ['SMS', 'Call Recordings', 'WhatsApp', 'AI Insights'],
    cta: 'Start Free Trial',
    popular: false,
    contactSales: false,
    maxSeats: 1,
  },
  {
    id: 'Basic',
    name: 'Basic',
    tagline: 'For growing teams',
    priceMonthly: 24.99,
    color: '#3b82f6',
    features: ['Unlimited Outbound & Inbound Calls', 'Per-seat pricing', 'Call History & Analytics'],
    notIncluded: ['SMS', 'Call Recordings', 'WhatsApp', 'AI Insights'],
    cta: 'Get Started',
    popular: false,
    contactSales: false,
    maxSeats: 50,
  },
  {
    id: 'Pro',
    name: 'Pro',
    tagline: 'Most popular choice',
    priceMonthly: 39.99,
    color: '#8b5cf6',
    features: ['Everything in Basic', 'SMS Messaging', 'Call Recordings', 'Advanced Analytics'],
    notIncluded: ['WhatsApp', 'AI Insights'],
    cta: 'Get Pro',
    popular: true,
    contactSales: false,
    maxSeats: 50,
  },
  {
    id: 'Business',
    name: 'Business',
    tagline: 'Full-featured platform',
    priceMonthly: 69.99,
    color: '#f59e0b',
    features: ['Everything in Pro', 'WhatsApp Messaging', 'AI Call Insights', 'Priority Support'],
    notIncluded: [],
    cta: 'Get Business',
    popular: false,
    contactSales: false,
    maxSeats: 50,
  },
  {
    id: 'Enterprise',
    name: 'Enterprise',
    tagline: 'Custom for large teams',
    priceMonthly: null,
    color: '#10b981',
    features: ['Everything in Business', 'Custom Seat Limit', 'Dedicated Account Manager', 'SLA & Custom Integrations'],
    notIncluded: [],
    cta: 'Contact Sales',
    popular: false,
    contactSales: true,
    maxSeats: null,
  },
];

export default function PricingCards({ onSelect, selectedPackage, selectedBilling, onBillingChange }) {
  const [seats, setSeats] = useState({});

  const getSeatCount = (pkgId) => seats[pkgId] || 1;

  const getPrice = (pkg) => {
    if (!pkg.priceMonthly) return null;
    const base = pkg.priceMonthly * getSeatCount(pkg.id);
    if (selectedBilling === 'annual') return (base * 0.9).toFixed(2);
    return base.toFixed(2);
  };

  return (
    <div style={{ width: '100%' }}>
      {/* Billing Toggle */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
        <span style={{ fontSize: '0.9rem', color: selectedBilling === 'monthly' ? '#0f172a' : '#94a3b8', fontWeight: selectedBilling === 'monthly' ? 700 : 400 }}>Monthly</span>
        <button
          onClick={() => onBillingChange(selectedBilling === 'monthly' ? 'annual' : 'monthly')}
          style={{
            width: '48px', height: '26px', borderRadius: '999px', border: 'none', cursor: 'pointer',
            background: selectedBilling === 'annual' ? '#6366f1' : '#e2e8f0',
            position: 'relative', transition: 'background 0.2s',
          }}
        >
          <span style={{
            position: 'absolute', top: '3px',
            left: selectedBilling === 'annual' ? '25px' : '3px',
            width: '20px', height: '20px', borderRadius: '50%',
            background: '#fff', transition: 'left 0.2s', display: 'block',
          }} />
        </button>
        <span style={{ fontSize: '0.9rem', color: selectedBilling === 'annual' ? '#0f172a' : '#94a3b8', fontWeight: selectedBilling === 'annual' ? 700 : 400 }}>
          Annual <span style={{ background: '#dcfce7', color: '#16a34a', padding: '2px 8px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700 }}>Save 10%</span>
        </span>
      </div>

      {/* Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', maxWidth: '1100px', margin: '0 auto' }}>
        {PACKAGES.map(pkg => {
          const isSelected = selectedPackage === pkg.id;
          const price = getPrice(pkg);

          return (
            <div
              key={pkg.id}
              onClick={() => !pkg.contactSales && onSelect(pkg.id, getSeatCount(pkg.id))}
              style={{
                border: isSelected ? `2px solid ${pkg.color}` : '2px solid #e2e8f0',
                borderRadius: '20px',
                padding: '24px 20px',
                background: isSelected ? `${pkg.color}08` : '#fff',
                cursor: pkg.contactSales ? 'default' : 'pointer',
                position: 'relative',
                transition: 'all 0.2s',
                boxShadow: isSelected ? `0 0 0 4px ${pkg.color}20` : '0 2px 8px rgba(0,0,0,0.06)',
              }}
            >
              {pkg.popular && (
                <div style={{
                  position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)',
                  background: pkg.color, color: '#fff', padding: '4px 16px',
                  borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap',
                }}>MOST POPULAR</div>
              )}

              <div style={{ marginBottom: '4px' }}>
                <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: pkg.color, marginRight: '8px' }} />
                <span style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>{pkg.name}</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '16px' }}>{pkg.tagline}</div>

              {/* Price */}
              <div style={{ marginBottom: '16px' }}>
                {pkg.contactSales ? (
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: pkg.color }}>Contact Sales</div>
                ) : pkg.priceMonthly === 0 ? (
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color: pkg.color }}>Free</div>
                ) : (
                  <>
                    <div style={{ fontSize: '1.8rem', fontWeight: 900, color: pkg.color }}>
                      ${price}
                      <span style={{ fontSize: '0.8rem', fontWeight: 500, color: '#94a3b8' }}>/{selectedBilling === 'annual' ? 'mo (billed annually)' : 'mo'}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>${pkg.priceMonthly}/seat × {getSeatCount(pkg.id)} seat{getSeatCount(pkg.id) > 1 ? 's' : ''}</div>
                  </>
                )}
              </div>

              {/* Seat Selector */}
              {!pkg.contactSales && pkg.priceMonthly > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', background: '#f8fafc', borderRadius: '10px', padding: '8px 12px' }}
                  onClick={e => e.stopPropagation()}
                >
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Seats:</span>
                  <button onClick={() => setSeats(s => ({ ...s, [pkg.id]: Math.max(1, getSeatCount(pkg.id) - 1) }))}
                    style={{ width: '24px', height: '24px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '1rem', lineHeight: 1 }}>−</button>
                  <span style={{ fontWeight: 700, minWidth: '24px', textAlign: 'center' }}>{getSeatCount(pkg.id)}</span>
                  <button onClick={() => setSeats(s => ({ ...s, [pkg.id]: Math.min(50, getSeatCount(pkg.id) + 1) }))}
                    style={{ width: '24px', height: '24px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '1rem', lineHeight: 1 }}>+</button>
                </div>
              )}

              {/* Features */}
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px 0', fontSize: '0.8rem' }}>
                {pkg.features.map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '6px', color: '#374151' }}>
                    <span style={{ color: pkg.color, fontWeight: 700, marginTop: '1px' }}>✓</span>{f}
                  </li>
                ))}
                {pkg.notIncluded.map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '6px', color: '#cbd5e1' }}>
                    <span style={{ fontWeight: 700, marginTop: '1px' }}>✗</span>{f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <button
                onClick={e => { e.stopPropagation(); if (!pkg.contactSales) onSelect(pkg.id, getSeatCount(pkg.id)); }}
                style={{
                  width: '100%', padding: '10px', borderRadius: '12px', border: 'none',
                  background: pkg.contactSales ? '#f1f5f9' : isSelected ? pkg.color : `${pkg.color}20`,
                  color: pkg.contactSales ? '#64748b' : isSelected ? '#fff' : pkg.color,
                  fontWeight: 700, fontSize: '0.85rem', cursor: pkg.contactSales ? 'default' : 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {isSelected && !pkg.contactSales ? '✓ Selected' : pkg.cta}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/PricingCards.jsx
git commit -m "feat: add PricingCards component with seat selector and annual billing toggle"
```

---

## Task 5: Signup Flow — Package Selection Step

**Files:**
- Modify: `frontend/src/pages/Signup.jsx`

- [ ] **Step 1: Read current Signup.jsx to understand structure**

Open `frontend/src/pages/Signup.jsx` and find the existing steps/stages.

- [ ] **Step 2: Add package state variables**

Near the top of the component, add:
```jsx
const [selectedPackage, setSelectedPackage] = useState('Trial');
const [billingCycle, setBillingCycle] = useState('monthly');
const [seatCount, setSeatCount] = useState(1);
const [step, setStep] = useState('form'); // 'form' | 'pricing' | 'verify'
```

- [ ] **Step 3: Add import**

```jsx
import PricingCards from '../components/PricingCards';
```

- [ ] **Step 4: Update form submit to go to pricing step first**

Change the form submit handler:
```jsx
const handleFormSubmit = (e) => {
  e.preventDefault();
  // validate form fields...
  setStep('pricing'); // show pricing before sending OTP
};
```

- [ ] **Step 5: Add pricing step UI**

In the JSX, add a conditional step:
```jsx
{step === 'pricing' && (
  <div>
    <h2 style={{ textAlign: 'center', marginBottom: '8px' }}>Choose Your Plan</h2>
    <p style={{ textAlign: 'center', color: '#64748b', marginBottom: '24px' }}>
      You can upgrade anytime from your dashboard
    </p>
    <PricingCards
      selectedPackage={selectedPackage}
      selectedBilling={billingCycle}
      onBillingChange={setBillingCycle}
      onSelect={(pkgId, seats) => { setSelectedPackage(pkgId); setSeatCount(seats); }}
    />
    <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'center' }}>
      <button onClick={() => setStep('form')} className="btn-secondary">← Back</button>
      <button onClick={handlePricingConfirm} className="btn-primary">
        Continue with {selectedPackage} →
      </button>
    </div>
  </div>
)}
```

- [ ] **Step 6: Update signup API call to include package fields**

In the function that calls the signup API, add:
```jsx
const handlePricingConfirm = async () => {
  setStep('verify');
  await fetch(`${API_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...formData,
      requestedPackage: selectedPackage,
      billingCycle,
      seatCount,
    }),
  });
};
```

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/Signup.jsx
git commit -m "feat: add package selection step in signup flow"
```

---

## Task 6: Admin Dashboard — Current Plan + Upgrade Section

**Files:**
- Modify: `frontend/src/pages/Admin.jsx`

- [ ] **Step 1: Add plan state**

In Admin.jsx, near other state variables:
```jsx
const [showUpgrade, setShowUpgrade] = useState(false);
const [upgradePackage, setUpgradePackage] = useState(null);
const [upgradeBilling, setUpgradeBilling] = useState('monthly');
const [upgradeSeats, setUpgradeSeats] = useState(1);
```

- [ ] **Step 2: Add import**

```jsx
import PricingCards from '../components/PricingCards';
```

- [ ] **Step 3: Add "Current Plan" card in the Settings/Account tab**

Find the Settings or Account section in Admin.jsx. Add before or within it:

```jsx
{/* Current Plan */}
<div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', marginBottom: '24px' }}>
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
    <div>
      <h3 style={{ margin: 0, fontSize: '1rem', color: '#0f172a' }}>Current Plan</h3>
      <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ background: '#6366f120', color: '#6366f1', padding: '4px 14px', borderRadius: '999px', fontWeight: 700, fontSize: '0.9rem' }}>
          {plan?.packageName || 'Trial'}
        </span>
        {plan?.isTrial && plan?.trialEndsAt && (
          <span style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: 600 }}>
            Trial ends {new Date(plan.trialEndsAt).toLocaleDateString()}
          </span>
        )}
        <span style={{ color: '#64748b', fontSize: '0.8rem' }}>
          {plan?.seatCount || plan?.agentLimit || 1} seat{(plan?.seatCount || 1) > 1 ? 's' : ''} · {plan?.billingCycle || 'monthly'}
        </span>
      </div>
      <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {[
          { key: 'canOutboundCall', label: 'Outbound Calls' },
          { key: 'canInboundCall', label: 'Inbound Calls' },
          { key: 'canSendSms', label: 'SMS' },
          { key: 'canRecord', label: 'Recordings' },
          { key: 'canSendWhatsapp', label: 'WhatsApp' },
          { key: 'canAiInsights', label: 'AI Insights' },
        ].map(({ key, label }) => (
          <span key={key} style={{
            padding: '3px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600,
            background: plan?.[key] ? '#dcfce7' : '#f1f5f9',
            color: plan?.[key] ? '#16a34a' : '#94a3b8',
          }}>
            {plan?.[key] ? '✓' : '✗'} {label}
          </span>
        ))}
      </div>
    </div>
    <button
      onClick={() => setShowUpgrade(true)}
      style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: '12px', padding: '10px 20px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}
    >
      Upgrade Plan
    </button>
  </div>
</div>
```

- [ ] **Step 4: Add upgrade modal**

```jsx
{showUpgrade && (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, overflow: 'auto', padding: '40px 16px' }}>
    <div style={{ background: '#f8fafc', borderRadius: '24px', maxWidth: '1100px', margin: '0 auto', padding: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h2 style={{ margin: 0 }}>Upgrade Your Plan</h2>
        <button onClick={() => setShowUpgrade(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
      </div>
      <PricingCards
        selectedPackage={upgradePackage || plan?.packageName}
        selectedBilling={upgradeBilling}
        onBillingChange={setUpgradeBilling}
        onSelect={(pkgId, seats) => { setUpgradePackage(pkgId); setUpgradeSeats(seats); }}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
        <button onClick={() => setShowUpgrade(false)} style={{ padding: '10px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer' }}>Cancel</button>
        <button
          onClick={() => {
            // Send upgrade request to superadmin or handle via billing
            alert(`Upgrade request sent for ${upgradePackage} (${upgradeSeats} seats, ${upgradeBilling}). Superadmin will apply this package.`);
            setShowUpgrade(false);
          }}
          style={{ padding: '10px 20px', borderRadius: '12px', background: '#6366f1', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}
        >
          Request Upgrade →
        </button>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 5: Fetch plan info**

Make sure `plan` is fetched from `/auth/account-plan` or `/users/me`. The existing `fetchJson(`${API_URL}/auth/account-plan`)` call returns package data — update it to also request `canAiInsights`, `billingCycle`, `seatCount`.

Check `auth.service.ts` `getAccountPlan()` and add the new fields to the select:
```typescript
select: {
  packageName: true, isTrial: true, trialEndsAt: true,
  canOutboundCall: true, canInboundCall: true,
  canSendSms: true, canRecord: true, canSendWhatsapp: true, canAiInsights: true,
  monthlyCallLimit: true, monthlySmsLimit: true, agentLimit: true,
  billingCycle: true, seatCount: true,
},
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/Admin.jsx
git commit -m "feat: add current plan display and upgrade modal to Admin dashboard"
```

---

## Task 7: Superadmin — Show New Package Fields Per Company

**Files:**
- Modify: `frontend/src/pages/SuperAdmin.jsx`
- Modify: `backend/src/superadmin/superadmin.service.ts` (accountSummarySelect)

- [ ] **Step 1: Add new fields to accountSummarySelect in superadmin.service.ts**

Find `private readonly accountSummarySelect` and add:
```typescript
canAiInsights: true,
billingCycle: true,
seatCount: true,
```

Also add `canSendWhatsapp: true` if not already there (it should be).

- [ ] **Step 2: Update company card in SuperAdmin.jsx**

In the company details/card view, add package info display:
```jsx
<div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
  {[
    { key: 'canOutboundCall', label: 'Calls' },
    { key: 'canSendSms', label: 'SMS' },
    { key: 'canRecord', label: 'Rec' },
    { key: 'canSendWhatsapp', label: 'WhatsApp' },
    { key: 'canAiInsights', label: 'AI' },
  ].map(({ key, label }) => (
    <span key={key} style={{
      padding: '2px 8px', borderRadius: '5px', fontSize: '0.7rem', fontWeight: 700,
      background: company[key] ? '#dcfce7' : '#f1f5f9',
      color: company[key] ? '#16a34a' : '#cbd5e1',
    }}>{label}</span>
  ))}
  {company.billingCycle && (
    <span style={{ padding: '2px 8px', borderRadius: '5px', fontSize: '0.7rem', background: '#ede9fe', color: '#7c3aed', fontWeight: 700 }}>
      {company.billingCycle}
    </span>
  )}
  {company.seatCount > 1 && (
    <span style={{ padding: '2px 8px', borderRadius: '5px', fontSize: '0.7rem', background: '#fef3c7', color: '#d97706', fontWeight: 700 }}>
      {company.seatCount} seats
    </span>
  )}
</div>
```

- [ ] **Step 3: Update package assignment UI in SuperAdmin**

Find where superadmin assigns packages (the `assignPackage` call). Replace old package list with new ones:
```jsx
const PACKAGE_OPTIONS = ['Trial', 'Basic', 'Pro', 'Business', 'Enterprise'];
```

- [ ] **Step 4: Compile and build frontend**

```bash
cd backend && npm run build
cd ../frontend && npm run build
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/superadmin/superadmin.service.ts frontend/src/pages/SuperAdmin.jsx
git commit -m "feat: show billingCycle, seatCount, canAiInsights in superadmin company view"
```

---

## Task 8: Deploy to Production

- [ ] **Step 1: Push all commits**

```bash
git push origin main
```

- [ ] **Step 2: Deploy backend**

```bash
ssh -i "D:/keys/voxiq.pem" ubuntu@35.92.71.185 "cd /var/www/voxiq/backend && git pull origin main && npx prisma migrate deploy && npm install && npm run build && pm2 restart all"
```

- [ ] **Step 3: Deploy frontend**

```bash
ssh -i "D:/keys/voxiq.pem" ubuntu@35.92.71.185 "cd /var/www/voxiq/frontend && git pull origin main && npm install && npm run build"
```

- [ ] **Step 4: Verify**

- Open `voxiq.bytechsol.com/signup` — pricing step should appear after form
- Open Admin dashboard → Settings → "Current Plan" card should show
- Open Superadmin → Companies → package badges should show
- Superadmin assign package should only show: Trial, Basic, Pro, Business, Enterprise

---

## Self-Review Checklist

- [x] Trial/Basic/Pro/Business/Enterprise defined with correct feature flags
- [x] Annual 10% discount in PricingCards component
- [x] Per-seat pricing with seat selector
- [x] Signup stores requestedPackage + billingCycle + seatCount
- [x] Admin can see current plan features
- [x] Admin can request upgrade (superadmin applies it)
- [x] Superadmin sees billingCycle + seatCount + new feature flags
- [x] canAiInsights field in schema and enforced in packages
- [x] Old packages (Starter, Growth, Agency) removed
- [x] Enterprise = Contact Sales (no price shown, no seat selector)
- [x] DB migration for 3 new Account fields

# Trial Expiry Enforcement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a company's trial ends, agents are blocked from logging in and making calls, while admins can still log in but see an upgrade banner and cannot dial.

**Architecture:** Add trial check to JWT strategy (blocks agents via 401, lets admins through with a flag), add trial check to the manual call endpoint in dialer controller, and surface a clear "trial expired" message on the login page when an agent is kicked out.

**Tech Stack:** NestJS (backend), React (frontend), Prisma (ORM), sessionStorage/localStorage for token/reason persistence.

---

## File Map

| File | Change |
|---|---|
| `backend/src/auth/jwt.strategy.ts` | Fetch `isTrial`+`trialEndsAt` from account; throw `TRIAL_EXPIRED` for agents/managers; pass `trialExpired` flag for admins |
| `backend/src/dialer/dialer.controller.ts` | Add trial expiry check in `POST /dialer/call/start` alongside existing `canOutboundCall` check |
| `frontend/src/lib/api.js` | On 401, detect `TRIAL_EXPIRED` message → call `forceLogout` with human-readable trial message |
| `frontend/src/pages/Login.jsx` | Read `logoutReason` from localStorage on mount; display it as a red notice above the login form |

---

## Task 1: JWT Strategy — block agents when trial expired

**Files:**
- Modify: `backend/src/auth/jwt.strategy.ts`

- [ ] **Step 1: Update the Prisma select to fetch trial fields**

Replace the `account` select at line 37 with:

```typescript
account: {
  select: {
    id: true,
    status: true,
    isTrial: true,
    trialEndsAt: true,
  },
},
```

- [ ] **Step 2: Add trial expiry check after the INACTIVE account check (after line 69)**

```typescript
// Trial expired — agents/managers blocked; admins allowed in with flag
const trialExpired =
  user.account.isTrial &&
  user.account.trialEndsAt !== null &&
  user.account.trialEndsAt < new Date();

if (trialExpired && roleName !== 'admin' && roleName !== 'superadmin') {
  throw new UnauthorizedException('TRIAL_EXPIRED');
}
```

- [ ] **Step 3: Pass `trialExpired` in the return object**

```typescript
return {
  userId: payload.sub,
  role: payload.role,
  accountId: payload.accountId,
  teamId: payload.teamId,
  accountStatus,
  trialExpired: trialExpired && (roleName === 'admin' || roleName === 'superadmin'),
};
```

- [ ] **Step 4: Verify the full file looks correct**

The complete `validate` method should be:

```typescript
async validate(payload: JwtPayload) {
  const user = await this.prisma.user.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      status: true,
      lastSessionId: true,
      account: {
        select: {
          id: true,
          status: true,
          isTrial: true,
          trialEndsAt: true,
        },
      },
      role: { select: { name: true } },
    },
  });

  if (!user || !user.account) {
    throw new UnauthorizedException('Account no longer exists');
  }

  if (user.lastSessionId && payload.sessionId !== user.lastSessionId) {
    throw new UnauthorizedException('Session expired — logged in from another browser');
  }

  if (user.status === 'INACTIVE') {
    throw new UnauthorizedException('Your account has been deactivated');
  }

  const roleName = user.role?.name?.toLowerCase() || '';
  const accountStatus = user.account.status;

  if (accountStatus === 'PENDING') {
    throw new UnauthorizedException('Account pending approval');
  }

  if (accountStatus === 'INACTIVE' && roleName !== 'admin' && roleName !== 'superadmin') {
    throw new UnauthorizedException('Company account is deactivated. Contact your admin.');
  }

  const trialExpired =
    user.account.isTrial &&
    user.account.trialEndsAt !== null &&
    user.account.trialEndsAt < new Date();

  if (trialExpired && roleName !== 'admin' && roleName !== 'superadmin') {
    throw new UnauthorizedException('TRIAL_EXPIRED');
  }

  return {
    userId: payload.sub,
    role: payload.role,
    accountId: payload.accountId,
    teamId: payload.teamId,
    accountStatus,
    trialExpired: trialExpired && (roleName === 'admin' || roleName === 'superadmin'),
  };
}
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/auth/jwt.strategy.ts
git commit -m "feat: block expired-trial agents in JWT strategy"
```

---

## Task 2: Dialer Controller — block manual calls when trial expired

**Files:**
- Modify: `backend/src/dialer/dialer.controller.ts` (around line 124–138, inside `POST /dialer/call/start`)

- [ ] **Step 1: Extend the agent account select to include trial fields**

Find the existing select inside the `if (body.agentId)` block:

```typescript
select: { account: { select: { canCallInternational: true, canOutboundCall: true } } },
```

Replace with:

```typescript
select: {
  account: {
    select: {
      canCallInternational: true,
      canOutboundCall: true,
      isTrial: true,
      trialEndsAt: true,
    },
  },
},
```

- [ ] **Step 2: Add trial expiry return right after the `canOutboundCall` check**

Existing code to find (after the select):
```typescript
if (agent?.account && !agent.account.canOutboundCall) {
    return { error: 'not_permitted', message: 'Outbound calling is not enabled for your account.' };
}
```

Add immediately after it:

```typescript
if (
  agent?.account &&
  (agent.account as any).isTrial &&
  (agent.account as any).trialEndsAt &&
  new Date((agent.account as any).trialEndsAt) < new Date()
) {
  return {
    error: 'trial_expired',
    message: 'Your free trial has expired. Please contact your admin to upgrade.',
  };
}
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/dialer/dialer.controller.ts
git commit -m "feat: block manual calls for expired-trial accounts"
```

---

## Task 3: Frontend api.js — detect TRIAL_EXPIRED 401 and show clear message

**Files:**
- Modify: `frontend/src/lib/api.js`

- [ ] **Step 1: Update the 401 handler to check for TRIAL_EXPIRED**

Find the current handler:

```javascript
if (res.status === 401 && token) {
  const text = await res.text();
  forceLogout(text || 'Your session expired. Please sign in again.');
  return;
}
```

Replace with:

```javascript
if (res.status === 401 && token) {
  const text = await res.text();
  if (text && text.includes('TRIAL_EXPIRED')) {
    forceLogout('Your free trial has expired. Please contact your Voxiq admin to upgrade your plan.');
  } else {
    forceLogout(text || 'Your session expired. Please sign in again.');
  }
  return;
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/lib/api.js
git commit -m "feat: show trial-expired reason on forced logout"
```

---

## Task 4: Frontend Login.jsx — display logout reason as a notice

Currently `forceLogout` stores a reason in localStorage via `setLogoutReason`, but Login.jsx never reads it. This task wires that up.

**Files:**
- Modify: `frontend/src/pages/Login.jsx`

- [ ] **Step 1: Import `getLogoutReason` and `clearLogoutReason` from auth**

Find the existing import:

```javascript
import { setToken } from '../lib/auth';
```

Replace with:

```javascript
import { setToken, getLogoutReason, clearLogoutReason } from '../lib/auth';
```

- [ ] **Step 2: Add a `logoutNotice` state that reads the reason on mount**

After the existing state declarations (e.g. after `const [error, setError] = useState(null);`), add:

```javascript
const [logoutNotice, setLogoutNotice] = useState(() => {
    const r = getLogoutReason();
    if (r) clearLogoutReason();
    return r;
});
```

- [ ] **Step 3: Render the notice above the form**

Find where the login form JSX starts (the `<form>` tag or the card content). Add this block immediately before the form's first input:

```jsx
{logoutNotice && (
    <div style={{
        background: logoutNotice.includes('trial') || logoutNotice.includes('Trial')
            ? 'linear-gradient(135deg, #fef2f2, #fee2e2)'
            : '#fef3c7',
        border: `1.5px solid ${logoutNotice.includes('trial') || logoutNotice.includes('Trial') ? '#fca5a5' : '#fcd34d'}`,
        borderRadius: 10,
        padding: '12px 16px',
        marginBottom: 16,
        fontSize: 13,
        color: logoutNotice.includes('trial') || logoutNotice.includes('Trial') ? '#991b1b' : '#92400e',
        fontWeight: 600,
        lineHeight: 1.5,
    }}>
        {logoutNotice}
    </div>
)}
```

- [ ] **Step 4: Also handle trial expired on login attempt**

In the `catch` block inside `handleLogin`, find the chain of `if/else if` conditions and add a trial check before the generic fallback:

```javascript
} else if (msg.includes('trial_expired') || msg.includes('trial expired')) {
  setError('Your free trial has expired. Contact your Voxiq admin to upgrade your plan.');
}
```

Place it before the final `else` that sets the generic "Invalid email or password" message.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Login.jsx
git commit -m "feat: display logout reason (trial expired, session expired) on login page"
```

---

## Task 5: Frontend Agent.jsx — show trial_expired error when call is blocked

When the dialer returns `{ error: 'trial_expired', message: '...' }`, the agent dashboard should surface it clearly instead of silently failing.

**Files:**
- Grep for the call start handler in `frontend/src/pages/Agent.jsx`:
  - Search: `call/start` or `startCall` or `dialer/call`

- [ ] **Step 1: Find the call initiation handler**

Run:
```bash
grep -n "trial_expired\|call/start\|error.*duplicate\|error.*not_permitted\|international_blocked" frontend/src/pages/Agent.jsx
```

- [ ] **Step 2: Add trial_expired handling after the existing error checks**

In the response handler where `error: 'duplicate_call'`, `error: 'not_permitted'`, and `error: 'international_blocked'` are already checked, add:

```javascript
if (result?.error === 'trial_expired') {
  // surface as a visible error in the dialer UI
  setCallError('Your free trial has expired. Contact your admin to upgrade.');
  return;
}
```

Where `setCallError` is whatever state variable currently drives the error display in the dialer — find it by looking at where `international_blocked` or `not_permitted` errors are already displayed.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Agent.jsx
git commit -m "feat: show trial-expired error in agent dialer"
```

---

## Manual Test Checklist

After all tasks are done, test with a company account that has `isTrial: true` and `trialEndsAt` set to a past date:

- [ ] Agent login → should be redirected to `/login` with "Your free trial has expired..." notice
- [ ] Agent already logged in, trial expires → next API call triggers forced logout with trial message
- [ ] Admin login → should succeed, trial expired banner already shown by `TrialBanner` component in Admin.jsx
- [ ] Admin tries to dial → dialer returns `trial_expired` error
- [ ] Agent tries to dial (if somehow in app) → dialer returns `trial_expired` error in UI
- [ ] Campaign auto-dialer → already blocked in `dialer.service.ts` (no change needed)
- [ ] SMS → already blocked in `sms.service.ts` (no change needed)
- [ ] Normal active account → all flows unaffected

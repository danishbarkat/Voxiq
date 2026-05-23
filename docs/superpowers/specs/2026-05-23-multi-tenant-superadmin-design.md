# Multi-Tenant Super Admin System — Design Spec
**Date:** 2026-05-23  
**Project:** Voxiq MB Dialer  
**Status:** Approved

---

## Overview

Build a complete multi-tenant company onboarding and super admin control system on top of the existing NestJS + Prisma + React dialer platform. Companies self-register, super admin approves and allocates resources, company admins manage their agents, agents only dial.

---

## Roles

| Role | Access |
|---|---|
| `SuperAdmin` | Global — approve companies, allocate numbers + agent slots, activate/deactivate companies, see all analytics |
| `Admin` (Company Admin) | Own company — create/manage agents, view own analytics, campaigns, leads |
| `Agent` | Own session — login + make calls only |

**Key rule:** Agents cannot self-signup. Only company admins can signup (via admin code). Agents are created by their company admin from the Admin dashboard.

---

## Registration & Approval Flow

```
1. Company Admin → POST /api/auth/signup
   Fields: name, lastName, email, password, phone, companyName,
           adminCode, requestedAgentLimit, requestedNumbers

2. System validates adminCode === env.ADMIN_SIGNUP_CODE
   Creates: Account { status: PENDING, requestedAgentLimit, requestedNumbers }
            User { role: Admin, accountId }

3. SuperAdmin sees pending request in dashboard
   SuperAdmin → POST /api/superadmin/companies/:id/approve
   Body: { agentLimit, numberPool: ["+1...", "+1..."] }

4. System sets: Account { status: ACTIVE, agentLimit, numberPool }
   Company Admin can now login and create agents

5. Company Admin creates agents via existing POST /api/users
   Agents login at /login → redirected to /agent

6. SuperAdmin can at any time:
   - Deactivate company → all logins fail, all calls blocked
   - Reactivate company → access restored
   - Reject pending signup → with reason stored
```

---

## Backend Changes

### 1. Prisma Schema — `backend/prisma/schema.prisma`

```prisma
// AccountStatus enum: add PENDING
enum AccountStatus {
  PENDING   // ← new
  ACTIVE
  INACTIVE
}

// Account model: add new fields
model Account {
  // ... existing fields ...
  requestedAgentLimit Int?
  requestedNumbers    Int?
  rejectionReason     String?
  approvedAt          DateTime?
  adminPhone          String?   // company admin phone from signup
}
```

### 2. Auth Module — `backend/src/auth/`

**New endpoint:** `POST /api/auth/signup` (public)

```typescript
// signup.dto.ts
{
  name: string           // first name
  lastName: string       // last name
  email: string          // unique, company admin email
  password: string       // min 8 chars
  phone: string          // company admin phone
  companyName: string    // becomes Account.name
  adminCode: string      // must match ADMIN_SIGNUP_CODE env var
  requestedAgentLimit: number  // how many agents they want
  requestedNumbers: number     // how many phone numbers they want
}
```

**Logic:**
1. Validate `adminCode` against `process.env.ADMIN_SIGNUP_CODE`
2. Check email uniqueness
3. Create `Account` with `status: PENDING`, store requested fields
4. Find or create `Admin` role
5. Create `User` with bcrypt-hashed password linked to account
6. Return `{ message: 'Signup successful. Awaiting super admin approval.' }`

**Login guard change:** On login, check if `account.status === PENDING` → throw 403 `'Account pending approval'`. If `INACTIVE` → throw 403 `'Account deactivated'`.

### 3. Super Admin Module — `backend/src/superadmin/`

New NestJS module. All routes guarded by `@Roles('SuperAdmin')`.

| Endpoint | Description |
|---|---|
| `GET /api/superadmin/companies` | All companies (any status), with user count, call count |
| `GET /api/superadmin/companies/:id` | Single company detail |
| `POST /api/superadmin/companies/:id/approve` | Approve + assign `agentLimit` + `numberPool` |
| `POST /api/superadmin/companies/:id/reject` | Reject with `{ reason }` |
| `POST /api/superadmin/companies/:id/deactivate` | Set INACTIVE, invalidates sessions |
| `POST /api/superadmin/companies/:id/activate` | Set ACTIVE |
| `GET /api/superadmin/analytics` | All companies call stats (daily/weekly/monthly) |
| `GET /api/superadmin/analytics/:id` | Single company stats |

**Approve body:**
```typescript
{
  agentLimit: number
  numberPool: Array<{ number: string, callerName: string, areaCode: string }>
}
```

**Analytics response shape (per company):**
```typescript
{
  accountId, companyName,
  daily:   { calls, connectedCalls, totalMinutes, avgDuration },
  weekly:  { calls, connectedCalls, totalMinutes, avgDuration },
  monthly: { calls, connectedCalls, totalMinutes, avgDuration }
}
```

---

## Frontend Changes

### 1. Signup Page — `frontend/src/pages/Signup.jsx`

Add fields: `lastName`, `phone`, `companyName`, `adminCode`, `requestedAgentLimit`, `requestedNumbers`.  
On success show: "Signup successful! Super admin will review and activate your account."  
No token stored — they must wait for approval before logging in.

### 2. New Super Admin Dashboard — `frontend/src/pages/SuperAdmin.jsx`

Three tabs:

**Tab 1 — Pending Requests**
- Table: company name, admin name, email, phone, requested agents, requested numbers, signup date
- Actions per row: Approve (opens modal to set agentLimit + paste numbers) | Reject (with reason)

**Tab 2 — All Companies**
- Table: company name, status badge (PENDING/ACTIVE/INACTIVE), admin email, agent count, total calls
- Actions: Activate / Deactivate toggle

**Tab 3 — Analytics**
- Company selector dropdown OR table of all companies
- Per company: Day / Week / Month tabs showing calls, connected calls, total minutes, avg duration

### 3. Routing — `frontend/src/App.jsx`

- Add `/superadmin` route → `SuperAdmin` page, protected, SuperAdmin role only
- Fix `ProtectedRoute` to enforce role (not just token presence)
- Post-login redirect: `superadmin` → `/superadmin`, `admin` → `/admin`, `agent` → `/agent`

### 4. Login Block UX

If backend returns 403 on login:
- `'Account pending approval'` → show orange banner: "Your account is under review."
- `'Account deactivated'` → show red banner: "Account deactivated. Contact support."

---

## Security Fixes (included in scope)

1. `ProtectedRoute` must check role, not just token presence
2. Dialer and analytics endpoints must be protected (at minimum require valid JWT — public flag removed)
3. `sipPassword` should not be returned in user list API responses

---

## What Is NOT in Scope

- Email notifications (can be added later)
- Payment/billing integration
- Agent self-service password reset
- Multi-region number pools

---

## File Impact Summary

| File | Change Type |
|---|---|
| `backend/prisma/schema.prisma` | Modify — add PENDING status, new Account fields |
| `backend/src/auth/auth.service.ts` | Modify — add signup(), update login() to check account status |
| `backend/src/auth/auth.controller.ts` | Modify — add POST /signup route |
| `backend/src/auth/dto/signup.dto.ts` | Create |
| `backend/src/superadmin/superadmin.module.ts` | Create |
| `backend/src/superadmin/superadmin.controller.ts` | Create |
| `backend/src/superadmin/superadmin.service.ts` | Create |
| `backend/src/app.module.ts` | Modify — register SuperAdminModule |
| `frontend/src/pages/Signup.jsx` | Modify — add new fields |
| `frontend/src/pages/SuperAdmin.jsx` | Create — full super admin dashboard |
| `frontend/src/App.jsx` | Modify — add /superadmin route, fix ProtectedRoute |
| `frontend/src/pages/Login.jsx` | Modify — handle 403 status messages |

# Multi-Tenant Super Admin System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete company onboarding, super admin approval, and multi-tenant control system so companies can self-register, super admin approves and allocates resources, company admins manage agents, and agents only dial.

**Architecture:** NestJS backend with a new `SuperAdminModule`, updated `AuthModule` for signup + account-status login guards, Prisma schema extended with `PENDING` account status and request fields, and a new React `SuperAdmin` page with three tabs (Pending, Companies, Analytics).

**Tech Stack:** NestJS, Prisma (PostgreSQL/Supabase), class-validator DTOs, bcryptjs, JWT, React + React Router

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `backend/prisma/schema.prisma` | Modify | Add `PENDING` to `AccountStatus`, add 4 new `Account` fields |
| `backend/src/auth/dto/signup.dto.ts` | Create | Validate signup request body |
| `backend/src/auth/auth.service.ts` | Modify | Add `signup()`, update `validateUser()` to block PENDING/INACTIVE |
| `backend/src/auth/auth.controller.ts` | Modify | Add `POST /api/auth/signup` public route |
| `backend/src/superadmin/superadmin.module.ts` | Create | NestJS module declaration |
| `backend/src/superadmin/superadmin.service.ts` | Create | All super admin business logic |
| `backend/src/superadmin/superadmin.controller.ts` | Create | All super admin HTTP endpoints |
| `backend/src/app.module.ts` | Modify | Register `SuperAdminModule` |
| `frontend/src/pages/Signup.jsx` | Modify | Add `adminCode`, `requestedAgentLimit`, `requestedNumbers` fields; show pending message |
| `frontend/src/pages/SuperAdmin.jsx` | Create | 3-tab super admin dashboard |
| `frontend/src/pages/Login.jsx` | Modify | Handle 403 with account status messages |
| `frontend/src/App.jsx` | Modify | Add `/superadmin` route, fix `ProtectedRoute` to enforce role |

---

## Task 1: Prisma Schema — Add PENDING + Request Fields

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Update the `AccountStatus` enum and `Account` model**

Open `backend/prisma/schema.prisma`. Replace the `AccountStatus` enum and `Account` model with:

```prisma
enum AccountStatus {
  PENDING
  ACTIVE
  INACTIVE
}

model Account {
  id                  String              @id @default(uuid())
  name                String
  status              AccountStatus       @default(PENDING)
  createdAt           DateTime            @default(now())
  updatedAt           DateTime            @updatedAt
  numberPool          Json?
  agentLimit          Int?                @default(10)
  approved            Boolean             @default(false)
  requestedAgentLimit Int?
  requestedNumbers    Int?
  rejectionReason     String?
  approvedAt          DateTime?
  adminPhone          String?
  campaigns           Campaign[]
  leads               Lead[]
  lists               List[]
  teams               Team[]
  users               User[]
  VoicemailTemplate   VoicemailTemplate[]
}
```

- [ ] **Step 2: Run migration**

```powershell
cd D:\Voxiq-mb-dailer\backend
npx prisma migrate dev --name add_pending_account_fields
```

Expected output:
```
Applying migration `..._add_pending_account_fields`
Your database is now in sync with your schema.
```

- [ ] **Step 3: Regenerate Prisma client**

```powershell
npx prisma generate
```

Expected: `✔ Generated Prisma Client`

- [ ] **Step 4: Commit**

```powershell
cd D:\Voxiq-mb-dailer
git add backend/prisma/
git commit -m "feat(db): add PENDING account status and request fields"
```

---

## Task 2: Auth — Signup DTO

**Files:**
- Create: `backend/src/auth/dto/signup.dto.ts`

- [ ] **Step 1: Create the DTO file**

Create `backend/src/auth/dto/signup.dto.ts`:

```typescript
import { IsEmail, IsInt, IsString, Min, MinLength } from 'class-validator';

export class SignupDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @MinLength(1)
  lastName: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @MinLength(1)
  phone: string;

  @IsString()
  @MinLength(1)
  companyName: string;

  @IsString()
  @MinLength(1)
  adminCode: string;

  @IsInt()
  @Min(1)
  requestedAgentLimit: number;

  @IsInt()
  @Min(1)
  requestedNumbers: number;
}
```

- [ ] **Step 2: Commit**

```powershell
cd D:\Voxiq-mb-dailer
git add backend/src/auth/dto/signup.dto.ts
git commit -m "feat(auth): add SignupDto"
```

---

## Task 3: Auth Service — signup() + login guard

**Files:**
- Modify: `backend/src/auth/auth.service.ts`

- [ ] **Step 1: Replace auth.service.ts with updated version**

Replace the entire content of `backend/src/auth/auth.service.ts`:

```typescript
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AccountStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { SignupDto } from './dto/signup.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async signup(dto: SignupDto) {
    // 1. Validate admin code
    if (dto.adminCode !== process.env.ADMIN_SIGNUP_CODE) {
      throw new ForbiddenException('Invalid admin code');
    }

    // 2. Check email uniqueness
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new BadRequestException('Email already registered');
    }

    // 3. Find or create Admin role
    let adminRole = await this.prisma.role.findFirst({
      where: { name: { equals: 'Admin', mode: 'insensitive' } },
    });
    if (!adminRole) {
      adminRole = await this.prisma.role.create({ data: { name: 'Admin' } });
    }

    // 4. Create Account in PENDING state
    const account = await this.prisma.account.create({
      data: {
        name: dto.companyName,
        status: AccountStatus.PENDING,
        approved: false,
        requestedAgentLimit: dto.requestedAgentLimit,
        requestedNumbers: dto.requestedNumbers,
        adminPhone: dto.phone,
      },
    });

    // 5. Create the company admin user
    const passwordHash = await bcrypt.hash(dto.password, 10);
    await this.prisma.user.create({
      data: {
        name: `${dto.name} ${dto.lastName}`.trim(),
        email: dto.email.toLowerCase(),
        passwordHash,
        roleId: adminRole.id,
        accountId: account.id,
      },
    });

    return {
      message:
        'Signup successful. Your account is under review. You will be able to login once approved.',
    };
  }

  async validateUser(email: string, password: string) {
    console.log(`Validating user: ${email}`);
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { role: true, account: { select: { status: true } } },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Block login if account is PENDING or INACTIVE
    if (user.account?.status === AccountStatus.PENDING) {
      throw new ForbiddenException('Account pending approval');
    }
    if (user.account?.status === AccountStatus.INACTIVE) {
      throw new ForbiddenException('Account deactivated');
    }

    const { passwordHash, account, ...safeUser } = user as any;
    return safeUser;
  }

  async login(user: any) {
    const payload = {
      sub: user.id,
      role: user.role?.name,
      accountId: user.accountId,
      teamId: user.teamId,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role?.name,
        accountId: user.accountId,
        teamId: user.teamId,
        status: user.status,
        createdAt: user.createdAt,
      },
    };
  }
}
```

- [ ] **Step 2: Commit**

```powershell
cd D:\Voxiq-mb-dailer
git add backend/src/auth/auth.service.ts
git commit -m "feat(auth): add signup() and block PENDING/INACTIVE accounts on login"
```

---

## Task 4: Auth Controller — Add POST /signup

**Files:**
- Modify: `backend/src/auth/auth.controller.ts`

- [ ] **Step 1: Replace auth.controller.ts**

Replace the entire content of `backend/src/auth/auth.controller.ts`:

```typescript
import { Body, Controller, Post, Get, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { Public } from './decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('signup')
  async signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  @Public()
  @Post('login')
  async login(@Body() dto: LoginDto) {
    const user = await this.authService.validateUser(dto.email, dto.password);
    return this.authService.login(user);
  }

  @Get('profile')
  getProfile(@Req() req: any) {
    return req.user;
  }
}
```

- [ ] **Step 2: Commit**

```powershell
cd D:\Voxiq-mb-dailer
git add backend/src/auth/auth.controller.ts
git commit -m "feat(auth): add POST /api/auth/signup endpoint"
```

---

## Task 5: SuperAdmin Module — Service

**Files:**
- Create: `backend/src/superadmin/superadmin.service.ts`

- [ ] **Step 1: Create the service file**

Create `backend/src/superadmin/superadmin.service.ts`:

```typescript
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AccountStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SuperAdminService {
  constructor(private prisma: PrismaService) {}

  /** List all companies with user count and call count */
  async getAllCompanies() {
    const accounts = await this.prisma.account.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        users: {
          select: { id: true, name: true, email: true, role: { select: { name: true } } },
        },
        _count: { select: { users: true } },
      },
    });

    return accounts.map((acc) => ({
      id: acc.id,
      name: acc.name,
      status: acc.status,
      approved: acc.approved,
      agentLimit: acc.agentLimit,
      requestedAgentLimit: acc.requestedAgentLimit,
      requestedNumbers: acc.requestedNumbers,
      adminPhone: acc.adminPhone,
      rejectionReason: acc.rejectionReason,
      approvedAt: acc.approvedAt,
      createdAt: acc.createdAt,
      userCount: acc._count.users,
      adminEmail: acc.users.find(
        (u) => u.role?.name?.toLowerCase() === 'admin',
      )?.email ?? null,
      adminName: acc.users.find(
        (u) => u.role?.name?.toLowerCase() === 'admin',
      )?.name ?? null,
    }));
  }

  /** Approve a company — set ACTIVE, assign agentLimit and numberPool */
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

  /** Reject a pending company signup */
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

  /** Deactivate a company — blocks all logins */
  async deactivateCompany(accountId: string) {
    const account = await this.prisma.account.findUnique({ where: { id: accountId } });
    if (!account) throw new NotFoundException('Company not found');

    return this.prisma.account.update({
      where: { id: accountId },
      data: { status: AccountStatus.INACTIVE },
    });
  }

  /** Reactivate a company */
  async activateCompany(accountId: string) {
    const account = await this.prisma.account.findUnique({ where: { id: accountId } });
    if (!account) throw new NotFoundException('Company not found');

    return this.prisma.account.update({
      where: { id: accountId },
      data: { status: AccountStatus.ACTIVE, approved: true },
    });
  }

  /** Analytics for all companies: daily/weekly/monthly call stats */
  async getAnalytics() {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const accounts = await this.prisma.account.findMany({
      where: { status: AccountStatus.ACTIVE },
      select: { id: true, name: true },
    });

    const results = await Promise.all(
      accounts.map(async (acc) => {
        const [daily, weekly, monthly] = await Promise.all([
          this.getAccountStats(acc.id, dayAgo),
          this.getAccountStats(acc.id, weekAgo),
          this.getAccountStats(acc.id, monthAgo),
        ]);
        return { accountId: acc.id, companyName: acc.name, daily, weekly, monthly };
      }),
    );

    return results;
  }

  /** Analytics for a single company */
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

  private async getAccountStats(accountId: string, since: Date) {
    const logs = await this.prisma.callLog.findMany({
      where: {
        startedAt: { gte: since },
        agent: { accountId },
      },
      select: { startedAt: true, endedAt: true, callStatus: true },
    });

    const calls = logs.length;
    const connectedCalls = logs.filter((l) => l.callStatus === 'CONNECTED' || l.callStatus === 'COMPLETED').length;
    const totalSeconds = logs.reduce((sum, l) => {
      if (!l.endedAt) return sum;
      return sum + (l.endedAt.getTime() - l.startedAt.getTime()) / 1000;
    }, 0);
    const totalMinutes = Math.round(totalSeconds / 60);
    const avgDuration = calls > 0 ? Math.round(totalSeconds / calls) : 0;

    return { calls, connectedCalls, totalMinutes, avgDuration };
  }
}
```

- [ ] **Step 2: Commit**

```powershell
cd D:\Voxiq-mb-dailer
git add backend/src/superadmin/superadmin.service.ts
git commit -m "feat(superadmin): add SuperAdminService"
```

---

## Task 6: SuperAdmin Module — Controller + Module

**Files:**
- Create: `backend/src/superadmin/superadmin.controller.ts`
- Create: `backend/src/superadmin/superadmin.module.ts`

- [ ] **Step 1: Create the controller**

Create `backend/src/superadmin/superadmin.controller.ts`:

```typescript
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { SuperAdminService } from './superadmin.service';

class ApproveDto {
  agentLimit: number;
  numberPool: Array<{ number: string; callerName: string; areaCode: string }>;
}

class RejectDto {
  reason: string;
}

@Controller('superadmin')
@Roles('SuperAdmin')
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  @Get('companies')
  getAllCompanies() {
    return this.superAdminService.getAllCompanies();
  }

  @Post('companies/:id/approve')
  approveCompany(@Param('id') id: string, @Body() dto: ApproveDto) {
    return this.superAdminService.approveCompany(id, dto.agentLimit, dto.numberPool);
  }

  @Post('companies/:id/reject')
  rejectCompany(@Param('id') id: string, @Body() dto: RejectDto) {
    return this.superAdminService.rejectCompany(id, dto.reason);
  }

  @Post('companies/:id/deactivate')
  deactivateCompany(@Param('id') id: string) {
    return this.superAdminService.deactivateCompany(id);
  }

  @Post('companies/:id/activate')
  activateCompany(@Param('id') id: string) {
    return this.superAdminService.activateCompany(id);
  }

  @Get('analytics')
  getAnalytics() {
    return this.superAdminService.getAnalytics();
  }

  @Get('analytics/:id')
  getCompanyAnalytics(@Param('id') id: string) {
    return this.superAdminService.getCompanyAnalytics(id);
  }
}
```

- [ ] **Step 2: Create the module**

Create `backend/src/superadmin/superadmin.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SuperAdminController } from './superadmin.controller';
import { SuperAdminService } from './superadmin.service';

@Module({
  imports: [PrismaModule],
  controllers: [SuperAdminController],
  providers: [SuperAdminService],
})
export class SuperAdminModule {}
```

- [ ] **Step 3: Register in app.module.ts**

Open `backend/src/app.module.ts`. At the top, add the import:
```typescript
import { SuperAdminModule } from './superadmin/superadmin.module';
```

Inside the `imports: [...]` array (add after the last existing module, before the closing `]`):
```typescript
SuperAdminModule,
```

- [ ] **Step 4: Commit**

```powershell
cd D:\Voxiq-mb-dailer
git add backend/src/superadmin/ backend/src/app.module.ts
git commit -m "feat(superadmin): add SuperAdminModule, controller, and register in app"
```

---

## Task 7: Seed Super Admin User

The super admin user `barkatdanish30@gmail.com` needs to exist in the DB with the `SuperAdmin` role before the system can be used. We'll create a seed script.

**Files:**
- Create: `backend/prisma/seed-superadmin.ts`

- [ ] **Step 1: Create seed script**

Create `backend/prisma/seed-superadmin.ts`:

```typescript
import { PrismaClient, AccountStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL || 'barkatdanish30@gmail.com';
  const password = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@2024';

  // 1. Upsert SuperAdmin role
  const role = await prisma.role.upsert({
    where: { name: 'SuperAdmin' },
    update: {},
    create: { name: 'SuperAdmin' },
  });
  console.log(`Role: ${role.name} (${role.id})`);

  // 2. Upsert Admin role (needed for company admins)
  await prisma.role.upsert({
    where: { name: 'Admin' },
    update: {},
    create: { name: 'Admin' },
  });

  // 3. Upsert Agent role
  await prisma.role.upsert({
    where: { name: 'Agent' },
    update: {},
    create: { name: 'Agent' },
  });

  // 4. Upsert super admin account
  const account = await prisma.account.upsert({
    where: { id: 'super-admin-account' },
    update: {},
    create: {
      id: 'super-admin-account',
      name: 'Voxiq Platform',
      status: AccountStatus.ACTIVE,
      approved: true,
      agentLimit: 999,
    },
  });
  console.log(`Account: ${account.name} (${account.id})`);

  // 5. Upsert super admin user
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: { roleId: role.id },
    create: {
      name: 'Super Admin',
      email: email.toLowerCase(),
      passwordHash,
      roleId: role.id,
      accountId: account.id,
    },
  });
  console.log(`Super admin: ${user.email}`);
  console.log('Done! Super admin seeded successfully.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 2: Run the seed script**

```powershell
cd D:\Voxiq-mb-dailer\backend
npx ts-node -e "require('dotenv').config(); require('./prisma/seed-superadmin.ts')" 
```

If ts-node isn't available, run:
```powershell
npx tsx prisma/seed-superadmin.ts
```

Expected output:
```
Role: SuperAdmin (...)
Account: Voxiq Platform (super-admin-account)
Super admin: barkatdanish30@gmail.com
Done! Super admin seeded successfully.
```

- [ ] **Step 3: Commit**

```powershell
cd D:\Voxiq-mb-dailer
git add backend/prisma/seed-superadmin.ts
git commit -m "feat(db): add super admin seed script"
```

---

## Task 8: Frontend — Update Signup Page

**Files:**
- Modify: `frontend/src/pages/Signup.jsx`

- [ ] **Step 1: Replace Signup.jsx**

Replace the entire content of `frontend/src/pages/Signup.jsx`:

```jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { API_URL } from '../config/env';
import { fetchJson } from '../lib/api';
import { countries } from '../lib/countries';

export default function Signup() {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        countryCode: '+1',
        phone: '',
        companyName: '',
        adminCode: '',
        requestedAgentLimit: 1,
        requestedNumbers: 1,
        password: '',
        confirmPassword: '',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const handleChange = (e) => {
        const value = e.target.type === 'number' ? Number(e.target.value) : e.target.value;
        setFormData({ ...formData, [e.target.name]: value });
    };

    const handleSignup = async (e) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            await fetchJson(`${API_URL}/auth/signup`, {
                method: 'POST',
                body: JSON.stringify({
                    name: formData.firstName,
                    lastName: formData.lastName,
                    email: formData.email,
                    password: formData.password,
                    phone: `${formData.countryCode}${formData.phone}`,
                    companyName: formData.companyName,
                    adminCode: formData.adminCode,
                    requestedAgentLimit: formData.requestedAgentLimit,
                    requestedNumbers: formData.requestedNumbers,
                }),
            });
            setSuccess(true);
        } catch (err) {
            setError(err.message || 'Signup failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    if (success) {
        return (
            <div className="auth-page">
                <div className="auth-card" style={{ maxWidth: 480, textAlign: 'center', padding: '48px 32px' }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
                    <h2 style={{ marginBottom: 8 }}>Request Submitted!</h2>
                    <p style={{ color: '#6b7280', marginBottom: 24 }}>
                        Your company account is under review. The Voxiq team will activate your account shortly.
                        You will be able to login once approved.
                    </p>
                    <Link to="/login" className="auth-btn-primary" style={{ display: 'inline-block', textDecoration: 'none' }}>
                        Go to Login →
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-page">
            <div className="auth-card auth-card-wide">
                <div className="auth-left">
                    <h2>Join<br />Voxiq</h2>
                    <p>Register your company for access to the next generation sales dialer.</p>
                    <div className="auth-feature-list">
                        <div className="auth-feature-item">
                            <span className="auth-feature-check">✓</span>
                            Company Admin Access
                        </div>
                        <div className="auth-feature-item">
                            <span className="auth-feature-check">✓</span>
                            Managed Agent Seats
                        </div>
                        <div className="auth-feature-item">
                            <span className="auth-feature-check">✓</span>
                            Dedicated Phone Numbers
                        </div>
                    </div>
                </div>

                <div className="auth-right">
                    <div className="auth-logo-box">
                        <img src="/logo.png" alt="Voxiq" style={{ height: '44px' }} />
                    </div>
                    <h1>Company Registration</h1>
                    <p className="auth-subtitle">Admins only — agents are added by your admin after approval</p>

                    {error && <div className="auth-error">{error}</div>}

                    <form onSubmit={handleSignup} className="auth-form">
                        <div className="auth-field-row">
                            <div className="auth-field">
                                <label>First Name</label>
                                <input name="firstName" type="text" placeholder="Jane" value={formData.firstName} onChange={handleChange} required />
                            </div>
                            <div className="auth-field">
                                <label>Last Name</label>
                                <input name="lastName" type="text" placeholder="Doe" value={formData.lastName} onChange={handleChange} required />
                            </div>
                        </div>

                        <div className="auth-field">
                            <label>Work Email</label>
                            <input name="email" type="email" placeholder="jane@company.com" value={formData.email} onChange={handleChange} required />
                        </div>

                        <div className="auth-field-row">
                            <div className="auth-field">
                                <label>Company Name</label>
                                <input name="companyName" type="text" placeholder="Acme Inc." value={formData.companyName} onChange={handleChange} required />
                            </div>
                            <div className="auth-field">
                                <label>Phone Number</label>
                                <div className="auth-phone-row">
                                    <select name="countryCode" value={formData.countryCode} onChange={handleChange} className="auth-phone-code" required>
                                        {countries.map(c => <option key={`${c.name}-${c.code}`} value={c.code}>{c.code}</option>)}
                                    </select>
                                    <input name="phone" type="tel" placeholder="555-0000" value={formData.phone} onChange={handleChange} required />
                                </div>
                            </div>
                        </div>

                        <div className="auth-field">
                            <label>Admin Code <span style={{ color: '#9ca3af', fontWeight: 400 }}>(provided by Voxiq)</span></label>
                            <input name="adminCode" type="text" placeholder="Enter your admin access code" value={formData.adminCode} onChange={handleChange} required />
                        </div>

                        <div className="auth-field-row">
                            <div className="auth-field">
                                <label>Agents Needed</label>
                                <input name="requestedAgentLimit" type="number" min="1" max="100" value={formData.requestedAgentLimit} onChange={handleChange} required />
                            </div>
                            <div className="auth-field">
                                <label>Phone Numbers Needed</label>
                                <input name="requestedNumbers" type="number" min="1" max="50" value={formData.requestedNumbers} onChange={handleChange} required />
                            </div>
                        </div>

                        <div className="auth-field-row">
                            <div className="auth-field">
                                <label>Password</label>
                                <input name="password" type="password" placeholder="••••••••" value={formData.password} onChange={handleChange} required />
                            </div>
                            <div className="auth-field">
                                <label>Confirm Password</label>
                                <input name="confirmPassword" type="password" placeholder="••••••••" value={formData.confirmPassword} onChange={handleChange} required />
                            </div>
                        </div>

                        <button type="submit" className="auth-btn-primary" disabled={isLoading}>
                            {isLoading ? 'Submitting…' : 'Submit Registration →'}
                        </button>

                        <p className="auth-switch">
                            Already approved? <Link to="/login">Sign in</Link>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Commit**

```powershell
cd D:\Voxiq-mb-dailer
git add frontend/src/pages/Signup.jsx
git commit -m "feat(frontend): update signup page with admin code and resource request fields"
```

---

## Task 9: Frontend — SuperAdmin Dashboard

**Files:**
- Create: `frontend/src/pages/SuperAdmin.jsx`

- [ ] **Step 1: Create SuperAdmin.jsx**

Create `frontend/src/pages/SuperAdmin.jsx`:

```jsx
import { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../config/env';
import { fetchJson } from '../lib/api';

const STATUS_COLORS = {
  PENDING: { bg: '#fef3c7', color: '#92400e', label: 'Pending' },
  ACTIVE: { bg: '#d1fae5', color: '#065f46', label: 'Active' },
  INACTIVE: { bg: '#fee2e2', color: '#991b1b', label: 'Inactive' },
};

function StatusBadge({ status }) {
  const s = STATUS_COLORS[status] || STATUS_COLORS.INACTIVE;
  return (
    <span style={{ background: s.bg, color: s.color, padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
      {s.label}
    </span>
  );
}

function ApproveModal({ company, onClose, onApproved }) {
  const [agentLimit, setAgentLimit] = useState(company.requestedAgentLimit || 1);
  const [numbersText, setNumbersText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleApprove = async () => {
    setLoading(true);
    setError(null);
    try {
      const lines = numbersText.trim().split('\n').map(l => l.trim()).filter(Boolean);
      const numberPool = lines.map(l => {
        const parts = l.split(',').map(p => p.trim());
        return { number: parts[0] || l, callerName: parts[1] || 'Voxiq', areaCode: parts[2] || '' };
      });
      await fetchJson(`${API_URL}/superadmin/companies/${company.id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ agentLimit: Number(agentLimit), numberPool }),
      });
      onApproved();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 32, width: 480, maxWidth: '90vw' }}>
        <h3 style={{ margin: '0 0 4px' }}>Approve — {company.name}</h3>
        <p style={{ color: '#6b7280', margin: '0 0 20px', fontSize: 14 }}>
          Requested: {company.requestedAgentLimit} agents, {company.requestedNumbers} numbers
        </p>
        {error && <div style={{ background: '#fee2e2', color: '#991b1b', padding: '8px 12px', borderRadius: 6, marginBottom: 16 }}>{error}</div>}
        <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Agent Limit</label>
        <input type="number" min="1" value={agentLimit} onChange={e => setAgentLimit(e.target.value)}
          style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, marginBottom: 16, boxSizing: 'border-box' }} />
        <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Phone Numbers</label>
        <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 6px' }}>One per line. Format: +1XXXXXXXXXX, Caller Name, AreaCode</p>
        <textarea rows={5} value={numbersText} onChange={e => setNumbersText(e.target.value)}
          placeholder={'+14422039259, Voxiq Sales, 442\n+14422039260, Voxiq Support, 442'}
          style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, marginBottom: 20, boxSizing: 'border-box', fontFamily: 'monospace', fontSize: 13 }} />
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 20px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleApprove} disabled={loading}
            style={{ padding: '8px 20px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
            {loading ? 'Approving…' : 'Approve & Activate'}
          </button>
        </div>
      </div>
    </div>
  );
}

function RejectModal({ company, onClose, onRejected }) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReject = async () => {
    setLoading(true);
    try {
      await fetchJson(`${API_URL}/superadmin/companies/${company.id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      onRejected();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 32, width: 400 }}>
        <h3 style={{ margin: '0 0 16px' }}>Reject — {company.name}</h3>
        <label style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Reason</label>
        <textarea rows={3} value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason for rejection..."
          style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, marginBottom: 20, boxSizing: 'border-box' }} />
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 20px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleReject} disabled={loading || !reason.trim()}
            style={{ padding: '8px 20px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
            {loading ? 'Rejecting…' : 'Reject'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SuperAdmin() {
  const [tab, setTab] = useState('pending');
  const [companies, setCompanies] = useState([]);
  const [analytics, setAnalytics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [approveModal, setApproveModal] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [analyticsPeriod, setAnalyticsPeriod] = useState('daily');

  const loadCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchJson(`${API_URL}/superadmin/companies`);
      setCompanies(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const data = await fetchJson(`${API_URL}/superadmin/analytics`);
      setAnalytics(data);
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  useEffect(() => { loadCompanies(); }, [loadCompanies]);

  useEffect(() => {
    if (tab === 'analytics') loadAnalytics();
  }, [tab, loadAnalytics]);

  const handleToggle = async (company) => {
    const endpoint = company.status === 'ACTIVE' ? 'deactivate' : 'activate';
    try {
      await fetchJson(`${API_URL}/superadmin/companies/${company.id}/${endpoint}`, { method: 'POST' });
      loadCompanies();
    } catch (err) {
      alert(err.message);
    }
  };

  const pending = companies.filter(c => c.status === 'PENDING');
  const all = companies;

  const tabStyle = (t) => ({
    padding: '10px 24px', border: 'none', background: tab === t ? '#111827' : 'transparent',
    color: tab === t ? '#fff' : '#6b7280', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14,
  });

  const thStyle = { padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e5e7eb' };
  const tdStyle = { padding: '14px 16px', borderBottom: '1px solid #f3f4f6', fontSize: 14 };

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ background: '#111827', color: '#fff', padding: '20px 32px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <img src="/logo.png" alt="Voxiq" style={{ height: 32 }} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 18 }}>Super Admin</div>
          <div style={{ fontSize: 12, color: '#9ca3af' }}>Platform Control Center</div>
        </div>
        {pending.length > 0 && (
          <div style={{ marginLeft: 'auto', background: '#ef4444', borderRadius: 20, padding: '4px 12px', fontSize: 13, fontWeight: 700 }}>
            {pending.length} pending
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ padding: '16px 32px', background: '#fff', borderBottom: '1px solid #e5e7eb', display: 'flex', gap: 8 }}>
        <button style={tabStyle('pending')} onClick={() => setTab('pending')}>
          Pending Requests {pending.length > 0 && `(${pending.length})`}
        </button>
        <button style={tabStyle('companies')} onClick={() => setTab('companies')}>All Companies</button>
        <button style={tabStyle('analytics')} onClick={() => setTab('analytics')}>Analytics</button>
      </div>

      <div style={{ padding: 32 }}>
        {loading && tab !== 'analytics' && (
          <div style={{ textAlign: 'center', color: '#6b7280', padding: 48 }}>Loading…</div>
        )}

        {/* PENDING TAB */}
        {!loading && tab === 'pending' && (
          <>
            {pending.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#6b7280', padding: 48 }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
                No pending requests
              </div>
            ) : (
              <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Company</th>
                      <th style={thStyle}>Admin</th>
                      <th style={thStyle}>Phone</th>
                      <th style={thStyle}>Requested</th>
                      <th style={thStyle}>Date</th>
                      <th style={thStyle}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pending.map(c => (
                      <tr key={c.id}>
                        <td style={tdStyle}><strong>{c.name}</strong></td>
                        <td style={tdStyle}>
                          <div>{c.adminName}</div>
                          <div style={{ color: '#6b7280', fontSize: 12 }}>{c.adminEmail}</div>
                        </td>
                        <td style={tdStyle}>{c.adminPhone || '—'}</td>
                        <td style={tdStyle}>
                          <div>{c.requestedAgentLimit} agents</div>
                          <div style={{ color: '#6b7280', fontSize: 12 }}>{c.requestedNumbers} numbers</div>
                        </td>
                        <td style={tdStyle}>{new Date(c.createdAt).toLocaleDateString()}</td>
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => setApproveModal(c)}
                              style={{ padding: '6px 14px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                              Approve
                            </button>
                            <button onClick={() => setRejectModal(c)}
                              style={{ padding: '6px 14px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ALL COMPANIES TAB */}
        {!loading && tab === 'companies' && (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Company</th>
                  <th style={thStyle}>Admin</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Agents</th>
                  <th style={thStyle}>Joined</th>
                  <th style={thStyle}>Action</th>
                </tr>
              </thead>
              <tbody>
                {all.map(c => (
                  <tr key={c.id}>
                    <td style={tdStyle}><strong>{c.name}</strong></td>
                    <td style={tdStyle}>
                      <div>{c.adminName}</div>
                      <div style={{ color: '#6b7280', fontSize: 12 }}>{c.adminEmail}</div>
                    </td>
                    <td style={tdStyle}><StatusBadge status={c.status} /></td>
                    <td style={tdStyle}>{c.userCount} / {c.agentLimit ?? '—'}</td>
                    <td style={tdStyle}>{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td style={tdStyle}>
                      {c.status !== 'PENDING' && (
                        <button onClick={() => handleToggle(c)}
                          style={{
                            padding: '6px 14px', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13,
                            background: c.status === 'ACTIVE' ? '#fee2e2' : '#d1fae5',
                            color: c.status === 'ACTIVE' ? '#991b1b' : '#065f46',
                          }}>
                          {c.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ANALYTICS TAB */}
        {tab === 'analytics' && (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
              {['daily', 'weekly', 'monthly'].map(p => (
                <button key={p} onClick={() => setAnalyticsPeriod(p)}
                  style={{ padding: '8px 20px', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13,
                    background: analyticsPeriod === p ? '#111827' : '#fff', color: analyticsPeriod === p ? '#fff' : '#6b7280',
                    border: analyticsPeriod === p ? 'none' : '1px solid #e5e7eb' }}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
            {analyticsLoading ? (
              <div style={{ textAlign: 'center', color: '#6b7280', padding: 48 }}>Loading analytics…</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                {analytics.map(a => {
                  const stats = a[analyticsPeriod];
                  return (
                    <div key={a.accountId} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20 }}>
                      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>{a.companyName}</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        {[
                          { label: 'Total Calls', value: stats.calls },
                          { label: 'Connected', value: stats.connectedCalls },
                          { label: 'Total Minutes', value: stats.totalMinutes },
                          { label: 'Avg Duration', value: `${stats.avgDuration}s` },
                        ].map(({ label, value }) => (
                          <div key={label} style={{ background: '#f9fafb', borderRadius: 8, padding: '12px 16px' }}>
                            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>{label}</div>
                            <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {analytics.length === 0 && !analyticsLoading && (
                  <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#6b7280', padding: 48 }}>No active companies yet</div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {approveModal && (
        <ApproveModal
          company={approveModal}
          onClose={() => setApproveModal(null)}
          onApproved={() => { setApproveModal(null); loadCompanies(); }}
        />
      )}
      {rejectModal && (
        <RejectModal
          company={rejectModal}
          onClose={() => setRejectModal(null)}
          onRejected={() => { setRejectModal(null); loadCompanies(); }}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```powershell
cd D:\Voxiq-mb-dailer
git add frontend/src/pages/SuperAdmin.jsx
git commit -m "feat(frontend): add SuperAdmin dashboard with pending/companies/analytics tabs"
```

---

## Task 10: Frontend — Fix Routing + Login Error Messages

**Files:**
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/pages/Login.jsx`

- [ ] **Step 1: Update App.jsx**

Replace the entire content of `frontend/src/App.jsx`:

```jsx
import { BrowserRouter, Route, Routes, useLocation, Navigate } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import Agent from './pages/Agent'
import Admin from './pages/Admin'
import Manager from './pages/Manager'
import SuperAdmin from './pages/SuperAdmin'
import Home from './pages/Home'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Navbar from './components/Navbar'
import { getToken } from './lib/auth'
import { SoftphoneProvider } from './context/SoftphoneContext'
import './App.css'

function getUserRole() {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.role?.toLowerCase() || null;
  } catch {
    return null;
  }
}

function ProtectedRoute({ children, allowedRoles }) {
  const token = getToken();
  if (!token) return <Navigate to="/login" replace />;

  if (allowedRoles) {
    const role = getUserRole();
    if (!allowedRoles.includes(role)) {
      // Redirect to correct dashboard
      if (role === 'superadmin') return <Navigate to="/superadmin" replace />;
      if (role === 'admin') return <Navigate to="/admin" replace />;
      if (role === 'manager') return <Navigate to="/manager" replace />;
      return <Navigate to="/agent" replace />;
    }
  }

  return children;
}

function PageWrapper({ children }) {
  const location = useLocation();
  const ref = useRef(null);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const el = ref.current;
    if (el) { el.style.animation = 'none'; void el.offsetWidth; el.style.animation = ''; }
  }, [location.pathname]);
  return <div ref={ref} className="page-enter">{children}</div>;
}

function AppRoutes() {
  return (
    <PageWrapper>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/superadmin" element={
          <ProtectedRoute allowedRoles={['superadmin']}>
            <SuperAdmin />
          </ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Admin />
          </ProtectedRoute>
        } />
        <Route path="/manager" element={
          <ProtectedRoute allowedRoles={['manager']}>
            <Manager />
          </ProtectedRoute>
        } />
        <Route path="/agent" element={
          <ProtectedRoute allowedRoles={['agent']}>
            <Agent />
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </PageWrapper>
  );
}

function App() {
  return (
    <BrowserRouter>
      <SoftphoneProvider>
        <div className="shell">
          <NavbarWrapper />
          <main className="page" style={{ padding: 0 }}>
            <AppRoutes />
          </main>
        </div>
      </SoftphoneProvider>
    </BrowserRouter>
  );
}

function NavbarWrapper() {
  const location = useLocation();
  const publicPaths = ['/', '/login', '/signup'];
  if (publicPaths.includes(location.pathname)) return <Navbar />;
  return null;
}

export default App;
```

- [ ] **Step 2: Update Login.jsx to handle 403 status messages**

Open `frontend/src/pages/Login.jsx`. Find the `catch` block in the login handler and the error display. Replace the error display section so it shows specific messages:

Find this block in the catch:
```jsx
setError(err.message || 'Login failed');
```

Replace with:
```jsx
const msg = err.message || '';
if (msg.includes('pending')) {
  setError('⏳ Your account is pending approval. Please wait for the Voxiq team to activate it.');
} else if (msg.includes('deactivated')) {
  setError('🚫 Your account has been deactivated. Contact support.');
} else {
  setError(msg || 'Login failed. Check your credentials.');
}
```

Also find where login redirects after success (the role-based navigation). Make sure it includes `superadmin`:

Find:
```jsx
if (role === 'admin' || role === 'superadmin') navigate('/admin');
```

Replace with:
```jsx
if (role === 'superadmin') navigate('/superadmin');
else if (role === 'admin') navigate('/admin');
```

- [ ] **Step 3: Commit**

```powershell
cd D:\Voxiq-mb-dailer
git add frontend/src/App.jsx frontend/src/pages/Login.jsx
git commit -m "feat(frontend): add /superadmin route, fix ProtectedRoute role enforcement, handle 403 login errors"
```

---

## Task 11: Verify End-to-End

- [ ] **Step 1: Start backend**

```powershell
cd D:\Voxiq-mb-dailer\backend
npm run start:dev
```

Wait for `Nest application successfully started`.

- [ ] **Step 2: Run super admin seed**

In a new terminal:
```powershell
cd D:\Voxiq-mb-dailer\backend
npx tsx prisma/seed-superadmin.ts
```

- [ ] **Step 3: Start frontend**

```powershell
cd D:\Voxiq-mb-dailer\frontend
npm run dev
```

- [ ] **Step 4: Test signup flow**

1. Go to `http://localhost:5173/signup`
2. Fill all fields, enter `voxiq-admin-2024` as admin code, submit
3. Expected: success screen "Request Submitted!"
4. Try logging in → expected: "pending approval" message

- [ ] **Step 5: Test super admin approval**

1. Login as `barkatdanish30@gmail.com` with password `SuperAdmin@2024`
2. Expected: redirected to `/superadmin`
3. Go to "Pending Requests" tab
4. Click "Approve" on the test company, enter agent limit + numbers, click "Approve & Activate"
5. Expected: company moves to Active in "All Companies" tab

- [ ] **Step 6: Test company admin login**

1. Login as the company admin email used in signup
2. Expected: redirected to `/admin`
3. Verify access to admin dashboard works

- [ ] **Step 7: Final commit**

```powershell
cd D:\Voxiq-mb-dailer
git add -A
git commit -m "feat: complete multi-tenant super admin system

- Company self-registration with admin code
- PENDING → ACTIVE approval flow via super admin
- SuperAdmin dashboard: pending queue, company management, analytics
- Role-enforced routing on frontend
- Login blocked for PENDING/INACTIVE accounts

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

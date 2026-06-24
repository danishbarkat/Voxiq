import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  forwardRef,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac, randomBytes } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AccountStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';
import { SignupDto } from './dto/signup.dto';
import { WebsocketGateway } from '../websocket/websocket.gateway';

@Injectable()
export class AuthService {
  private static readonly SIGNUP_OTP_TTL_MS = 24 * 60 * 60 * 1000;
  private readonly blockedEmailDomains = new Set([
    'gmail.com',
    'googlemail.com',
    'yahoo.com',
    'hotmail.com',
    'outlook.com',
    'live.com',
    'msn.com',
    'icloud.com',
    'me.com',
    'aol.com',
    'proton.me',
    'protonmail.com',
    'mailinator.com',
    'tempmail.com',
    '10minutemail.com',
    'guerrillamail.com',
    'yopmail.com',
    'sharklasers.com',
  ]);
  private accountColumnCache: Set<string> | null = null;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    @Inject(forwardRef(() => WebsocketGateway))
    private websocketGateway: WebsocketGateway,
  ) {}

  async signup(dto: SignupDto) {
    this.assertBusinessEmail(dto.email);

    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new BadRequestException('This email is already registered. Each admin can only register one company.');
    }

    // One company per email domain
    const emailDomain = dto.email.toLowerCase().split('@')[1];
    const domainExists = await this.prisma.user.findFirst({
      where: { email: { endsWith: `@${emailDomain}` } },
      select: { id: true },
    });
    if (domainExists) {
      throw new BadRequestException('A company is already registered with this email domain. Contact your company admin to add you as an agent.');
    }

    // NTN uniqueness — prevent same NTN registering multiple companies
    if (dto.ntn) {
      const ntnExists = await this.findAccountByNtn(dto.ntn);
      if (ntnExists) {
        throw new BadRequestException('This NTN is already registered. Each company can only register once. Contact support if this is an error.');
      }
    }

    const otpCode = this.generateOtpCode();
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const expiresAt = new Date(Date.now() + AuthService.SIGNUP_OTP_TTL_MS);

    const signupPayload = {
      name: dto.name,
      lastName: dto.lastName,
      email: dto.email.toLowerCase(),
      passwordHash,
      phone: this.normalizeOptionalPhone(dto.phone),
      companyName: dto.companyName,
      website: dto.website || null,
      requestedAgentLimit: dto.requestedAgentLimit,
      requestedNumbers: dto.requestedNumbers,
      ntn: dto.ntn || null,
      termsAccepted: dto.termsAccepted,
      requestedPackage: dto.requestedPackage || 'Trial',
      billingCycle: dto.billingCycle || 'monthly',
      seatCount: dto.seatCount || 1,
    };

    await this.prisma.signupVerification.upsert({
      where: { email: dto.email.toLowerCase() },
      update: { otpCode, payload: signupPayload as any, expiresAt },
      create: { email: dto.email.toLowerCase(), otpCode, payload: signupPayload as any, expiresAt },
    });

    const previewCode = await this.sendSignupVerificationEmail(dto.email.toLowerCase(), dto.companyName, otpCode);

    return previewCode
      ? {
          message: 'Verification code sent. Enter the code to complete signup.',
          verificationCodePreview: previewCode,
        }
      : {
          message: 'Verification code sent. Enter the code to complete signup.',
        };
  }

  async verifySignup(email: string, code: string) {
    const verification = await this.prisma.signupVerification.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!verification) {
      throw new BadRequestException('No signup verification found for this email');
    }
    if (verification.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Verification code expired. Request a new code.');
    }
    if (verification.otpCode !== code.trim()) {
      throw new BadRequestException('Invalid verification code');
    }

    const payload = verification.payload as any;
    const existing = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (existing) {
      throw new BadRequestException('Email already registered');
    }

    let adminRole = await this.prisma.role.findFirst({
      where: { name: { equals: 'Admin', mode: 'insensitive' } },
    });
    if (!adminRole) {
      adminRole = await this.prisma.role.create({ data: { name: 'Admin' } });
    }

    const account = await this.prisma.account.create({
      data: await this.buildSignupAccountData(payload) as any,
    });

    await this.prisma.user.create({
      data: {
        name: `${payload.name} ${payload.lastName}`.trim(),
        email: payload.email,
        passwordHash: payload.passwordHash,
        roleId: adminRole.id,
        accountId: account.id,
      },
    });

    await this.prisma.signupVerification.delete({
      where: { email: email.toLowerCase() },
    });

    return {
      message: 'Email verified. Proceeding to plan selection.',
      accountId: account.id,
    };
  }

  async validateUser(email: string, password: string, accessCode?: string) {
    console.log(`Validating user: ${email}`);
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        role: true,
        account: {
          select: {
            id: true,
            status: true,
            accessCode: true,
            accessCodeUsedAt: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const roleName = user.role?.name?.toLowerCase?.() || '';

    if (user.account?.status === AccountStatus.PENDING) {
      throw new ForbiddenException('Account pending approval');
    }
    if (user.account?.status === AccountStatus.INACTIVE && roleName !== 'admin' && roleName !== 'superadmin') {
      throw new ForbiddenException('Account deactivated');
    }

    if (
      roleName === 'admin' &&
      user.account?.status === AccountStatus.ACTIVE &&
      user.account?.accessCode &&
      !user.account?.accessCodeUsedAt
    ) {
      if (!accessCode?.trim()) {
        throw new ForbiddenException('Company access code required for first admin login');
      }
      if (accessCode.trim().toUpperCase() !== user.account.accessCode.trim().toUpperCase()) {
        throw new ForbiddenException('Invalid company access code');
      }

      await this.prisma.account.update({
        where: { id: user.account.id },
        data: {
          accessCodeUsedAt: new Date(),
        },
      });
      user.account.accessCodeUsedAt = new Date();
    }

    const { passwordHash, account, ...safeUser } = user as any;
    return {
      ...safeUser,
      accountStatus: account?.status ?? null,
    };
  }

  async loginWithMfa(email: string, password: string, accessCode?: string) {
    const user = await this.validateUser(email, password, accessCode);
    const roleName = user.role?.name?.toLowerCase?.() || '';

    if (roleName !== 'superadmin') {
      return this.login(user);
    }

    let mfaSecret = user.mfaSecret as string | null | undefined;
    let mfaEnabled = !!user.mfaEnabled;

    if (!mfaSecret) {
      mfaSecret = this.generateBase32Secret();
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          mfaSecret,
          mfaEnabled: false,
        },
      });
      mfaEnabled = false;
    }

    const mfaToken = this.jwtService.sign({
      sub: user.id,
      purpose: 'mfa',
      setup: !mfaEnabled,
    }, { expiresIn: '10m' });

    const otpauthUrl = this.buildOtpAuthUrl(user.email, mfaSecret);

    return {
      mfa_required: true,
      mfa_setup_required: !mfaEnabled,
      mfa_token: mfaToken,
      manual_key: mfaSecret,
      otpauth_url: otpauthUrl,
    };
  }

  async login(user: any) {
    const sessionId = randomBytes(16).toString('hex');
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastSessionId: sessionId },
    });
    this.websocketGateway.disconnectSupersededSessions(
      user.id,
      sessionId,
      'You have been logged out from this tab or device because this account signed in from another browser or device.',
    );

    const payload = {
      sub: user.id,
      role: user.role?.name,
      accountId: user.accountId,
      teamId: user.teamId,
      accountStatus: user.accountStatus ?? null,
      sessionId,
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
        accountStatus: user.accountStatus ?? null,
        status: user.status,
        createdAt: user.createdAt,
      },
    };
  }

  async verifyMfa(mfaToken: string, code: string) {
    if (!mfaToken || !code) {
      throw new BadRequestException('MFA token and code are required');
    }

    let payload: any;
    try {
      payload = this.jwtService.verify(mfaToken);
    } catch {
      throw new UnauthorizedException('MFA session expired');
    }

    if (payload?.purpose !== 'mfa' || !payload?.sub) {
      throw new UnauthorizedException('Invalid MFA session');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { role: true, account: { select: { status: true } } },
    });
    if (!user || !user.mfaSecret) {
      throw new UnauthorizedException('MFA setup not found');
    }

    const isValid = this.verifyTotpCode(user.mfaSecret, code);
    if (!isValid) {
      throw new UnauthorizedException('Invalid authenticator code');
    }

    if (!user.mfaEnabled) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { mfaEnabled: true },
      });
      user.mfaEnabled = true;
    }

    const { passwordHash, account, ...safeUser } = user as any;
    return this.login({
      ...safeUser,
      accountStatus: account?.status ?? null,
    });
  }

  async requestPasswordReset(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, name: true, email: true },
    });
    if (!user) return { message: 'Reset request submitted' };

    // Store reset request in SignupVerification table (reusing for requests)
    const RESET_PREFIX = 'PWD_RESET_';
    await this.prisma.signupVerification.upsert({
      where: { email: `reset_${user.email.toLowerCase()}` },
      update: { otpCode: `${RESET_PREFIX}${user.id}`, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
      create: {
        email: `reset_${user.email.toLowerCase()}`,
        otpCode: `${RESET_PREFIX}${user.id}`,
        payload: { userId: user.id, agentEmail: user.email, agentName: user.name },
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    return { message: 'Reset request submitted' };
  }

  async getPasswordResetRequests(accountId: string) {
    const RESET_PREFIX = 'PWD_RESET_';
    const requests = await this.prisma.signupVerification.findMany({
      where: { otpCode: { startsWith: RESET_PREFIX } },
    });
    // Filter to only agents in this account
    const results: Array<{ id: string; name: string; email: string; requestedAt: Date }> = [];
    for (const req of requests) {
      const payload = req.payload as any;
      if (!payload?.userId) continue;
      const user = await this.prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, name: true, email: true, accountId: true },
      });
      if (user && user.accountId === accountId) {
        results.push({ id: user.id, name: user.name, email: user.email, requestedAt: req.createdAt });
      }
    }
    return results;
  }

  async clearPasswordResetRequest(agentEmail: string) {
    await this.prisma.signupVerification.deleteMany({
      where: { email: `reset_${agentEmail.toLowerCase()}` },
    });
  }

  async getAccountPlan(accountId: string) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      select: {
        status: true,
        packageName: true, isTrial: true, trialEndsAt: true,
        canOutboundCall: true, canInboundCall: true,
        canSendSms: true, canRecord: true, canSendWhatsapp: true, canAiInsights: true,
        monthlyCallLimit: true, monthlySmsLimit: true, agentLimit: true,
        billingCycle: true, seatCount: true,
      },
    });
    if (!account) return null;

    const now = new Date();
    const trialExpired = account.isTrial && account.trialEndsAt ? account.trialEndsAt < now : false;
    const trialDaysLeft = account.isTrial && account.trialEndsAt && !trialExpired
      ? Math.ceil((account.trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    return { ...account, trialExpired, trialDaysLeft };
  }

  async requestReactivation(user: any, message?: string) {
    if ((user?.role || '').toLowerCase() !== 'admin') {
      throw new ForbiddenException('Only company admins can request activation');
    }
    if (!user?.accountId) {
      throw new BadRequestException('Company account not found');
    }

    const account = await this.prisma.account.findUnique({
      where: { id: user.accountId },
      select: { id: true, status: true, name: true },
    });
    if (!account) {
      throw new BadRequestException('Company account not found');
    }
    if (account.status !== AccountStatus.INACTIVE) {
      throw new BadRequestException('Activation requests are only available for inactive companies');
    }

    const note = (message || 'Admin requested reactivation').trim();
    const marker = `[REACTIVATION_REQUEST] ${new Date().toISOString()} ${note}`;

    await this.prisma.account.update({
      where: { id: account.id },
      data: {
        rejectionReason: marker,
      },
    });

    return {
      message: 'Activation request sent to the Voxiq super admin team',
    };
  }

  private generateBase32Secret(length = 20) {
    const bytes = randomBytes(length);
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let output = '';
    let bits = 0;
    let value = 0;

    for (const byte of bytes) {
      value = (value << 8) | byte;
      bits += 8;

      while (bits >= 5) {
        output += alphabet[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }

    if (bits > 0) {
      output += alphabet[(value << (5 - bits)) & 31];
    }

    return output;
  }

  private generateCompanyAccessCode() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const chunk = () =>
      Array.from(randomBytes(4))
        .map((byte) => alphabet[byte % alphabet.length])
        .join('');

    return `${chunk()}-${chunk()}`;
  }

  private generateOtpCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private assertBusinessEmail(email: string) {
    const normalized = email.trim().toLowerCase();
    const domain = normalized.split('@')[1] || '';

    if (!domain || !domain.includes('.')) {
      throw new BadRequestException('Enter a valid work email address');
    }

    if (this.blockedEmailDomains.has(domain)) {
      throw new BadRequestException('Use your company work email address, not a personal or disposable email');
    }
  }

  private normalizeOptionalPhone(phone?: string) {
    if (!phone?.trim()) return null;
    const normalized = phone.replace(/[^\d+]/g, '');
    return normalized || null;
  }

  private async findAccountByNtn(ntn: string) {
    const columns = await this.getAccountColumns();
    if (!columns.has('ntn')) {
      return null;
    }

    const rows = await this.prisma.$queryRawUnsafe<Array<{ id: string }>>(
      'SELECT "id" FROM "Account" WHERE "ntn" = $1 LIMIT 1',
      ntn,
    );

    return rows[0] || null;
  }

  private async buildSignupAccountData(payload: any) {
    const columns = await this.getAccountColumns();
    const data: Record<string, any> = {
      name: payload.companyName,
      status: AccountStatus.PENDING,
      approved: false,
      accessCode: this.generateCompanyAccessCode(),
      accessCodeIssuedAt: new Date(),
    };

    if (columns.has('requestedAgentLimit')) {
      data.requestedAgentLimit = Number(payload.requestedAgentLimit);
    }
    if (columns.has('requestedNumbers')) {
      data.requestedNumbers = Number(payload.requestedNumbers);
    }
    if (columns.has('adminPhone')) {
      data.adminPhone = payload.phone || null;
    }
    if (columns.has('website')) {
      data.website = payload.website || null;
    }
    if (columns.has('ntn')) {
      data.ntn = payload.ntn || null;
    }
    if (columns.has('termsAccepted')) {
      data.termsAccepted = payload.termsAccepted === true;
    }
    if (columns.has('requestedPackage')) {
      data.requestedPackage = payload.requestedPackage || 'Trial';
    }
    if (columns.has('billingCycle')) {
      data.billingCycle = payload.billingCycle || 'monthly';
    }
    if (columns.has('seatCount')) {
      data.seatCount = Number(payload.seatCount) || 1;
    }

    return data;
  }

  private async getAccountColumns() {
    if (this.accountColumnCache) {
      return this.accountColumnCache;
    }

    const rows = await this.prisma.$queryRawUnsafe<Array<{ column_name: string }>>(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_name = 'Account'`,
    );

    this.accountColumnCache = new Set(rows.map((row) => row.column_name));
    return this.accountColumnCache;
  }

  private async sendSignupVerificationEmail(email: string, companyName: string, otpCode: string) {
    const resendApiKey = this.configService.get<string>('RESEND_API_KEY') || '';
    const host = this.configService.get<string>('MAIL_HOST') || '';
    const port = Number(this.configService.get<string>('MAIL_PORT') || 587);
    const user = this.configService.get<string>('MAIL_USER') || '';
    const pass = this.configService.get<string>('MAIL_PASS') || '';
    const from = this.configService.get<string>('MAIL_FROM') || user;
    const frontendUrl = (this.configService.get<string>('FRONTEND_URL') || '').replace(/\/$/, '');
    const logoUrl = frontendUrl ? `${frontendUrl}/logo.png` : '';
    const subject = 'Verify your Voxiq company signup';
    const text = `Your Voxiq verification code for ${companyName} is ${otpCode}. This code expires in 24 hours.`;
    const html = `
      <div style="margin:0;padding:32px 16px;background:#eef2ff;font-family:Inter,Arial,sans-serif;color:#0f172a;">
        <div style="max-width:640px;margin:0 auto;background:linear-gradient(180deg,#0f172a 0%,#1f2a5a 100%);border-radius:28px;overflow:hidden;box-shadow:0 24px 60px rgba(15,23,42,0.22);">
          <div style="padding:32px 32px 24px;border-bottom:1px solid rgba(255,255,255,0.08);">
            <div style="display:flex;align-items:center;gap:14px;">
              ${logoUrl ? `<img src="${logoUrl}" alt="Voxiq" style="height:40px;display:block;" />` : `<div style="width:40px;height:40px;border-radius:12px;background:rgba(255,255,255,0.12);display:flex;align-items:center;justify-content:center;color:#ffffff;font-weight:800;font-size:18px;">V</div>`}
              <div>
                <div style="font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.58);font-weight:700;">Voxiq Onboarding</div>
                <div style="font-size:24px;line-height:1.2;font-weight:800;color:#ffffff;margin-top:4px;">Verify your company signup</div>
              </div>
            </div>
            <div style="margin-top:22px;font-size:15px;line-height:1.7;color:rgba(255,255,255,0.82);">
              Your workspace request for <strong style="color:#ffffff;">${companyName}</strong> is almost ready. Use the verification code below to continue your admin signup.
            </div>
          </div>
          <div style="padding:32px;background:#ffffff;">
            <div style="background:linear-gradient(135deg,#eef2ff 0%,#f8fafc 100%);border:1px solid #dbe4ff;border-radius:24px;padding:28px;text-align:center;">
              <div style="font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#6366f1;font-weight:800;">Verification Code</div>
              <div style="margin-top:14px;font-size:40px;line-height:1;font-weight:900;letter-spacing:10px;color:#111827;">${otpCode}</div>
              <div style="margin-top:14px;font-size:14px;color:#475569;">This code stays valid for <strong>24 hours</strong>.</div>
            </div>
            <div style="margin-top:24px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:18px;padding:18px 20px;">
              <div style="font-size:13px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:0.08em;">What happens next</div>
              <div style="margin-top:10px;font-size:14px;line-height:1.7;color:#475569;">
                1. Enter this code in the Voxiq signup flow.<br/>
                2. Your company admin request will be submitted for review.<br/>
                3. After approval, your workspace access details will be shared with you.
              </div>
            </div>
            <div style="margin-top:22px;font-size:13px;line-height:1.7;color:#64748b;">
              If you did not request this signup, you can safely ignore this email.
            </div>
          </div>
        </div>
      </div>`;

    if (resendApiKey && from) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [email],
          subject,
          text,
          html,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new BadRequestException(`Email send failed: ${errorText}`);
      }

      return null;
    }

    if (!host || !user || !pass || pass === 'your_gmail_app_password_here') {
      return otpCode;
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });

    await transporter.sendMail({
      from,
      to: email,
      subject,
      text,
      html,
    });

    return null;
  }

  private buildOtpAuthUrl(email: string, secret: string) {
    const issuer = encodeURIComponent('Voxiq');
    const label = encodeURIComponent(`Voxiq:${email}`);
    return `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
  }

  private verifyTotpCode(secret: string, code: string) {
    const normalized = code.replace(/\s+/g, '');
    const windows = [-1, 0, 1];
    return windows.some((offset) => this.generateTotp(secret, offset) === normalized);
  }

  private generateTotp(secret: string, timeOffset = 0) {
    const key = this.base32ToBuffer(secret);
    const counter = Math.floor(Date.now() / 30000) + timeOffset;
    const counterBuffer = Buffer.alloc(8);
    counterBuffer.writeBigUInt64BE(BigInt(counter));

    const hmac = createHmac('sha1', key).update(counterBuffer).digest();
    const offset = hmac[hmac.length - 1] & 0x0f;
    const binary = ((hmac[offset] & 0x7f) << 24)
      | ((hmac[offset + 1] & 0xff) << 16)
      | ((hmac[offset + 2] & 0xff) << 8)
      | (hmac[offset + 3] & 0xff);

    return (binary % 1000000).toString().padStart(6, '0');
  }

  private base32ToBuffer(secret: string) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const cleaned = secret.toUpperCase().replace(/=+$/g, '');
    let bits = 0;
    let value = 0;
    const bytes: number[] = [];

    for (const char of cleaned) {
      const idx = alphabet.indexOf(char);
      if (idx === -1) continue;
      value = (value << 5) | idx;
      bits += 5;

      if (bits >= 8) {
        bytes.push((value >>> (bits - 8)) & 255);
        bits -= 8;
      }
    }

    return Buffer.from(bytes);
  }
}

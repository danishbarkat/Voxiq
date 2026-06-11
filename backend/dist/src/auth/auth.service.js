"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const nodemailer_1 = __importDefault(require("nodemailer"));
const prisma_service_1 = require("../prisma/prisma.service");
const websocket_gateway_1 = require("../websocket/websocket.gateway");
let AuthService = class AuthService {
    prisma;
    jwtService;
    configService;
    websocketGateway;
    blockedEmailDomains = new Set([
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
    accountColumnCache = null;
    constructor(prisma, jwtService, configService, websocketGateway) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.configService = configService;
        this.websocketGateway = websocketGateway;
    }
    async signup(dto) {
        this.assertBusinessEmail(dto.email);
        const existing = await this.prisma.user.findUnique({
            where: { email: dto.email.toLowerCase() },
        });
        if (existing) {
            throw new common_1.BadRequestException('This email is already registered. Each admin can only register one company.');
        }
        const emailDomain = dto.email.toLowerCase().split('@')[1];
        const domainExists = await this.prisma.user.findFirst({
            where: { email: { endsWith: `@${emailDomain}` } },
            select: { id: true },
        });
        if (domainExists) {
            throw new common_1.BadRequestException('A company is already registered with this email domain. Contact your company admin to add you as an agent.');
        }
        if (dto.ntn) {
            const ntnExists = await this.findAccountByNtn(dto.ntn);
            if (ntnExists) {
                throw new common_1.BadRequestException('This NTN is already registered. Each company can only register once. Contact support if this is an error.');
            }
        }
        const otpCode = this.generateOtpCode();
        const passwordHash = await bcryptjs_1.default.hash(dto.password, 10);
        await this.prisma.signupVerification.upsert({
            where: { email: dto.email.toLowerCase() },
            update: {
                otpCode,
                payload: {
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
                },
                expiresAt: new Date(Date.now() + 10 * 60 * 1000),
            },
            create: {
                email: dto.email.toLowerCase(),
                otpCode,
                payload: {
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
                },
                expiresAt: new Date(Date.now() + 10 * 60 * 1000),
            },
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
    async verifySignup(email, code) {
        const verification = await this.prisma.signupVerification.findUnique({
            where: { email: email.toLowerCase() },
        });
        if (!verification) {
            throw new common_1.BadRequestException('No signup verification found for this email');
        }
        if (verification.expiresAt.getTime() < Date.now()) {
            throw new common_1.BadRequestException('Verification code expired. Request a new code.');
        }
        if (verification.otpCode !== code.trim()) {
            throw new common_1.BadRequestException('Invalid verification code');
        }
        const payload = verification.payload;
        const existing = await this.prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });
        if (existing) {
            throw new common_1.BadRequestException('Email already registered');
        }
        let adminRole = await this.prisma.role.findFirst({
            where: { name: { equals: 'Admin', mode: 'insensitive' } },
        });
        if (!adminRole) {
            adminRole = await this.prisma.role.create({ data: { name: 'Admin' } });
        }
        const account = await this.prisma.account.create({
            data: await this.buildSignupAccountData(payload),
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
            message: 'Signup successful. Your account is under review. Voxiq will share your company access code after approval.',
        };
    }
    async validateUser(email, password, accessCode) {
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
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const isValid = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!isValid) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const roleName = user.role?.name?.toLowerCase?.() || '';
        if (user.account?.status === client_1.AccountStatus.PENDING) {
            throw new common_1.ForbiddenException('Account pending approval');
        }
        if (user.account?.status === client_1.AccountStatus.INACTIVE && roleName !== 'admin' && roleName !== 'superadmin') {
            throw new common_1.ForbiddenException('Account deactivated');
        }
        if (roleName === 'admin' &&
            user.account?.status === client_1.AccountStatus.ACTIVE &&
            user.account?.accessCode &&
            !user.account?.accessCodeUsedAt) {
            if (!accessCode?.trim()) {
                throw new common_1.ForbiddenException('Company access code required for first admin login');
            }
            if (accessCode.trim().toUpperCase() !== user.account.accessCode.trim().toUpperCase()) {
                throw new common_1.ForbiddenException('Invalid company access code');
            }
            await this.prisma.account.update({
                where: { id: user.account.id },
                data: {
                    accessCodeUsedAt: new Date(),
                },
            });
            user.account.accessCodeUsedAt = new Date();
        }
        const { passwordHash, account, ...safeUser } = user;
        return {
            ...safeUser,
            accountStatus: account?.status ?? null,
        };
    }
    async loginWithMfa(email, password, accessCode) {
        const user = await this.validateUser(email, password, accessCode);
        const roleName = user.role?.name?.toLowerCase?.() || '';
        if (roleName !== 'superadmin') {
            return this.login(user);
        }
        let mfaSecret = user.mfaSecret;
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
    async login(user) {
        const sessionId = (0, crypto_1.randomBytes)(16).toString('hex');
        await this.prisma.user.update({
            where: { id: user.id },
            data: { lastSessionId: sessionId },
        });
        this.websocketGateway.disconnectSupersededSessions(user.id, sessionId, 'You have been logged out from this tab or device because this account signed in from another browser or device.');
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
    async verifyMfa(mfaToken, code) {
        if (!mfaToken || !code) {
            throw new common_1.BadRequestException('MFA token and code are required');
        }
        let payload;
        try {
            payload = this.jwtService.verify(mfaToken);
        }
        catch {
            throw new common_1.UnauthorizedException('MFA session expired');
        }
        if (payload?.purpose !== 'mfa' || !payload?.sub) {
            throw new common_1.UnauthorizedException('Invalid MFA session');
        }
        const user = await this.prisma.user.findUnique({
            where: { id: payload.sub },
            include: { role: true, account: { select: { status: true } } },
        });
        if (!user || !user.mfaSecret) {
            throw new common_1.UnauthorizedException('MFA setup not found');
        }
        const isValid = this.verifyTotpCode(user.mfaSecret, code);
        if (!isValid) {
            throw new common_1.UnauthorizedException('Invalid authenticator code');
        }
        if (!user.mfaEnabled) {
            await this.prisma.user.update({
                where: { id: user.id },
                data: { mfaEnabled: true },
            });
            user.mfaEnabled = true;
        }
        const { passwordHash, account, ...safeUser } = user;
        return this.login({
            ...safeUser,
            accountStatus: account?.status ?? null,
        });
    }
    async requestPasswordReset(email) {
        const user = await this.prisma.user.findUnique({
            where: { email: email.toLowerCase() },
            select: { id: true, name: true, email: true },
        });
        if (!user)
            return { message: 'Reset request submitted' };
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
    async getPasswordResetRequests(accountId) {
        const RESET_PREFIX = 'PWD_RESET_';
        const requests = await this.prisma.signupVerification.findMany({
            where: { otpCode: { startsWith: RESET_PREFIX } },
        });
        const results = [];
        for (const req of requests) {
            const payload = req.payload;
            if (!payload?.userId)
                continue;
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
    async clearPasswordResetRequest(agentEmail) {
        await this.prisma.signupVerification.deleteMany({
            where: { email: `reset_${agentEmail.toLowerCase()}` },
        });
    }
    async getAccountPlan(accountId) {
        const account = await this.prisma.account.findUnique({
            where: { id: accountId },
            select: {
                packageName: true, isTrial: true, trialEndsAt: true,
                canOutboundCall: true, canInboundCall: true,
                canSendSms: true, canRecord: true,
                monthlyCallLimit: true, monthlySmsLimit: true, agentLimit: true,
            },
        });
        if (!account)
            return null;
        const now = new Date();
        const trialExpired = account.isTrial && account.trialEndsAt ? account.trialEndsAt < now : false;
        const trialDaysLeft = account.isTrial && account.trialEndsAt && !trialExpired
            ? Math.ceil((account.trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            : 0;
        return { ...account, trialExpired, trialDaysLeft };
    }
    async requestReactivation(user, message) {
        if ((user?.role || '').toLowerCase() !== 'admin') {
            throw new common_1.ForbiddenException('Only company admins can request activation');
        }
        if (!user?.accountId) {
            throw new common_1.BadRequestException('Company account not found');
        }
        const account = await this.prisma.account.findUnique({
            where: { id: user.accountId },
            select: { id: true, status: true, name: true },
        });
        if (!account) {
            throw new common_1.BadRequestException('Company account not found');
        }
        if (account.status !== client_1.AccountStatus.INACTIVE) {
            throw new common_1.BadRequestException('Activation requests are only available for inactive companies');
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
    generateBase32Secret(length = 20) {
        const bytes = (0, crypto_1.randomBytes)(length);
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
    generateCompanyAccessCode() {
        const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        const chunk = () => Array.from((0, crypto_1.randomBytes)(4))
            .map((byte) => alphabet[byte % alphabet.length])
            .join('');
        return `${chunk()}-${chunk()}`;
    }
    generateOtpCode() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }
    assertBusinessEmail(email) {
        const normalized = email.trim().toLowerCase();
        const domain = normalized.split('@')[1] || '';
        if (!domain || !domain.includes('.')) {
            throw new common_1.BadRequestException('Enter a valid work email address');
        }
        if (this.blockedEmailDomains.has(domain)) {
            throw new common_1.BadRequestException('Use your company work email address, not a personal or disposable email');
        }
    }
    normalizeOptionalPhone(phone) {
        if (!phone?.trim())
            return null;
        const normalized = phone.replace(/[^\d+]/g, '');
        return normalized || null;
    }
    async findAccountByNtn(ntn) {
        const columns = await this.getAccountColumns();
        if (!columns.has('ntn')) {
            return null;
        }
        const rows = await this.prisma.$queryRawUnsafe('SELECT "id" FROM "Account" WHERE "ntn" = $1 LIMIT 1', ntn);
        return rows[0] || null;
    }
    async buildSignupAccountData(payload) {
        const columns = await this.getAccountColumns();
        const data = {
            name: payload.companyName,
            status: client_1.AccountStatus.PENDING,
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
        return data;
    }
    async getAccountColumns() {
        if (this.accountColumnCache) {
            return this.accountColumnCache;
        }
        const rows = await this.prisma.$queryRawUnsafe(`SELECT column_name
       FROM information_schema.columns
       WHERE table_name = 'Account'`);
        this.accountColumnCache = new Set(rows.map((row) => row.column_name));
        return this.accountColumnCache;
    }
    async sendSignupVerificationEmail(email, companyName, otpCode) {
        const host = this.configService.get('MAIL_HOST') || '';
        const port = Number(this.configService.get('MAIL_PORT') || 587);
        const user = this.configService.get('MAIL_USER') || '';
        const pass = this.configService.get('MAIL_PASS') || '';
        const from = this.configService.get('MAIL_FROM') || user;
        if (!host || !user || !pass || pass === 'your_gmail_app_password_here') {
            return otpCode;
        }
        const transporter = nodemailer_1.default.createTransport({
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
            subject: 'Verify your Voxiq company signup',
            text: `Your Voxiq verification code for ${companyName} is ${otpCode}. This code expires in 10 minutes.`,
            html: `<div style="font-family:Arial,sans-serif;line-height:1.6"><h2>Verify your Voxiq signup</h2><p>Your verification code for <strong>${companyName}</strong> is:</p><div style="font-size:28px;font-weight:700;letter-spacing:4px;margin:16px 0">${otpCode}</div><p>This code expires in 10 minutes.</p></div>`,
        });
        return null;
    }
    buildOtpAuthUrl(email, secret) {
        const issuer = encodeURIComponent('Voxiq');
        const label = encodeURIComponent(`Voxiq:${email}`);
        return `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
    }
    verifyTotpCode(secret, code) {
        const normalized = code.replace(/\s+/g, '');
        const windows = [-1, 0, 1];
        return windows.some((offset) => this.generateTotp(secret, offset) === normalized);
    }
    generateTotp(secret, timeOffset = 0) {
        const key = this.base32ToBuffer(secret);
        const counter = Math.floor(Date.now() / 30000) + timeOffset;
        const counterBuffer = Buffer.alloc(8);
        counterBuffer.writeBigUInt64BE(BigInt(counter));
        const hmac = (0, crypto_1.createHmac)('sha1', key).update(counterBuffer).digest();
        const offset = hmac[hmac.length - 1] & 0x0f;
        const binary = ((hmac[offset] & 0x7f) << 24)
            | ((hmac[offset + 1] & 0xff) << 16)
            | ((hmac[offset + 2] & 0xff) << 8)
            | (hmac[offset + 3] & 0xff);
        return (binary % 1000000).toString().padStart(6, '0');
    }
    base32ToBuffer(secret) {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        const cleaned = secret.toUpperCase().replace(/=+$/g, '');
        let bits = 0;
        let value = 0;
        const bytes = [];
        for (const char of cleaned) {
            const idx = alphabet.indexOf(char);
            if (idx === -1)
                continue;
            value = (value << 5) | idx;
            bits += 5;
            if (bits >= 8) {
                bytes.push((value >>> (bits - 8)) & 255);
                bits -= 8;
            }
        }
        return Buffer.from(bytes);
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, common_1.Inject)((0, common_1.forwardRef)(() => websocket_gateway_1.WebsocketGateway))),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        config_1.ConfigService,
        websocket_gateway_1.WebsocketGateway])
], AuthService);
//# sourceMappingURL=auth.service.js.map
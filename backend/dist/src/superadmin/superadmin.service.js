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
var SuperAdminService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SuperAdminService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_1 = require("@prisma/client");
const promises_1 = require("fs/promises");
const child_process_1 = require("child_process");
const path_1 = require("path");
const os_1 = require("os");
const prisma_service_1 = require("../prisma/prisma.service");
const areaCodes_1 = require("../utils/areaCodes");
const SUPERADMIN_ACCOUNT_ID = 'super-admin-account';
let SuperAdminService = class SuperAdminService {
    static { SuperAdminService_1 = this; }
    prisma;
    configService;
    static SIGNUP_OTP_TTL_MS = 24 * 60 * 60 * 1000;
    accountSummarySelect = {
        id: true,
        name: true,
        status: true,
        approved: true,
        agentLimit: true,
        requestedAgentLimit: true,
        requestedNumbers: true,
        accessCode: true,
        accessCodeUsedAt: true,
        approvedAt: true,
        createdAt: true,
        numberPool: true,
        adminPhone: true,
        rejectionReason: true,
        ntn: true,
        packageName: true,
        isTrial: true,
        trialEndsAt: true,
        canOutboundCall: true,
        canInboundCall: true,
        canSendSms: true,
        canRecord: true,
        canSendWhatsapp: true,
        canAiInsights: true,
        billingCycle: true,
        seatCount: true,
        requestedPackage: true,
        monthlyCallLimit: true,
        monthlySmsLimit: true,
        users: {
            select: {
                id: true,
                name: true,
                email: true,
                status: true,
                createdAt: true,
                role: { select: { name: true } },
            },
        },
        _count: {
            select: {
                users: true,
                leads: true,
                lists: true,
                campaigns: true,
            },
        },
    };
    constructor(prisma, configService) {
        this.prisma = prisma;
        this.configService = configService;
    }
    resolveMediaUrl(url) {
        if (/^https?:\/\//i.test(url))
            return url;
        const publicBaseUrl = this.configService.get('PUBLIC_BASE_URL') ||
            this.configService.get('FRONTEND_URL') ||
            '';
        if (url.startsWith('/') && publicBaseUrl) {
            return `${publicBaseUrl.replace(/\/$/, '')}${url}`;
        }
        return url;
    }
    async sendSignupVerificationEmail(email, companyName, otpCode) {
        const resendApiKey = this.configService.get('RESEND_API_KEY') || '';
        const host = this.configService.get('MAIL_HOST') || '';
        const port = Number(this.configService.get('MAIL_PORT') || 587);
        const user = this.configService.get('MAIL_USER') || '';
        const pass = this.configService.get('MAIL_PASS') || '';
        const from = this.configService.get('MAIL_FROM') || user;
        const frontendUrl = (this.configService.get('FRONTEND_URL') || '').replace(/\/$/, '');
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
                throw new common_1.BadRequestException(`Email send failed: ${errorText}`);
            }
            return;
        }
        if (!host || !user || !pass || pass === 'your_gmail_app_password_here') {
            throw new common_1.BadRequestException('Email sending is not configured.');
        }
        const nodemailer = await import('nodemailer');
        const transporter = nodemailer.default.createTransport({
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
    }
    inferAudioMimeType(filename, fallback) {
        const ext = filename.split('.').pop()?.toLowerCase();
        if (ext === 'wav')
            return 'audio/wav';
        if (ext === 'webm')
            return 'audio/webm';
        if (ext === 'm4a')
            return 'audio/mp4';
        if (ext === 'mp4')
            return 'audio/mp4';
        if (ext === 'mpeg' || ext === 'mpga' || ext === 'mp3')
            return 'audio/mpeg';
        return fallback || 'application/octet-stream';
    }
    inferAudioExtension(filename, contentType) {
        const ext = filename.split('.').pop()?.toLowerCase();
        if (ext)
            return ext;
        if (contentType?.includes('wav'))
            return 'wav';
        if (contentType?.includes('webm'))
            return 'webm';
        if (contentType?.includes('mp4'))
            return 'm4a';
        if (contentType?.includes('mpeg') || contentType?.includes('mp3'))
            return 'mp3';
        return 'mp3';
    }
    async loadRecordingBinary(url) {
        if (url.startsWith('/uploads/')) {
            const absolutePath = (0, path_1.join)(process.cwd(), url.replace(/^\//, ''));
            const buffer = await (0, promises_1.readFile)(absolutePath);
            return {
                buffer,
                contentType: this.inferAudioMimeType(url),
                filename: url.split('/').pop() || 'recording.mp3',
            };
        }
        const mediaUrl = this.resolveMediaUrl(url);
        if (!/^https?:\/\//i.test(mediaUrl)) {
            throw new common_1.BadRequestException('Recording URL is not reachable from the server.');
        }
        const response = await fetch(mediaUrl);
        if (!response.ok) {
            throw new common_1.BadRequestException(`Failed to fetch recording (${response.status}).`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const contentType = response.headers.get('content-type');
        const filenameFromUrl = (() => {
            try {
                return new URL(mediaUrl).pathname.split('/').pop() || 'recording.mp3';
            }
            catch {
                return 'recording.mp3';
            }
        })();
        return {
            buffer,
            contentType: this.inferAudioMimeType(filenameFromUrl, contentType),
            filename: filenameFromUrl,
        };
    }
    async runWhisperTranscription(params) {
        const configuredPython = this.configService.get('WHISPER_PYTHON_BIN') || '';
        const pythonBin = configuredPython || (process.platform === 'win32' ? 'python' : 'python3');
        const scriptPath = (0, path_1.join)(process.cwd(), 'scripts', 'transcribe_audio.py');
        const args = [
            scriptPath,
            '--file',
            params.filePath,
            '--model',
            params.model,
            '--device',
            params.device,
            '--compute-type',
            params.computeType,
        ];
        if (params.language) {
            args.push('--language', params.language);
        }
        return new Promise((resolve, reject) => {
            const child = (0, child_process_1.spawn)(pythonBin, args, { cwd: process.cwd() });
            let stdout = '';
            let stderr = '';
            child.stdout.on('data', (chunk) => {
                stdout += chunk.toString();
            });
            child.stderr.on('data', (chunk) => {
                stderr += chunk.toString();
            });
            child.on('error', (error) => {
                reject(new common_1.BadRequestException(`Failed to start whisper transcription: ${error.message}`));
            });
            child.on('close', (code) => {
                if (code !== 0) {
                    reject(new common_1.BadRequestException(`Whisper transcription failed: ${(stderr || stdout || `exit ${code}`).trim()}`));
                    return;
                }
                try {
                    resolve(JSON.parse(stdout || '{}'));
                }
                catch (error) {
                    reject(new common_1.BadRequestException(`Invalid whisper response: ${error.message}`));
                }
            });
        });
    }
    async transcribeRecording(callLogId, source = 'recording') {
        const log = await this.prisma.callLog.findUnique({
            where: { id: callLogId },
            select: {
                id: true,
                recordingUrl: true,
                vmRecordingUrl: true,
                agent: { select: { name: true } },
                lead: { select: { firstName: true, lastName: true, phone: true } },
            },
        });
        if (!log) {
            throw new common_1.NotFoundException('Recording not found.');
        }
        const selectedUrl = source === 'voicemail' ? log.vmRecordingUrl : log.recordingUrl;
        if (!selectedUrl) {
            throw new common_1.NotFoundException(source === 'voicemail' ? 'Voicemail recording not found.' : 'Call recording not found.');
        }
        const { buffer, contentType, filename } = await this.loadRecordingBinary(selectedUrl);
        const maxBytes = 25 * 1024 * 1024;
        if (buffer.byteLength > maxBytes) {
            throw new common_1.BadRequestException('Recording exceeds the 25 MB transcription limit.');
        }
        const model = this.configService.get('WHISPER_MODEL') || 'small';
        const device = this.configService.get('WHISPER_DEVICE') || 'auto';
        const computeType = this.configService.get('WHISPER_COMPUTE_TYPE') || 'int8';
        const language = this.configService.get('WHISPER_LANGUAGE') || '';
        const extension = this.inferAudioExtension(filename, contentType);
        const tempPath = (0, path_1.join)((0, os_1.tmpdir)(), `voxiq-transcribe-${log.id}-${source}.${extension}`);
        try {
            await (0, promises_1.writeFile)(tempPath, buffer);
            const payload = await this.runWhisperTranscription({
                filePath: tempPath,
                model,
                device,
                computeType,
                language,
            });
            return {
                id: log.id,
                source,
                model,
                text: payload?.text || '',
                language: payload?.language || null,
            };
        }
        finally {
            await (0, promises_1.unlink)(tempPath).catch(() => undefined);
        }
    }
    async getDashboard() {
        const [accounts, callLogs] = await Promise.all([
            this.prisma.account.findMany({
                where: { id: { not: SUPERADMIN_ACCOUNT_ID } },
                orderBy: { createdAt: 'desc' },
                select: this.accountSummarySelect,
            }),
            this.getDashboardLogs(),
        ]);
        const byAccount = this.groupLogsByAccount(callLogs);
        const companySummaries = accounts.map((account) => this.buildCompanySnapshot(account, byAccount.get(account.id) || []));
        const overview = this.buildOverviewFromSnapshots(companySummaries, callLogs, byAccount);
        return { companies: companySummaries, overview };
    }
    buildOverviewFromSnapshots(companySummaries, callLogs, byAccount) {
        const totals = companySummaries.reduce((acc, company) => {
            acc.totalCompanies += 1;
            acc.activeCompanies += company.status === 'ACTIVE' ? 1 : 0;
            acc.pendingCompanies += company.status === 'PENDING' ? 1 : 0;
            acc.inactiveCompanies += company.status === 'INACTIVE' ? 1 : 0;
            acc.totalAgents += company.agentCount;
            acc.totalAdmins += company.adminCount;
            acc.totalLeads += company.leadCount;
            acc.totalLists += company.listCount;
            acc.totalCampaigns += company.campaignCount;
            acc.totalNumbers += company.numberCount;
            acc.totalCalls += company.totalCalls;
            acc.connectedCalls += company.connectedCalls;
            acc.totalMinutes += company.totalMinutes;
            acc.totalRevenue += company.revenue;
            acc.recordings += company.recordings;
            acc.inboundCalls += company.inboundCalls;
            acc.outboundCalls += company.outboundCalls;
            return acc;
        }, {
            totalCompanies: 0, activeCompanies: 0, pendingCompanies: 0, inactiveCompanies: 0,
            totalAgents: 0, totalAdmins: 0, totalLeads: 0, totalLists: 0,
            totalCampaigns: 0, totalNumbers: 0, totalCalls: 0, connectedCalls: 0,
            totalMinutes: 0, totalRevenue: 0, recordings: 0, inboundCalls: 0, outboundCalls: 0,
        });
        const topCompanies = [...companySummaries]
            .sort((a, b) => b.totalCalls - a.totalCalls)
            .slice(0, 5)
            .map((company) => ({
            accountId: company.id,
            companyName: company.name,
            totalCalls: company.totalCalls,
            totalMinutes: company.totalMinutes,
            revenue: company.revenue,
            topStates: company.topStates?.slice(0, 3) || [],
        }));
        const stateCounts = {};
        for (const company of companySummaries) {
            for (const state of company.topStates) {
                stateCounts[state.state] = (stateCounts[state.state] || 0) + state.calls;
            }
        }
        const topStates = Object.entries(stateCounts)
            .map(([state, calls]) => ({ state, calls }))
            .sort((a, b) => b.calls - a.calls)
            .slice(0, 8);
        const topCountries = this.buildTopCountries(callLogs);
        const companyTrends = this.buildCompanyTrendSeries(topCompanies.map((company) => ({ accountId: company.accountId, companyName: company.companyName })), byAccount);
        return {
            ...totals,
            connectionRate: totals.totalCalls > 0 ? Number(((totals.connectedCalls / totals.totalCalls) * 100).toFixed(1)) : 0,
            topCompanies,
            topStates,
            topCountries,
            companyTrends,
            reactivationRequests: companySummaries.filter(c => c.reactivationRequested).length,
        };
    }
    async getOverview() {
        const [accounts, callLogs] = await Promise.all([
            this.prisma.account.findMany({
                where: { id: { not: SUPERADMIN_ACCOUNT_ID } },
                select: this.accountSummarySelect,
            }),
            this.getDashboardLogs(),
        ]);
        const byAccount = this.groupLogsByAccount(callLogs);
        const companySummaries = accounts.map((account) => this.buildCompanySnapshot(account, byAccount.get(account.id) || []));
        return this.buildOverviewFromSnapshots(companySummaries, callLogs, byAccount);
    }
    async getAllCompanies() {
        const [accounts, callLogs] = await Promise.all([
            this.prisma.account.findMany({
                where: { id: { not: SUPERADMIN_ACCOUNT_ID } },
                orderBy: { createdAt: 'desc' },
                select: this.accountSummarySelect,
            }),
            this.getDashboardLogs(),
        ]);
        const byAccount = this.groupLogsByAccount(callLogs);
        return accounts.map((account) => this.buildCompanySnapshot(account, byAccount.get(account.id) || []));
    }
    async getCompanyDetails(accountId) {
        const account = await this.prisma.account.findUnique({
            where: { id: accountId },
            select: {
                id: true,
                name: true,
                status: true,
                approved: true,
                agentLimit: true,
                requestedAgentLimit: true,
                requestedNumbers: true,
                accessCode: true,
                accessCodeUsedAt: true,
                approvedAt: true,
                createdAt: true,
                numberPool: true,
                adminPhone: true,
                rejectionReason: true,
                ntn: true,
                packageName: true,
                isTrial: true,
                trialEndsAt: true,
                canOutboundCall: true,
                canInboundCall: true,
                canSendSms: true,
                canRecord: true,
                monthlyCallLimit: true,
                monthlySmsLimit: true,
                users: {
                    include: {
                        role: { select: { name: true } },
                    },
                    orderBy: { createdAt: 'desc' },
                },
                lists: {
                    select: {
                        id: true,
                        name: true,
                        createdAt: true,
                        _count: { select: { leads: true } },
                    },
                    orderBy: { createdAt: 'desc' },
                },
                campaigns: {
                    select: {
                        id: true,
                        name: true,
                        status: true,
                        mode: true,
                        localPresence: true,
                        record: true,
                        createdAt: true,
                    },
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
        if (!account) {
            throw new common_1.NotFoundException('Company not found');
        }
        const logs = await this.prisma.callLog.findMany({
            where: {
                agent: {
                    accountId,
                },
            },
            include: {
                agent: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                lead: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        phone: true,
                    },
                },
                campaign: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: { startedAt: 'desc' },
            take: 150,
        });
        const stats = this.computeLogStats(logs);
        const activityByDay = this.buildDailyActivity(logs);
        const topStates = this.buildTopStates(logs);
        const topCountries = this.buildTopCountries(logs);
        const topAgents = this.buildTopAgents(logs, account.users);
        return {
            id: account.id,
            name: account.name,
            status: account.status,
            approved: account.approved,
            agentLimit: account.agentLimit,
            requestedAgentLimit: account.requestedAgentLimit,
            requestedNumbers: account.requestedNumbers,
            accessCode: account.accessCode,
            accessCodeUsed: !!account.accessCodeUsedAt,
            approvedAt: account.approvedAt,
            createdAt: account.createdAt,
            numberPool: Array.isArray(account.numberPool) ? account.numberPool : [],
            numberCount: Array.isArray(account.numberPool) ? account.numberPool.length : 0,
            services: this.detectServices(account, logs),
            stats,
            topStates,
            topCountries,
            activityByDay,
            topAgents,
            admins: account.users
                .filter((user) => user.role?.name?.toLowerCase() === 'admin')
                .map((user) => ({
                id: user.id,
                name: user.name,
                email: user.email,
                status: user.status,
                createdAt: user.createdAt,
            })),
            agents: account.users
                .filter((user) => user.role?.name?.toLowerCase() === 'agent')
                .map((user) => ({
                id: user.id,
                name: user.name,
                email: user.email,
                status: user.status,
                callerNumber: user.callerNumber,
                createdAt: user.createdAt,
            })),
            lists: account.lists.map((list) => ({
                id: list.id,
                name: list.name,
                leadCount: list._count.leads,
                createdAt: list.createdAt,
            })),
            campaigns: account.campaigns,
            recentCalls: logs.slice(0, 20).map((log) => ({
                id: log.id,
                startedAt: log.startedAt,
                endedAt: log.endedAt,
                direction: log.direction || 'outbound',
                callStatus: log.callStatus,
                disposition: log.disposition,
                fromNumber: log.fromNumber,
                toNumber: log.toNumber,
                dealValue: log.dealValue || 0,
                recordingUrl: log.recordingUrl,
                vmRecordingUrl: log.vmRecordingUrl,
                agentName: log.agent?.name || 'Unknown',
                campaignName: log.campaign?.name || 'Unassigned',
                leadName: log.lead ? `${log.lead.firstName} ${log.lead.lastName}`.trim() : 'Unknown Lead',
                leadPhone: log.lead?.phone || null,
            })),
        };
    }
    async approveCompany(accountId, agentLimit, numberPool, packageName) {
        const account = await this.prisma.account.findUnique({ where: { id: accountId } });
        if (!account)
            throw new common_1.NotFoundException('Company not found');
        if (account.status === client_1.AccountStatus.ACTIVE) {
            throw new common_1.BadRequestException('Company is already active');
        }
        const pkgName = packageName || 'Trial';
        const preset = SuperAdminService_1.PACKAGES[pkgName] || SuperAdminService_1.PACKAGES['Trial'];
        const trialEndsAt = preset.isTrial
            ? new Date(Date.now() + (preset.trialDays || 7) * 24 * 60 * 60 * 1000)
            : null;
        return this.prisma.account.update({
            where: { id: accountId },
            data: {
                status: client_1.AccountStatus.ACTIVE,
                approved: true,
                agentLimit: packageName ? preset.agentLimit : agentLimit,
                numberPool,
                approvedAt: new Date(),
                rejectionReason: null,
                packageName: pkgName,
                isTrial: !!preset.isTrial,
                trialEndsAt,
                canOutboundCall: preset.canOutboundCall,
                canInboundCall: preset.canInboundCall,
                canSendSms: preset.canSendSms,
                canRecord: preset.canRecord,
                canSendWhatsapp: preset.canSendWhatsapp,
                canAiInsights: preset.canAiInsights,
                monthlyCallLimit: preset.monthlyCallLimit,
                monthlySmsLimit: preset.monthlySmsLimit,
            },
        });
    }
    async rejectCompany(accountId, reason) {
        const account = await this.prisma.account.findUnique({ where: { id: accountId } });
        if (!account)
            throw new common_1.NotFoundException('Company not found');
        return this.prisma.account.update({
            where: { id: accountId },
            data: {
                status: client_1.AccountStatus.INACTIVE,
                approved: false,
                rejectionReason: reason,
            },
        });
    }
    async deactivateCompany(accountId) {
        const account = await this.prisma.account.findUnique({ where: { id: accountId } });
        if (!account)
            throw new common_1.NotFoundException('Company not found');
        return this.prisma.account.update({
            where: { id: accountId },
            data: { status: client_1.AccountStatus.INACTIVE, rejectionReason: null },
        });
    }
    async deleteCompany(accountId) {
        const account = await this.prisma.account.findUnique({ where: { id: accountId } });
        if (!account)
            throw new common_1.NotFoundException('Company not found');
        if (accountId === 'super-admin-account')
            throw new common_1.BadRequestException('Cannot delete super admin account');
        const userIds = (await this.prisma.user.findMany({
            where: { accountId },
            select: { id: true },
        })).map(u => u.id);
        await this.prisma.callLog.deleteMany({ where: { agentId: { in: userIds } } });
        await this.prisma.smsMessage.deleteMany({ where: { accountId } });
        await this.prisma.agentList.deleteMany({ where: { agentId: { in: userIds } } });
        await this.prisma.lead.deleteMany({ where: { accountId } });
        await this.prisma.list.deleteMany({ where: { accountId } });
        await this.prisma.campaign.deleteMany({ where: { accountId } });
        try {
            await this.prisma.voicemailTemplate.deleteMany({ where: { accountId } });
        }
        catch { }
        await this.prisma.user.deleteMany({ where: { accountId } });
        await this.prisma.account.delete({ where: { id: accountId } });
        return { success: true, message: 'Company and all associated data permanently deleted' };
    }
    async activateCompany(accountId) {
        const account = await this.prisma.account.findUnique({ where: { id: accountId } });
        if (!account)
            throw new common_1.NotFoundException('Company not found');
        return this.prisma.account.update({
            where: { id: accountId },
            data: { status: client_1.AccountStatus.ACTIVE, approved: true, rejectionReason: null },
        });
    }
    async getAnalytics() {
        const now = new Date();
        const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const accounts = await this.prisma.account.findMany({
            where: { id: { not: SUPERADMIN_ACCOUNT_ID } },
            select: { id: true, name: true, status: true },
        });
        const results = await Promise.all(accounts.map(async (account) => {
            const [daily, weekly, monthly] = await Promise.all([
                this.getAccountStats(account.id, dayAgo),
                this.getAccountStats(account.id, weekAgo),
                this.getAccountStats(account.id, monthAgo),
            ]);
            return {
                accountId: account.id,
                companyName: account.name,
                status: account.status,
                daily,
                weekly,
                monthly,
            };
        }));
        return results;
    }
    async getCompanyAnalytics(accountId) {
        const now = new Date();
        const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const account = await this.prisma.account.findUnique({
            where: { id: accountId },
            select: { id: true, name: true },
        });
        if (!account)
            throw new common_1.NotFoundException('Company not found');
        const [daily, weekly, monthly] = await Promise.all([
            this.getAccountStats(accountId, dayAgo),
            this.getAccountStats(accountId, weekAgo),
            this.getAccountStats(accountId, monthAgo),
        ]);
        return { accountId, companyName: account.name, daily, weekly, monthly };
    }
    async getRecordings(filters) {
        const where = {
            OR: [
                { recordingUrl: { not: null } },
                { vmRecordingUrl: { not: null } },
            ],
        };
        if (filters?.accountId) {
            where.AND = [
                {
                    OR: [
                        { agent: { accountId: filters.accountId } },
                        { lead: { accountId: filters.accountId } },
                        { campaign: { accountId: filters.accountId } },
                    ],
                },
            ];
        }
        const search = (filters?.search || '').trim();
        if (search) {
            const bucket = where.AND || [];
            bucket.push({
                OR: [
                    { toNumber: { contains: search, mode: 'insensitive' } },
                    { fromNumber: { contains: search, mode: 'insensitive' } },
                    { callerName: { contains: search, mode: 'insensitive' } },
                    { disposition: { contains: search, mode: 'insensitive' } },
                    { notes: { contains: search, mode: 'insensitive' } },
                    { agent: { name: { contains: search, mode: 'insensitive' } } },
                    { campaign: { name: { contains: search, mode: 'insensitive' } } },
                    { lead: { firstName: { contains: search, mode: 'insensitive' } } },
                    { lead: { lastName: { contains: search, mode: 'insensitive' } } },
                    { lead: { phone: { contains: search, mode: 'insensitive' } } },
                    { agent: { account: { name: { contains: search, mode: 'insensitive' } } } },
                ],
            });
            where.AND = bucket;
        }
        if (filters?.from || filters?.to) {
            where.startedAt = {};
            if (filters.from) {
                where.startedAt.gte = new Date(`${filters.from}T00:00:00.000Z`);
            }
            if (filters.to) {
                where.startedAt.lte = new Date(`${filters.to}T23:59:59.999Z`);
            }
        }
        const take = Math.min(Math.max(Number(filters?.limit) || 200, 1), 500);
        const logs = await this.prisma.callLog.findMany({
            where,
            orderBy: { startedAt: 'desc' },
            take,
            include: {
                agent: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        accountId: true,
                        account: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
                lead: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        phone: true,
                        accountId: true,
                    },
                },
                campaign: {
                    select: {
                        id: true,
                        name: true,
                        accountId: true,
                    },
                },
            },
        });
        const items = logs.map((log) => {
            const companyId = log.agent?.account?.id ||
                log.agent?.accountId ||
                log.lead?.accountId ||
                log.campaign?.accountId ||
                null;
            const companyName = log.agent?.account?.name || 'Unknown Company';
            const leadName = log.lead
                ? `${log.lead.firstName || ''} ${log.lead.lastName || ''}`.trim() || log.lead.phone || 'Unknown Lead'
                : 'Unknown Lead';
            return {
                id: log.id,
                startedAt: log.startedAt,
                endedAt: log.endedAt,
                durationSeconds: log.durationSeconds,
                direction: log.direction || 'outbound',
                callStatus: log.callStatus,
                disposition: log.disposition,
                fromNumber: log.fromNumber,
                toNumber: log.toNumber,
                callerName: log.callerName,
                notes: log.notes,
                recordingUrl: log.recordingUrl,
                vmRecordingUrl: log.vmRecordingUrl,
                companyId,
                companyName,
                agentId: log.agent?.id || null,
                agentName: log.agent?.name || 'Unknown Agent',
                campaignId: log.campaign?.id || null,
                campaignName: log.campaign?.name || 'Unassigned',
                leadId: log.lead?.id || null,
                leadName,
                leadPhone: log.lead?.phone || null,
            };
        });
        const companyMap = new Map();
        for (const item of items) {
            const key = item.companyId || `unknown:${item.companyName}`;
            const current = companyMap.get(key) || {
                accountId: item.companyId,
                companyName: item.companyName,
                recordings: 0,
            };
            current.recordings += (item.recordingUrl ? 1 : 0) + (item.vmRecordingUrl ? 1 : 0);
            companyMap.set(key, current);
        }
        return {
            total: items.length,
            items,
            companies: Array.from(companyMap.values()).sort((a, b) => b.recordings - a.recordings),
        };
    }
    async getPendingVerifications() {
        const records = await this.prisma.signupVerification.findMany({
            orderBy: { createdAt: 'desc' },
        });
        return records.map(r => {
            const payload = r.payload;
            return {
                email: r.email,
                sentTo: r.email,
                companyName: payload?.companyName || '',
                name: `${payload?.name || ''} ${payload?.lastName || ''}`.trim(),
                phone: payload?.phone || '',
                otpCode: r.otpCode,
                expired: r.expiresAt < new Date(),
                createdAt: r.createdAt,
                lastEmailedAt: r.updatedAt,
            };
        });
    }
    async regenerateOtp(email) {
        const record = await this.prisma.signupVerification.findUnique({ where: { email } });
        if (!record)
            throw new Error('No pending verification for this email');
        const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
        const payload = record.payload;
        await this.prisma.signupVerification.update({
            where: { email },
            data: { otpCode: newOtp, expiresAt: new Date(Date.now() + SuperAdminService_1.SIGNUP_OTP_TTL_MS) },
        });
        await this.sendSignupVerificationEmail(email, payload?.companyName || 'your company', newOtp);
        return { otpCode: newOtp, message: 'New OTP emailed to the user and valid for 24 hours.' };
    }
    async getAvailableNumbers() {
        const telnyxNumbers = await this.fetchTelnyxNumbers();
        const allCompanies = await this.prisma.account.findMany({
            where: { id: { not: SUPERADMIN_ACCOUNT_ID } },
            select: { numberPool: true },
        });
        const assignedNumbers = new Set();
        for (const company of allCompanies) {
            if (Array.isArray(company.numberPool)) {
                for (const entry of company.numberPool) {
                    if (entry?.number)
                        assignedNumbers.add(entry.number);
                }
            }
        }
        return telnyxNumbers.map(entry => ({
            ...entry,
            assigned: assignedNumbers.has(entry.number),
        }));
    }
    async fetchTelnyxNumbers() {
        const apiKey = this.configService.get('TELNYX_API_KEY');
        if (!apiKey)
            return [];
        try {
            const res = await fetch('https://api.telnyx.com/v2/phone_numbers?page[size]=200', {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
            });
            if (!res.ok)
                return [];
            const json = await res.json();
            const data = json?.data || [];
            return data.map(item => {
                const raw = item.phone_number || '';
                const countryCode = this.extractCountryCode(raw);
                return {
                    number: raw,
                    callerName: item.caller_name || '',
                    countryCode,
                };
            });
        }
        catch {
            return [];
        }
    }
    extractCountryCode(e164) {
        if (!e164.startsWith('+'))
            return '';
        const knownCodes = {
            '1': 1, '7': 1, '20': 2, '27': 2, '30': 2, '31': 2, '32': 2, '33': 2, '34': 2,
            '36': 2, '39': 2, '40': 2, '41': 2, '43': 2, '44': 2, '45': 2, '46': 2, '47': 2,
            '48': 2, '49': 2, '51': 2, '52': 2, '53': 2, '54': 2, '55': 2, '56': 2, '57': 2,
            '58': 2, '60': 2, '61': 2, '62': 2, '63': 2, '64': 2, '65': 2, '66': 2, '81': 2,
            '82': 2, '84': 2, '86': 2, '90': 2, '91': 2, '92': 2, '93': 2, '94': 2, '95': 2,
            '98': 2, '212': 3, '213': 3, '216': 3, '218': 3, '220': 3, '221': 3, '234': 3,
            '971': 3, '972': 3, '966': 3, '964': 3, '963': 3, '961': 3,
        };
        const digits = e164.slice(1);
        for (const len of [3, 2, 1]) {
            const prefix = digits.slice(0, len);
            if (knownCodes[prefix] !== undefined)
                return `+${prefix}`;
        }
        return `+${digits.slice(0, 1)}`;
    }
    async searchAvailableNumbers(opts) {
        const apiKey = this.configService.get('TELNYX_API_KEY');
        if (!apiKey)
            return [];
        const params = new URLSearchParams();
        params.set('filter[country_code]', (opts.country || 'US').toUpperCase());
        if (opts.areaCode)
            params.set('filter[national_destination_code]', opts.areaCode);
        if (opts.type)
            params.set('filter[phone_number_type]', opts.type);
        params.set('filter[limit]', '20');
        params.append('filter[features][]', 'voice');
        try {
            const res = await fetch(`https://api.telnyx.com/v2/available_phone_numbers?${params.toString()}`, {
                headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            });
            if (!res.ok)
                return [];
            const json = await res.json();
            return (json.data || []).map((item) => ({
                phoneNumber: item.phone_number,
                regionName: item.region_information?.[0]?.region_name || '',
                type: item.phone_number_type,
                features: (item.features || []).map((f) => f.name),
                monthlyCost: item.cost_information?.monthly_cost || '0.00',
                upfrontCost: item.cost_information?.upfront_cost || '0.00',
            }));
        }
        catch {
            return [];
        }
    }
    async orderNumber(phoneNumber, features = ['voice']) {
        const apiKey = this.configService.get('TELNYX_API_KEY');
        const connectionId = this.configService.get('TELNYX_SIP_CONNECTION_ID');
        const messagingProfileId = this.configService.get('TELNYX_MESSAGING_PROFILE_ID');
        if (!apiKey)
            throw new common_1.BadRequestException('Telnyx API key not configured');
        const wantsSms = features.some(f => ['sms', 'mms', 'messaging'].includes(f.toLowerCase()));
        const wantsWhatsapp = features.some(f => f.toLowerCase() === 'whatsapp');
        const needsMessaging = wantsSms || wantsWhatsapp;
        const body = { phone_numbers: [{ phone_number: phoneNumber }] };
        if (connectionId)
            body.connection_id = connectionId;
        if (needsMessaging && messagingProfileId)
            body.messaging_profile_id = messagingProfileId;
        const res = await fetch('https://api.telnyx.com/v2/number_orders', {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!res.ok) {
            throw new common_1.BadRequestException(json?.errors?.[0]?.detail || 'Failed to order number');
        }
        const messagingEnabled = needsMessaging && !!messagingProfileId;
        return {
            success: true,
            phoneNumber,
            status: json.data?.status || 'submitted',
            features,
            messagingEnabled,
            whatsappEnabled: wantsWhatsapp && messagingEnabled,
        };
    }
    async createMessagingProfile(name) {
        const apiKey = this.configService.get('TELNYX_API_KEY');
        if (!apiKey)
            throw new common_1.BadRequestException('Telnyx API key not configured');
        const profileName = name || 'Voxiq Messaging Profile';
        const res = await fetch('https://api.telnyx.com/v2/messaging_profiles', {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: profileName }),
        });
        const json = await res.json();
        if (!res.ok) {
            throw new common_1.BadRequestException(json?.errors?.[0]?.detail || 'Failed to create messaging profile');
        }
        const profileId = json.data?.id;
        return {
            success: true,
            profileId,
            name: json.data?.name,
            instructions: `Add this to your .env file:\nTELNYX_MESSAGING_PROFILE_ID=${profileId}`,
        };
    }
    async getMessagingProfile() {
        const apiKey = this.configService.get('TELNYX_API_KEY');
        if (!apiKey)
            throw new common_1.BadRequestException('Telnyx API key not configured');
        const configuredId = this.configService.get('TELNYX_MESSAGING_PROFILE_ID');
        const res = await fetch('https://api.telnyx.com/v2/messaging_profiles?page[size]=10', {
            headers: { Authorization: `Bearer ${apiKey}` },
        });
        const json = await res.json();
        if (!res.ok) {
            throw new common_1.BadRequestException(json?.errors?.[0]?.detail || 'Failed to fetch messaging profiles');
        }
        const profiles = (json.data || []).map((p) => ({
            id: p.id,
            name: p.name,
            active: p.enabled,
            isConfigured: p.id === configuredId,
        }));
        return {
            profiles,
            configuredId: configuredId || null,
            hasConfigured: !!configuredId,
        };
    }
    async assignNumbers(accountId, numbers) {
        const account = await this.prisma.account.findUnique({
            where: { id: accountId },
            select: { numberPool: true },
        });
        if (!account)
            throw new common_1.NotFoundException('Company not found');
        const pool = Array.isArray(account.numberPool) ? account.numberPool : [];
        const existing = new Set(pool.map((e) => e.number));
        const toAdd = numbers.filter(n => !existing.has(n.number));
        const updated = [...pool, ...toAdd];
        await this.prisma.account.update({
            where: { id: accountId },
            data: { numberPool: updated },
        });
        return { message: `${toAdd.length} number(s) assigned`, assigned: toAdd };
    }
    async unassignNumber(accountId, number) {
        const account = await this.prisma.account.findUnique({
            where: { id: accountId },
            select: { numberPool: true },
        });
        if (!account)
            throw new common_1.NotFoundException('Company not found');
        const pool = Array.isArray(account.numberPool) ? account.numberPool : [];
        const updated = pool.filter(e => e.number !== number);
        if (updated.length === pool.length) {
            throw new common_1.NotFoundException('Number not found in this company pool');
        }
        await this.prisma.$transaction([
            this.prisma.account.update({
                where: { id: accountId },
                data: { numberPool: updated },
            }),
            this.prisma.user.updateMany({
                where: { accountId, callerNumber: number },
                data: { callerNumber: null },
            }),
        ]);
        return { message: 'Number unassigned', number };
    }
    async regenerateAccessCode(accountId) {
        const account = await this.prisma.account.findUnique({ where: { id: accountId } });
        if (!account)
            throw new common_1.NotFoundException('Company not found');
        return this.prisma.account.update({
            where: { id: accountId },
            data: {
                accessCode: this.generateAccessCode(),
                accessCodeIssuedAt: new Date(),
                accessCodeUsedAt: null,
            },
            select: {
                id: true,
                name: true,
                accessCode: true,
                accessCodeIssuedAt: true,
            },
        });
    }
    static PACKAGES = {
        Trial: { canOutboundCall: true, canInboundCall: false, canSendSms: false, canRecord: false, canSendWhatsapp: false, canAiInsights: false, monthlyCallLimit: null, monthlySmsLimit: null, agentLimit: 1, isTrial: true, trialDays: 7, pricePerSeat: 0, billingLabel: 'Free' },
        Basic: { canOutboundCall: true, canInboundCall: true, canSendSms: false, canRecord: false, canSendWhatsapp: false, canAiInsights: false, monthlyCallLimit: null, monthlySmsLimit: null, agentLimit: 1, pricePerSeat: 24.99, billingLabel: '$24.99/seat/mo' },
        Pro: { canOutboundCall: true, canInboundCall: true, canSendSms: true, canRecord: true, canSendWhatsapp: false, canAiInsights: false, monthlyCallLimit: null, monthlySmsLimit: null, agentLimit: 1, pricePerSeat: 39.99, billingLabel: '$39.99/seat/mo' },
        Business: { canOutboundCall: true, canInboundCall: true, canSendSms: true, canRecord: true, canSendWhatsapp: true, canAiInsights: true, monthlyCallLimit: null, monthlySmsLimit: null, agentLimit: 1, pricePerSeat: 69.99, billingLabel: '$69.99/seat/mo' },
        Enterprise: { canOutboundCall: true, canInboundCall: true, canSendSms: true, canRecord: true, canSendWhatsapp: true, canAiInsights: true, monthlyCallLimit: null, monthlySmsLimit: null, agentLimit: 100, pricePerSeat: 0, billingLabel: 'Contact Sales' },
    };
    async assignPackage(accountId, packageName) {
        const preset = SuperAdminService_1.PACKAGES[packageName];
        if (!preset)
            throw new common_1.BadRequestException(`Unknown package: ${packageName}`);
        const trialEndsAt = preset.isTrial
            ? new Date(Date.now() + (preset.trialDays || 7) * 24 * 60 * 60 * 1000)
            : null;
        return this.prisma.account.update({
            where: { id: accountId },
            data: {
                packageName,
                isTrial: !!preset.isTrial,
                trialEndsAt,
                canOutboundCall: preset.canOutboundCall,
                canInboundCall: preset.canInboundCall,
                canSendSms: preset.canSendSms,
                canRecord: preset.canRecord,
                canSendWhatsapp: preset.canSendWhatsapp,
                canAiInsights: preset.canAiInsights,
                monthlyCallLimit: preset.monthlyCallLimit,
                monthlySmsLimit: preset.monthlySmsLimit,
            },
            select: {
                id: true, name: true, packageName: true, isTrial: true, trialEndsAt: true,
                canOutboundCall: true, canInboundCall: true,
                canSendSms: true, canRecord: true, canSendWhatsapp: true, canAiInsights: true,
                monthlyCallLimit: true, monthlySmsLimit: true, agentLimit: true,
            },
        });
    }
    static PACKAGE_PRICES = {
        Trial: 0, Basic: 24.99, Pro: 39.99, Business: 69.99, Enterprise: 0,
    };
    static RATES = {
        usOutboundPerMin: 0.007,
        ukOutboundPerMin: 0.012,
        intlOutboundPerMin: 0.010,
        usInboundPerMin: 0.005,
        ukInboundPerMin: 0.006,
        tollfreeInboundPerMin: 0.017,
        recordPerMin: 0.002,
        smsOutbound: 0.007,
        smsInbound: 0.004,
        usNumberPerMonth: 1.00,
        ukNumberPerMonth: 1.50,
    };
    static SELL_RATES = {
        usOutboundPerMin: 0.015,
        ukOutboundPerMin: 0.025,
        intlOutboundPerMin: 0.020,
        inboundPerMin: 0.010,
        recordPerMin: 0.004,
        smsOutbound: 0.015,
        smsInbound: 0.008,
        usNumberPerMonth: 2.00,
        ukNumberPerMonth: 3.00,
    };
    detectDestCountry(phone) {
        if (!phone || !phone.startsWith('+'))
            return 'OTHER';
        const digits = phone.slice(1);
        if (digits.startsWith('1'))
            return 'US';
        if (digits.startsWith('44'))
            return 'GB';
        if (digits.startsWith('61'))
            return 'AU';
        if (digits.startsWith('49'))
            return 'DE';
        if (digits.startsWith('33'))
            return 'FR';
        if (digits.startsWith('34'))
            return 'ES';
        if (digits.startsWith('39'))
            return 'IT';
        if (digits.startsWith('31'))
            return 'NL';
        if (digits.startsWith('32'))
            return 'BE';
        if (digits.startsWith('46'))
            return 'SE';
        if (digits.startsWith('47'))
            return 'NO';
        if (digits.startsWith('45'))
            return 'DK';
        if (digits.startsWith('48'))
            return 'PL';
        if (digits.startsWith('41'))
            return 'CH';
        if (digits.startsWith('43'))
            return 'AT';
        if (digits.startsWith('55'))
            return 'BR';
        if (digits.startsWith('52'))
            return 'MX';
        if (digits.startsWith('91'))
            return 'IN';
        if (digits.startsWith('92'))
            return 'PK';
        if (digits.startsWith('971'))
            return 'AE';
        if (digits.startsWith('966'))
            return 'SA';
        if (digits.startsWith('972'))
            return 'IL';
        if (digits.startsWith('61'))
            return 'AU';
        if (digits.startsWith('64'))
            return 'NZ';
        if (digits.startsWith('65'))
            return 'SG';
        if (digits.startsWith('81'))
            return 'JP';
        if (digits.startsWith('82'))
            return 'KR';
        if (digits.startsWith('86'))
            return 'CN';
        return 'OTHER';
    }
    getOutboundRate(destCountry) {
        const R = SuperAdminService_1.RATES;
        if (destCountry === 'US' || destCountry === 'CA')
            return R.usOutboundPerMin;
        if (destCountry === 'GB')
            return R.ukOutboundPerMin;
        return R.intlOutboundPerMin;
    }
    async getBillingSummary() {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const accounts = await this.prisma.account.findMany({
            where: { id: { not: SUPERADMIN_ACCOUNT_ID }, status: client_1.AccountStatus.ACTIVE },
            select: {
                id: true, name: true, packageName: true, numberPool: true,
                canRecord: true,
                users: { select: { id: true } },
            },
        });
        const rows = await Promise.all(accounts.map(async (acc) => {
            const [callLogs, smsCount] = await Promise.all([
                this.prisma.callLog.findMany({
                    where: { agent: { accountId: acc.id }, startedAt: { gte: monthStart } },
                    select: { durationSeconds: true, direction: true, startedAt: true, endedAt: true, toNumber: true },
                }),
                this.prisma.smsMessage.count({
                    where: { accountId: acc.id, direction: 'outbound', createdAt: { gte: monthStart } },
                }),
            ]);
            const R = SuperAdminService_1.RATES;
            const countryMap = new Map();
            let callCost = 0;
            let usageBill = 0;
            let totalCallSec = 0;
            for (const log of callLogs) {
                const secs = this.normalizeCallDurationSeconds(log);
                totalCallSec += secs;
                const mins = secs / 60;
                const isInbound = (log.direction || 'outbound').toLowerCase() === 'inbound';
                const destCountry = isInbound ? 'INBOUND' : this.detectDestCountry(log.toNumber || '');
                const telnyxRate = isInbound ? R.usInboundPerMin : this.getOutboundRate(destCountry);
                const callTelnyxCost = mins * telnyxRate + (acc.canRecord ? mins * R.recordPerMin : 0);
                callCost += callTelnyxCost;
                const SR = SuperAdminService_1.SELL_RATES;
                let sellRate;
                if (isInbound) {
                    sellRate = SR.inboundPerMin;
                }
                else if (destCountry === 'US' || destCountry === 'CA') {
                    sellRate = SR.usOutboundPerMin;
                }
                else if (destCountry === 'GB') {
                    sellRate = SR.ukOutboundPerMin;
                }
                else {
                    sellRate = SR.intlOutboundPerMin;
                }
                const callSellCost = mins * sellRate + (acc.canRecord ? mins * SR.recordPerMin : 0);
                usageBill += callSellCost;
                const bucket = countryMap.get(destCountry) || {
                    calls: 0, seconds: 0,
                    telnyxCost: 0, telnyxRate,
                    sellCost: 0, sellRate,
                };
                bucket.calls += 1;
                bucket.seconds += secs;
                bucket.telnyxCost += callTelnyxCost;
                bucket.sellCost += callSellCost;
                countryMap.set(destCountry, bucket);
            }
            const numberPool = Array.isArray(acc.numberPool) ? acc.numberPool : [];
            let numCost = 0;
            let numSellCost = 0;
            let usNumbers = 0;
            let ukNumbers = 0;
            const SR = SuperAdminService_1.SELL_RATES;
            for (const n of numberPool) {
                const num = n?.number || '';
                if (num.startsWith('+44')) {
                    ukNumbers++;
                    numCost += R.ukNumberPerMonth;
                    numSellCost += SR.ukNumberPerMonth;
                }
                else {
                    usNumbers++;
                    numCost += R.usNumberPerMonth;
                    numSellCost += SR.usNumberPerMonth;
                }
            }
            const smsCost = smsCount * R.smsOutbound;
            const smsSellCost = smsCount * SR.smsOutbound;
            const totalTelnyx = parseFloat((callCost + smsCost + numCost).toFixed(4));
            usageBill += smsSellCost + numSellCost;
            usageBill = parseFloat(usageBill.toFixed(4));
            const pkgPrice = SuperAdminService_1.PACKAGE_PRICES[acc.packageName || ''] ?? 0;
            const netProfit = parseFloat((pkgPrice - totalTelnyx).toFixed(2));
            const margin = pkgPrice > 0 ? parseFloat(((netProfit / pkgPrice) * 100).toFixed(1)) : null;
            const usageProfit = parseFloat((usageBill - totalTelnyx).toFixed(2));
            const usageMargin = usageBill > 0 ? parseFloat(((usageProfit / usageBill) * 100).toFixed(1)) : null;
            const COUNTRY_NAMES_MAP = {
                US: 'United States', GB: 'United Kingdom', AU: 'Australia', DE: 'Germany',
                FR: 'France', IN: 'India', PK: 'Pakistan', AE: 'UAE', SA: 'Saudi Arabia',
                CA: 'Canada', NL: 'Netherlands', SE: 'Sweden', NO: 'Norway', PL: 'Poland',
                CH: 'Switzerland', AT: 'Austria', BR: 'Brazil', MX: 'Mexico', ES: 'Spain',
                IT: 'Italy', BE: 'Belgium', DK: 'Denmark', IL: 'Israel', NZ: 'New Zealand',
                SG: 'Singapore', JP: 'Japan', KR: 'South Korea', CN: 'China',
                INBOUND: 'Inbound Calls', OTHER: 'Other International',
            };
            const countryBreakdown = [...countryMap.entries()]
                .map(([country, data]) => ({
                country,
                countryName: COUNTRY_NAMES_MAP[country] || country,
                calls: data.calls,
                minutes: parseFloat((data.seconds / 60).toFixed(2)),
                telnyxCost: parseFloat(data.telnyxCost.toFixed(4)),
                sellCost: parseFloat(data.sellCost.toFixed(4)),
                profit: parseFloat((data.sellCost - data.telnyxCost).toFixed(4)),
                telnyxRate: data.telnyxRate,
                sellRate: data.sellRate,
            }))
                .sort((a, b) => b.calls - a.calls);
            return {
                id: acc.id,
                name: acc.name,
                packageName: acc.packageName || null,
                packagePrice: pkgPrice,
                totalCalls: callLogs.length,
                totalCallMinutes: parseFloat((totalCallSec / 60).toFixed(2)),
                callCost: parseFloat(callCost.toFixed(4)),
                smsCount,
                smsCost: parseFloat(smsCost.toFixed(4)),
                numbers: numberPool.length,
                usNumbers,
                ukNumbers,
                numCost: parseFloat(numCost.toFixed(2)),
                totalTelnyxCost: totalTelnyx,
                netProfit,
                margin,
                usageBill,
                usageProfit,
                usageMargin,
                countryBreakdown,
            };
        }));
        const totals = rows.reduce((acc, r) => ({
            totalRevenue: acc.totalRevenue + r.packagePrice,
            totalTelnyxCost: acc.totalTelnyxCost + r.totalTelnyxCost,
            totalNetProfit: acc.totalNetProfit + r.netProfit,
            totalUsageBill: acc.totalUsageBill + r.usageBill,
            totalUsageProfit: acc.totalUsageProfit + r.usageProfit,
            totalCalls: acc.totalCalls + r.totalCalls,
            totalSms: acc.totalSms + r.smsCount,
        }), { totalRevenue: 0, totalTelnyxCost: 0, totalNetProfit: 0, totalUsageBill: 0, totalUsageProfit: 0, totalCalls: 0, totalSms: 0 });
        return {
            month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
            summary: {
                totalRevenue: parseFloat(totals.totalRevenue.toFixed(2)),
                totalTelnyxCost: parseFloat(totals.totalTelnyxCost.toFixed(2)),
                totalNetProfit: parseFloat(totals.totalNetProfit.toFixed(2)),
                overallMargin: totals.totalRevenue > 0
                    ? parseFloat(((totals.totalNetProfit / totals.totalRevenue) * 100).toFixed(1)) : 0,
                totalUsageBill: parseFloat(totals.totalUsageBill.toFixed(2)),
                totalUsageProfit: parseFloat(totals.totalUsageProfit.toFixed(2)),
                usageMargin: totals.totalUsageBill > 0
                    ? parseFloat(((totals.totalUsageProfit / totals.totalUsageBill) * 100).toFixed(1)) : 0,
                totalCalls: totals.totalCalls,
                totalSms: totals.totalSms,
            },
            companies: rows.sort((a, b) => b.netProfit - a.netProfit),
            rates: SuperAdminService_1.RATES,
            sellRates: SuperAdminService_1.SELL_RATES,
        };
    }
    async updateAgentLimit(accountId, agentLimit) {
        if (!agentLimit || agentLimit < 1)
            throw new common_1.BadRequestException('Agent limit must be at least 1');
        const account = await this.prisma.account.findUnique({ where: { id: accountId } });
        if (!account)
            throw new common_1.NotFoundException('Company not found');
        return this.prisma.account.update({
            where: { id: accountId },
            data: { agentLimit },
            select: { id: true, name: true, agentLimit: true },
        });
    }
    async updateFeatures(accountId, features) {
        const account = await this.prisma.account.findUnique({ where: { id: accountId } });
        if (!account)
            throw new common_1.NotFoundException('Company not found');
        return this.prisma.account.update({
            where: { id: accountId },
            data: features,
            select: { id: true, name: true, canOutboundCall: true, canInboundCall: true, canSendSms: true, canSendWhatsapp: true, canRecord: true, canCallInternational: true, canAiInsights: true },
        });
    }
    async getPackageUsage(accountId) {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const [callCount, smsCount, account] = await Promise.all([
            this.prisma.callLog.count({
                where: { agent: { accountId }, startedAt: { gte: monthStart } },
            }),
            this.prisma.smsMessage.count({
                where: { accountId, direction: 'outbound', createdAt: { gte: monthStart } },
            }),
            this.prisma.account.findUnique({
                where: { id: accountId },
                select: {
                    packageName: true, canOutboundCall: true, canInboundCall: true,
                    canSendSms: true, canRecord: true, canSendWhatsapp: true, canAiInsights: true,
                    monthlyCallLimit: true, monthlySmsLimit: true, agentLimit: true,
                    canCallInternational: true,
                },
            }),
        ]);
        if (!account)
            throw new common_1.NotFoundException('Company not found');
        return {
            ...account,
            usage: {
                callsThisMonth: callCount,
                smsThisMonth: smsCount,
                callLimitReached: account.monthlyCallLimit !== null && callCount >= account.monthlyCallLimit,
                smsLimitReached: account.monthlySmsLimit !== null && smsCount >= account.monthlySmsLimit,
            },
        };
    }
    async getAccountStats(accountId, since) {
        const logs = await this.prisma.callLog.findMany({
            where: {
                startedAt: { gte: since },
                agent: { accountId },
            },
            include: {
                lead: {
                    select: {
                        phone: true,
                    },
                },
            },
        });
        const stats = this.computeLogStats(logs);
        return {
            calls: stats.totalCalls,
            connectedCalls: stats.connectedCalls,
            totalMinutes: stats.totalMinutes,
            avgDuration: stats.avgDuration,
            revenue: stats.revenue,
            inboundCalls: stats.inboundCalls,
            outboundCalls: stats.outboundCalls,
            recordings: stats.recordings,
            topStates: this.buildTopStates(logs).slice(0, 5),
        };
    }
    getDashboardLogs() {
        return this.prisma.callLog.findMany({
            select: {
                id: true,
                startedAt: true,
                endedAt: true,
                callStatus: true,
                dealValue: true,
                recordingUrl: true,
                direction: true,
                toNumber: true,
                fromNumber: true,
                agent: {
                    select: {
                        accountId: true,
                    },
                },
                lead: {
                    select: {
                        phone: true,
                    },
                },
            },
            orderBy: { startedAt: 'desc' },
            take: 5000,
        });
    }
    groupLogsByAccount(logs) {
        const byAccount = new Map();
        for (const log of logs) {
            const accountId = log.agent?.accountId;
            if (!accountId)
                continue;
            const current = byAccount.get(accountId) || [];
            current.push(log);
            byAccount.set(accountId, current);
        }
        return byAccount;
    }
    buildCompanySnapshot(account, logs) {
        const stats = this.computeLogStats(logs);
        const adminUsers = account.users.filter((user) => user.role?.name?.toLowerCase() === 'admin');
        const agentUsers = account.users.filter((user) => user.role?.name?.toLowerCase() === 'agent');
        return {
            id: account.id,
            name: account.name,
            status: account.status,
            approved: account.approved,
            agentLimit: account.agentLimit,
            requestedAgentLimit: account.requestedAgentLimit,
            requestedNumbers: account.requestedNumbers,
            accessCode: account.accessCode,
            accessCodeUsed: !!account.accessCodeUsedAt,
            adminPhone: account.adminPhone,
            ntn: account.ntn || null,
            website: null,
            rejectionReason: account.rejectionReason,
            reactivationRequested: account.status === client_1.AccountStatus.INACTIVE &&
                typeof account.rejectionReason === 'string' &&
                account.rejectionReason.startsWith('[REACTIVATION_REQUEST]'),
            approvedAt: account.approvedAt,
            createdAt: account.createdAt,
            userCount: account._count.users,
            agentCount: agentUsers.length,
            adminCount: adminUsers.length,
            leadCount: account._count.leads,
            listCount: account._count.lists,
            campaignCount: account._count.campaigns,
            numberCount: Array.isArray(account.numberPool) ? account.numberPool.length : 0,
            adminEmail: adminUsers[0]?.email ?? null,
            adminName: adminUsers[0]?.name ?? null,
            packageName: account.packageName ?? null,
            isTrial: account.isTrial ?? false,
            trialEndsAt: account.trialEndsAt ?? null,
            totalCalls: stats.totalCalls,
            connectedCalls: stats.connectedCalls,
            totalMinutes: stats.totalMinutes,
            avgDuration: stats.avgDuration,
            revenue: stats.revenue,
            recordings: stats.recordings,
            inboundCalls: stats.inboundCalls,
            outboundCalls: stats.outboundCalls,
            services: this.detectServices(account, logs),
            topStates: this.buildTopStates(logs).slice(0, 5),
        };
    }
    computeLogStats(logs) {
        const totalCalls = logs.length;
        const connectedCalls = logs.filter((log) => log.callStatus === client_1.CallStatus.CONNECTED || log.callStatus === client_1.CallStatus.COMPLETED).length;
        const totalSeconds = logs.reduce((sum, log) => {
            return sum + this.normalizeCallDurationSeconds(log);
        }, 0);
        const totalMinutes = parseFloat((totalSeconds / 60).toFixed(2));
        const avgDuration = totalCalls > 0 ? Math.round(totalSeconds / totalCalls) : 0;
        const revenue = logs.reduce((sum, log) => sum + (log.dealValue || 0), 0);
        const recordings = logs.filter((log) => !!log.recordingUrl).length;
        const inboundCalls = logs.filter((log) => (log.direction || '').toLowerCase() === 'inbound').length;
        const outboundCalls = totalCalls - inboundCalls;
        return {
            totalCalls,
            connectedCalls,
            totalMinutes,
            avgDuration,
            revenue,
            recordings,
            inboundCalls,
            outboundCalls,
        };
    }
    normalizeCallDurationSeconds(log) {
        const maxReasonableSeconds = 12 * 60 * 60;
        const rawDuration = Number(log?.durationSeconds);
        if (Number.isFinite(rawDuration) && rawDuration > 0) {
            if (rawDuration <= maxReasonableSeconds)
                return rawDuration;
            if (rawDuration <= maxReasonableSeconds * 1000)
                return rawDuration / 1000;
        }
        if (!log?.endedAt || !log?.startedAt)
            return 0;
        const derivedSeconds = (new Date(log.endedAt).getTime() - new Date(log.startedAt).getTime()) / 1000;
        if (!Number.isFinite(derivedSeconds) || derivedSeconds <= 0)
            return 0;
        if (derivedSeconds > maxReasonableSeconds)
            return 0;
        return derivedSeconds;
    }
    buildTopStates(logs) {
        const stateCounts = {};
        for (const log of logs) {
            const phone = log.lead?.phone || log.toNumber;
            const state = phone ? (0, areaCodes_1.getStateFromE164)(phone) : null;
            if (!state)
                continue;
            stateCounts[state] = (stateCounts[state] || 0) + 1;
        }
        return Object.entries(stateCounts)
            .map(([state, calls]) => ({ state, calls }))
            .sort((a, b) => b.calls - a.calls);
    }
    buildTopCountries(logs) {
        const PHONE_COUNTRY_MAP = {
            '1': 'US', '7': 'RU', '20': 'EG', '27': 'ZA', '30': 'GR', '31': 'NL',
            '32': 'BE', '33': 'FR', '34': 'ES', '36': 'HU', '39': 'IT', '40': 'RO',
            '41': 'CH', '43': 'AT', '44': 'GB', '45': 'DK', '46': 'SE', '47': 'NO',
            '48': 'PL', '49': 'DE', '51': 'PE', '52': 'MX', '54': 'AR', '55': 'BR',
            '56': 'CL', '57': 'CO', '58': 'VE', '60': 'MY', '61': 'AU', '62': 'ID',
            '63': 'PH', '64': 'NZ', '65': 'SG', '66': 'TH', '81': 'JP', '82': 'KR',
            '84': 'VN', '86': 'CN', '90': 'TR', '91': 'IN', '92': 'PK', '93': 'AF',
            '94': 'LK', '95': 'MM', '98': 'IR', '212': 'MA', '213': 'DZ', '216': 'TN',
            '218': 'LY', '234': 'NG', '249': 'SD', '251': 'ET', '254': 'KE',
            '255': 'TZ', '256': 'UG', '260': 'ZM', '263': 'ZW', '351': 'PT',
            '353': 'IE', '358': 'FI', '380': 'UA', '420': 'CZ', '421': 'SK',
            '971': 'AE', '966': 'SA', '965': 'KW', '974': 'QA', '973': 'BH',
            '968': 'OM', '967': 'YE', '962': 'JO', '961': 'LB', '964': 'IQ', '972': 'IL',
        };
        const counts = {};
        for (const log of logs) {
            const phone = (log.lead?.phone || log.toNumber || '').replace(/[^0-9]/g, '');
            if (!phone)
                continue;
            let country = null;
            for (const len of [3, 2, 1]) {
                const prefix = phone.slice(0, len);
                if (PHONE_COUNTRY_MAP[prefix]) {
                    country = PHONE_COUNTRY_MAP[prefix];
                    break;
                }
            }
            if (!country)
                continue;
            counts[country] = (counts[country] || 0) + 1;
        }
        return Object.entries(counts)
            .map(([id, calls]) => ({ id, calls }))
            .sort((a, b) => b.calls - a.calls);
    }
    buildDailyActivity(logs) {
        const bucket = {};
        for (const log of logs) {
            const date = new Date(log.startedAt).toISOString().slice(0, 10);
            if (!bucket[date]) {
                bucket[date] = { date, calls: 0, revenue: 0 };
            }
            bucket[date].calls += 1;
            bucket[date].revenue += log.dealValue || 0;
        }
        return Object.values(bucket)
            .sort((a, b) => a.date.localeCompare(b.date))
            .slice(-14);
    }
    buildCompanyTrendSeries(companies, byAccount) {
        const definitions = {
            daily: { buckets: 14, key: 'day' },
            weekly: { buckets: 8, key: 'week' },
            monthly: { buckets: 6, key: 'month' },
        };
        return {
            daily: this.buildTrendPoints(companies, byAccount, definitions.daily.buckets, definitions.daily.key),
            weekly: this.buildTrendPoints(companies, byAccount, definitions.weekly.buckets, definitions.weekly.key),
            monthly: this.buildTrendPoints(companies, byAccount, definitions.monthly.buckets, definitions.monthly.key),
        };
    }
    buildTrendPoints(companies, byAccount, bucketCount, mode) {
        const now = new Date();
        const buckets = [];
        for (let index = bucketCount - 1; index >= 0; index -= 1) {
            const anchor = new Date(now);
            let start = new Date(anchor);
            let end = new Date(anchor);
            let label = '';
            let key = '';
            if (mode === 'day') {
                start = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - index, 0, 0, 0, 0);
                end = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - index, 23, 59, 59, 999);
                label = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                key = start.toISOString().slice(0, 10);
            }
            else if (mode === 'week') {
                const currentWeekStart = new Date(anchor);
                currentWeekStart.setDate(anchor.getDate() - anchor.getDay());
                currentWeekStart.setHours(0, 0, 0, 0);
                start = new Date(currentWeekStart);
                start.setDate(currentWeekStart.getDate() - (index * 7));
                end = new Date(start);
                end.setDate(start.getDate() + 6);
                end.setHours(23, 59, 59, 999);
                label = `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
                key = `${start.toISOString().slice(0, 10)}:week`;
            }
            else {
                start = new Date(anchor.getFullYear(), anchor.getMonth() - index, 1, 0, 0, 0, 0);
                end = new Date(anchor.getFullYear(), anchor.getMonth() - index + 1, 0, 23, 59, 59, 999);
                label = start.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                key = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
            }
            buckets.push({ key, label, start, end });
        }
        return buckets.map((bucket) => ({
            label: bucket.label,
            key: bucket.key,
            companies: companies.map((company) => {
                const logs = byAccount.get(company.accountId) || [];
                const calls = logs.filter((log) => {
                    const startedAt = log?.startedAt ? new Date(log.startedAt) : null;
                    return startedAt && startedAt >= bucket.start && startedAt <= bucket.end;
                }).length;
                return {
                    accountId: company.accountId,
                    companyName: company.companyName,
                    calls,
                };
            }),
        }));
    }
    buildTopAgents(logs, users) {
        const byAgent = new Map();
        for (const log of logs) {
            if (!log.agentId)
                continue;
            const current = byAgent.get(log.agentId) || {
                id: log.agentId,
                name: log.agent?.name || 'Unknown',
                email: log.agent?.email || '',
                calls: 0,
                revenue: 0,
            };
            current.calls += 1;
            current.revenue += log.dealValue || 0;
            byAgent.set(log.agentId, current);
        }
        const results = Array.from(byAgent.values()).sort((a, b) => b.calls - a.calls).slice(0, 8);
        if (results.length > 0)
            return results;
        return users
            .filter((user) => user.role?.name?.toLowerCase() === 'agent')
            .slice(0, 8)
            .map((user) => ({
            id: user.id,
            name: user.name,
            email: user.email,
            calls: 0,
            revenue: 0,
        }));
    }
    detectServices(account, logs) {
        const numberPool = Array.isArray(account.numberPool) ? account.numberPool : [];
        const inboundCalls = logs.some((log) => (log.direction || '').toLowerCase() === 'inbound');
        const recordings = logs.some((log) => !!log.recordingUrl);
        const localPresence = (account.campaigns || []).some((campaign) => !!campaign.localPresence);
        return [
            numberPool.length > 0 ? 'Outbound' : null,
            inboundCalls ? 'Inbound' : null,
            recordings ? 'Recordings' : null,
            localPresence ? 'Local Presence' : null,
        ].filter(Boolean);
    }
    generateAccessCode() {
        const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        const part = () => Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
        return `${part()}-${part()}`;
    }
};
exports.SuperAdminService = SuperAdminService;
exports.SuperAdminService = SuperAdminService = SuperAdminService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], SuperAdminService);
//# sourceMappingURL=superadmin.service.js.map
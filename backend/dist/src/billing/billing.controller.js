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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillingController = void 0;
const common_1 = require("@nestjs/common");
const billing_service_1 = require("./billing.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const public_decorator_1 = require("../auth/decorators/public.decorator");
const prisma_service_1 = require("../prisma/prisma.service");
let BillingController = class BillingController {
    billing;
    prisma;
    constructor(billing, prisma) {
        this.billing = billing;
        this.prisma = prisma;
    }
    async createCheckout(body, req) {
        const accountId = req.user?.accountId;
        if (!accountId)
            throw new common_1.BadRequestException('Account not found');
        const user = await this.prisma.user.findFirst({
            where: { accountId },
            select: { email: true },
        });
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const successUrl = `${baseUrl}/billing/success?plan=${body.packageName}&seats=${body.seats}`;
        const cancelUrl = `${baseUrl}/admin`;
        const checkoutUrl = await this.billing.createCheckout(accountId, body.packageName, body.billingCycle || 'monthly', body.seats || 1, user?.email || '', successUrl, cancelUrl);
        return { checkoutUrl };
    }
    async createNewUserCheckout(body) {
        if (!body.accountId)
            throw new common_1.BadRequestException('accountId required');
        const account = await this.prisma.account.findUnique({
            where: { id: body.accountId },
            select: { status: true, users: { select: { email: true }, take: 1 } },
        });
        if (!account)
            throw new common_1.BadRequestException('Account not found');
        if (account.status !== 'PENDING')
            throw new common_1.BadRequestException('Account is not pending setup');
        const email = account.users?.[0]?.email || '';
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const successUrl = `${baseUrl}/billing/success?plan=${body.packageName}&seats=${body.seats}&newuser=true`;
        const cancelUrl = `${baseUrl}/signup`;
        const checkoutUrl = await this.billing.createCheckout(body.accountId, body.packageName || 'Basic', body.billingCycle || 'monthly', body.seats || 1, email, successUrl, cancelUrl);
        return { checkoutUrl };
    }
    async handleWebhook(req, signature) {
        const rawBody = req.rawBody;
        if (!rawBody || !signature)
            throw new common_1.UnauthorizedException('Missing signature');
        if (!this.billing.verifyWebhookSignature(rawBody, signature)) {
            throw new common_1.UnauthorizedException('Invalid webhook signature');
        }
        const payload = JSON.parse(rawBody.toString());
        const eventName = payload.meta?.event_name;
        const attrs = payload.data?.attributes;
        const customData = payload.meta?.custom_data || {};
        const lsSubscriptionId = String(payload.data?.id || '');
        const lsCustomerId = String(attrs?.customer_id || '');
        const lsVariantId = String(attrs?.variant_id || '');
        const accountId = customData.accountId;
        const packageName = customData.packageName || attrs?.product_name || 'Basic';
        const billingCycle = customData.billingCycle || 'monthly';
        const seats = parseInt(customData.seats || String(attrs?.quantity ?? '1'), 10);
        const periodEnd = attrs?.renews_at ? new Date(attrs.renews_at) : null;
        const lsStatus = attrs?.status || 'active';
        const trialEndsAt = attrs?.trial_ends_at ? new Date(attrs.trial_ends_at) : null;
        switch (eventName) {
            case 'subscription_created':
                if (accountId && (lsStatus === 'active' || lsStatus === 'on_trial')) {
                    await this.billing.activateAccount(accountId, packageName, billingCycle, seats, lsSubscriptionId, lsCustomerId, lsVariantId, periodEnd, lsStatus, trialEndsAt);
                }
                break;
            case 'subscription_updated':
                if (lsStatus === 'active') {
                    if (accountId) {
                        await this.billing.activateAccount(accountId, packageName, billingCycle, seats, lsSubscriptionId, lsCustomerId, lsVariantId, periodEnd, 'active', null);
                    }
                    else {
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
};
exports.BillingController = BillingController;
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('checkout'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "createCheckout", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('checkout/new-user'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "createNewUserCheckout", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('webhook'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Headers)('x-signature')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "handleWebhook", null);
exports.BillingController = BillingController = __decorate([
    (0, common_1.Controller)('billing'),
    __metadata("design:paramtypes", [billing_service_1.BillingService,
        prisma_service_1.PrismaService])
], BillingController);
//# sourceMappingURL=billing.controller.js.map
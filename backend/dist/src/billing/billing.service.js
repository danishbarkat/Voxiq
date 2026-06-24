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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillingService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../prisma/prisma.service");
const crypto_1 = require("crypto");
const PLAN_FEATURES = {
    Basic: { canOutboundCall: true, canInboundCall: true, canSendSms: false, canRecord: false, canSendWhatsapp: false, canAiInsights: false },
    Pro: { canOutboundCall: true, canInboundCall: true, canSendSms: true, canRecord: true, canSendWhatsapp: false, canAiInsights: false },
    Business: { canOutboundCall: true, canInboundCall: true, canSendSms: true, canRecord: true, canSendWhatsapp: true, canAiInsights: true },
};
let BillingService = class BillingService {
    prisma;
    config;
    constructor(prisma, config) {
        this.prisma = prisma;
        this.config = config;
    }
    get apiKey() { return this.config.get('LS_API_KEY'); }
    get storeId() { return this.config.get('LS_STORE_ID'); }
    get webhookSecret() { return this.config.get('LS_WEBHOOK_SECRET'); }
    getVariantId(packageName, billingCycle) {
        const key = `LS_VARIANT_${packageName.toUpperCase()}_${billingCycle.toUpperCase()}`;
        const variantId = this.config.get(key);
        if (!variantId)
            throw new common_1.BadRequestException(`No variant configured for ${packageName} ${billingCycle}`);
        return variantId;
    }
    async createCheckout(accountId, packageName, billingCycle, seats, email, successUrl, cancelUrl) {
        const variantId = this.getVariantId(packageName, billingCycle);
        const body = {
            data: {
                type: 'checkouts',
                attributes: {
                    checkout_data: {
                        email,
                        quantity: seats,
                        custom: { accountId, packageName, billingCycle, seats: String(seats) },
                    },
                    product_options: { redirect_url: successUrl },
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
            throw new common_1.BadRequestException(`LemonSqueezy checkout error: ${err}`);
        }
        const data = await res.json();
        return data.data.attributes.url;
    }
    async activateAccount(accountId, packageName, billingCycle, seats, lsSubscriptionId, lsCustomerId, lsVariantId, periodEnd, lsStatus = 'active', trialEndsAt = null) {
        const features = PLAN_FEATURES[packageName];
        if (!features)
            return;
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
    async renewAccount(lsSubscriptionId, periodEnd) {
        await this.prisma.account.updateMany({
            where: { lsSubscriptionId },
            data: { status: 'ACTIVE', isTrial: false, trialEndsAt: null, lsCurrentPeriodEnd: periodEnd },
        });
    }
    async deactivateAccount(lsSubscriptionId) {
        await this.prisma.account.updateMany({
            where: { lsSubscriptionId },
            data: { status: 'INACTIVE' },
        });
    }
    verifyWebhookSignature(rawBody, signature) {
        const secret = this.webhookSecret;
        if (!secret)
            return false;
        const hmac = (0, crypto_1.createHmac)('sha256', secret);
        hmac.update(rawBody);
        return hmac.digest('hex') === signature;
    }
};
exports.BillingService = BillingService;
exports.BillingService = BillingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], BillingService);
//# sourceMappingURL=billing.service.js.map
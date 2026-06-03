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
var IntegrationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntegrationsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../prisma/prisma.service");
const voip_service_1 = require("../voip/voip.service");
let IntegrationsService = IntegrationsService_1 = class IntegrationsService {
    config;
    prisma;
    voip;
    logger = new common_1.Logger(IntegrationsService_1.name);
    webhooks = [];
    smsTemplates = [];
    ghlKey = null;
    constructor(config, prisma, voip) {
        this.config = config;
        this.prisma = prisma;
        this.voip = voip;
        this.ghlKey = config.get('GHL_API_KEY') || null;
    }
    listWebhooks() { return this.webhooks; }
    addWebhook(url, label = '') {
        const id = `wh_${Date.now()}`;
        this.webhooks.push({ id, url, label });
        return { id, url, label };
    }
    deleteWebhook(id) {
        this.webhooks = this.webhooks.filter(w => w.id !== id);
        return { deleted: id };
    }
    async fireWebhooks(event, payload) {
        for (const wh of this.webhooks) {
            try {
                await fetch(wh.url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ event, payload, timestamp: new Date().toISOString() }),
                });
                this.logger.log(`Webhook fired: ${wh.url}`);
            }
            catch (e) {
                this.logger.warn(`Webhook failed ${wh.url}: ${e.message}`);
            }
        }
    }
    getGhlKey() { return { configured: !!this.ghlKey }; }
    saveGhlKey(key) { this.ghlKey = key; return { saved: true }; }
    async testGhl(apiKey) {
        try {
            const res = await fetch('https://rest.gohighlevel.com/v1/contacts/?limit=1', {
                headers: { Authorization: `Bearer ${apiKey}` },
            });
            return { ok: res.ok, status: res.status };
        }
        catch (e) {
            return { ok: false, error: e.message };
        }
    }
    async syncDispositionToGhl(phone, leadName, disposition, notes) {
        if (!this.ghlKey)
            return;
        try {
            const searchRes = await fetch(`https://rest.gohighlevel.com/v1/contacts/?query=${encodeURIComponent(phone)}`, {
                headers: { Authorization: `Bearer ${this.ghlKey}` },
            });
            const data = await searchRes.json();
            const contact = data?.contacts?.[0];
            if (!contact)
                return;
            await fetch(`https://rest.gohighlevel.com/v1/contacts/${contact.id}/notes/`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${this.ghlKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ body: `[WinFi Dialer] ${disposition}: ${notes || ''}` }),
            });
            this.logger.log(`GHL synced: ${leadName} → ${disposition}`);
        }
        catch (e) {
            this.logger.warn(`GHL sync failed: ${e.message}`);
        }
    }
    listSmsTemplates() { return this.smsTemplates; }
    saveSmsTemplate(name, message) {
        const id = `sms_${Date.now()}`;
        this.smsTemplates.push({ id, name, message });
        return { id, name, message };
    }
    deleteSmsTemplate(id) {
        this.smsTemplates = this.smsTemplates.filter(t => t.id !== id);
        return { deleted: id };
    }
    async sendSms(to, message, from) {
        const fromNum = from || this.config.get('DEFAULT_OUTBOUND_NUMBER') || '+12623990007';
        try {
            await this.voip.sendSms(to, fromNum, message);
            this.logger.log(`SMS sent to ${to}`);
            return { sent: true, to };
        }
        catch (e) {
            this.logger.error(`SMS failed: ${e.message}`);
            return { sent: false, error: e.message };
        }
    }
};
exports.IntegrationsService = IntegrationsService;
exports.IntegrationsService = IntegrationsService = IntegrationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService, prisma_service_1.PrismaService, voip_service_1.VoipService])
], IntegrationsService);
//# sourceMappingURL=integrations.service.js.map
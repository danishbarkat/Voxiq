import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { VoipService } from '../voip/voip.service';

@Injectable()
export class IntegrationsService {
    private readonly logger = new Logger(IntegrationsService.name);
    // In-memory storage for webhooks & SMS templates (uses DB JSON config for persistence)
    private webhooks: { id: string; url: string; label: string }[] = [];
    private smsTemplates: { id: string; name: string; message: string }[] = [];
    private ghlKey: string | null = null;

    constructor(private config: ConfigService, private prisma: PrismaService, private voip: VoipService) {
        this.ghlKey = config.get<string>('GHL_API_KEY') || null;
    }

    // ─── Webhooks ────────────────────────────────────────────────────────────
    listWebhooks() { return this.webhooks; }

    addWebhook(url: string, label = '') {
        const id = `wh_${Date.now()}`;
        this.webhooks.push({ id, url, label });
        return { id, url, label };
    }

    deleteWebhook(id: string) {
        this.webhooks = this.webhooks.filter(w => w.id !== id);
        return { deleted: id };
    }

    /** Fire all registered outbound webhooks */
    async fireWebhooks(event: string, payload: any) {
        for (const wh of this.webhooks) {
            try {
                await fetch(wh.url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ event, payload, timestamp: new Date().toISOString() }),
                });
                this.logger.log(`Webhook fired: ${wh.url}`);
            } catch (e) {
                this.logger.warn(`Webhook failed ${wh.url}: ${e.message}`);
            }
        }
    }

    // ─── GoHighLevel ─────────────────────────────────────────────────────────
    getGhlKey() { return { configured: !!this.ghlKey }; }

    saveGhlKey(key: string) { this.ghlKey = key; return { saved: true }; }

    async testGhl(apiKey: string) {
        try {
            const res = await fetch('https://rest.gohighlevel.com/v1/contacts/?limit=1', {
                headers: { Authorization: `Bearer ${apiKey}` },
            });
            return { ok: res.ok, status: res.status };
        } catch (e) {
            return { ok: false, error: e.message };
        }
    }

    /** Sync a disposition to GHL as a note on a contact */
    async syncDispositionToGhl(phone: string, leadName: string, disposition: string, notes: string) {
        if (!this.ghlKey) return;
        try {
            // Search contact by phone
            const searchRes = await fetch(`https://rest.gohighlevel.com/v1/contacts/?query=${encodeURIComponent(phone)}`, {
                headers: { Authorization: `Bearer ${this.ghlKey}` },
            });
            const data = await searchRes.json() as any;
            const contact = data?.contacts?.[0];
            if (!contact) return;
            // Add note
            await fetch(`https://rest.gohighlevel.com/v1/contacts/${contact.id}/notes/`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${this.ghlKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ body: `[WinFi Dialer] ${disposition}: ${notes || ''}` }),
            });
            this.logger.log(`GHL synced: ${leadName} → ${disposition}`);
        } catch (e) {
            this.logger.warn(`GHL sync failed: ${e.message}`);
        }
    }

    // ─── SMS Templates ────────────────────────────────────────────────────────
    listSmsTemplates() { return this.smsTemplates; }

    saveSmsTemplate(name: string, message: string) {
        const id = `sms_${Date.now()}`;
        this.smsTemplates.push({ id, name, message });
        return { id, name, message };
    }

    deleteSmsTemplate(id: string) {
        this.smsTemplates = this.smsTemplates.filter(t => t.id !== id);
        return { deleted: id };
    }

    // ─── Send SMS ─────────────────────────────────────────────────────────────
    async sendSms(to: string, message: string, from?: string) {
        const fromNum = from || this.config.get<string>('DEFAULT_OUTBOUND_NUMBER') || '+12623990007';
        try {
            await this.voip.sendSms(to, fromNum, message);
            this.logger.log(`SMS sent to ${to}`);
            return { sent: true, to };
        } catch (e) {
            this.logger.error(`SMS failed: ${e.message}`);
            return { sent: false, error: e.message };
        }
    }
}

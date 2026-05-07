import { Body, Controller, Delete, Get, Param, Post, SetMetadata } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';

@Controller('integrations')
export class IntegrationsController {
    constructor(private svc: IntegrationsService) { }

    // ── Webhooks ──────────────────────────────────────────────────────────
    @SetMetadata('isPublic', true)
    @Get('webhooks')
    listWebhooks() { return this.svc.listWebhooks(); }

    @SetMetadata('isPublic', true)
    @Post('webhooks')
    addWebhook(@Body() body: { url: string; label?: string }) {
        return this.svc.addWebhook(body.url, body.label);
    }

    @SetMetadata('isPublic', true)
    @Delete('webhooks/:id')
    deleteWebhook(@Param('id') id: string) { return this.svc.deleteWebhook(id); }

    // ── GoHighLevel ───────────────────────────────────────────────────────
    @SetMetadata('isPublic', true)
    @Post('ghl/test')
    testGhl(@Body() body: { apiKey: string }) { return this.svc.testGhl(body.apiKey); }

    @SetMetadata('isPublic', true)
    @Post('ghl/save-key')
    saveGhlKey(@Body() body: { apiKey: string }) { return this.svc.saveGhlKey(body.apiKey); }

    @SetMetadata('isPublic', true)
    @Get('ghl/key')
    getGhlKey() { return this.svc.getGhlKey(); }

    // ── SMS Templates ─────────────────────────────────────────────────────
    @SetMetadata('isPublic', true)
    @Get('sms-templates')
    listSmsTemplates() { return this.svc.listSmsTemplates(); }

    @SetMetadata('isPublic', true)
    @Post('sms-templates')
    saveSmsTemplate(@Body() body: { name: string; message: string }) {
        return this.svc.saveSmsTemplate(body.name, body.message);
    }

    @SetMetadata('isPublic', true)
    @Delete('sms-templates/:id')
    deleteSmsTemplate(@Param('id') id: string) { return this.svc.deleteSmsTemplate(id); }

    // ── Send SMS ──────────────────────────────────────────────────────────
    @SetMetadata('isPublic', true)
    @Post('sms/send')
    sendSms(@Body() body: { to: string; message: string; from?: string }) {
        return this.svc.sendSms(body.to, body.message, body.from);
    }
}

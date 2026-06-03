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
exports.IntegrationsController = void 0;
const common_1 = require("@nestjs/common");
const integrations_service_1 = require("./integrations.service");
let IntegrationsController = class IntegrationsController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    listWebhooks() { return this.svc.listWebhooks(); }
    addWebhook(body) {
        return this.svc.addWebhook(body.url, body.label);
    }
    deleteWebhook(id) { return this.svc.deleteWebhook(id); }
    testGhl(body) { return this.svc.testGhl(body.apiKey); }
    saveGhlKey(body) { return this.svc.saveGhlKey(body.apiKey); }
    getGhlKey() { return this.svc.getGhlKey(); }
    listSmsTemplates() { return this.svc.listSmsTemplates(); }
    saveSmsTemplate(body) {
        return this.svc.saveSmsTemplate(body.name, body.message);
    }
    deleteSmsTemplate(id) { return this.svc.deleteSmsTemplate(id); }
    sendSms(body) {
        return this.svc.sendSms(body.to, body.message, body.from);
    }
};
exports.IntegrationsController = IntegrationsController;
__decorate([
    (0, common_1.SetMetadata)('isPublic', true),
    (0, common_1.Get)('webhooks'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], IntegrationsController.prototype, "listWebhooks", null);
__decorate([
    (0, common_1.SetMetadata)('isPublic', true),
    (0, common_1.Post)('webhooks'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], IntegrationsController.prototype, "addWebhook", null);
__decorate([
    (0, common_1.SetMetadata)('isPublic', true),
    (0, common_1.Delete)('webhooks/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], IntegrationsController.prototype, "deleteWebhook", null);
__decorate([
    (0, common_1.SetMetadata)('isPublic', true),
    (0, common_1.Post)('ghl/test'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], IntegrationsController.prototype, "testGhl", null);
__decorate([
    (0, common_1.SetMetadata)('isPublic', true),
    (0, common_1.Post)('ghl/save-key'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], IntegrationsController.prototype, "saveGhlKey", null);
__decorate([
    (0, common_1.SetMetadata)('isPublic', true),
    (0, common_1.Get)('ghl/key'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], IntegrationsController.prototype, "getGhlKey", null);
__decorate([
    (0, common_1.SetMetadata)('isPublic', true),
    (0, common_1.Get)('sms-templates'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], IntegrationsController.prototype, "listSmsTemplates", null);
__decorate([
    (0, common_1.SetMetadata)('isPublic', true),
    (0, common_1.Post)('sms-templates'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], IntegrationsController.prototype, "saveSmsTemplate", null);
__decorate([
    (0, common_1.SetMetadata)('isPublic', true),
    (0, common_1.Delete)('sms-templates/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], IntegrationsController.prototype, "deleteSmsTemplate", null);
__decorate([
    (0, common_1.SetMetadata)('isPublic', true),
    (0, common_1.Post)('sms/send'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], IntegrationsController.prototype, "sendSms", null);
exports.IntegrationsController = IntegrationsController = __decorate([
    (0, common_1.Controller)('integrations'),
    __metadata("design:paramtypes", [integrations_service_1.IntegrationsService])
], IntegrationsController);
//# sourceMappingURL=integrations.controller.js.map
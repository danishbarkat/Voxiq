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
exports.VoicemailController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const voicemail_service_1 = require("./voicemail.service");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const voicemail_dto_1 = require("./voicemail.dto");
let VoicemailController = class VoicemailController {
    voicemailService;
    constructor(voicemailService) {
        this.voicemailService = voicemailService;
    }
    async uploadTemplateLegacy(file, body) {
        return this.uploadTemplate(file, body);
    }
    async uploadTemplate(file, body) {
        if (!file) {
            throw new common_1.BadRequestException('No file uploaded');
        }
        if (!body.name || !body.accountId) {
            throw new common_1.BadRequestException('name and accountId are required');
        }
        return this.voicemailService.uploadVoicemailAudio(file, body.name, body.accountId);
    }
    async getTemplatesLegacy(accountId) {
        return this.getTemplates(accountId);
    }
    async getTemplates(accountId) {
        return this.voicemailService.getVoicemailTemplates(accountId);
    }
    async getTemplate(id) {
        return this.voicemailService.getTemplate(id);
    }
    async getPlaybackUrl(id) {
        const url = await this.voicemailService.getPlaybackUrl(id);
        return { url };
    }
    async deleteTemplate(id, accountId) {
        await this.voicemailService.deleteTemplate(id, accountId);
        return { message: 'Template deleted successfully' };
    }
};
exports.VoicemailController = VoicemailController;
__decorate([
    (0, roles_decorator_1.Roles)('Admin', 'Manager', 'Agent'),
    (0, common_1.Post)(),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, voicemail_dto_1.CreateVoicemailDto]),
    __metadata("design:returntype", Promise)
], VoicemailController.prototype, "uploadTemplateLegacy", null);
__decorate([
    (0, roles_decorator_1.Roles)('Admin', 'Manager', 'Agent'),
    (0, common_1.Post)('templates'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, voicemail_dto_1.CreateVoicemailDto]),
    __metadata("design:returntype", Promise)
], VoicemailController.prototype, "uploadTemplate", null);
__decorate([
    (0, roles_decorator_1.Roles)('Admin', 'Manager', 'Agent'),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('accountId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], VoicemailController.prototype, "getTemplatesLegacy", null);
__decorate([
    (0, roles_decorator_1.Roles)('Admin', 'Manager', 'Agent'),
    (0, common_1.Get)('templates'),
    __param(0, (0, common_1.Query)('accountId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], VoicemailController.prototype, "getTemplates", null);
__decorate([
    (0, roles_decorator_1.Roles)('Admin', 'Manager', 'Agent'),
    (0, common_1.Get)('templates/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], VoicemailController.prototype, "getTemplate", null);
__decorate([
    (0, roles_decorator_1.Roles)('Admin', 'Manager', 'Agent'),
    (0, common_1.Get)('templates/:id/playback'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], VoicemailController.prototype, "getPlaybackUrl", null);
__decorate([
    (0, roles_decorator_1.Roles)('Admin', 'Manager'),
    (0, common_1.Delete)('templates/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('accountId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], VoicemailController.prototype, "deleteTemplate", null);
exports.VoicemailController = VoicemailController = __decorate([
    (0, common_1.Controller)('voicemail'),
    __metadata("design:paramtypes", [voicemail_service_1.VoicemailService])
], VoicemailController);
//# sourceMappingURL=voicemail.controller.js.map
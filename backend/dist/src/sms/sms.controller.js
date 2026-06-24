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
exports.SmsController = void 0;
const common_1 = require("@nestjs/common");
const send_sms_dto_1 = require("./dto/send-sms.dto");
const sms_service_1 = require("./sms.service");
let SmsController = class SmsController {
    smsService;
    constructor(smsService) {
        this.smsService = smsService;
    }
    async send(dto, req) {
        const agentId = req.user.userId;
        const accountId = req.user.accountId;
        return this.smsService.send(dto.to, dto.body, dto.from, agentId, accountId, dto.channel || 'sms');
    }
    async getConversations(req, channel) {
        const accountId = req.user.accountId;
        const role = (req.user.role || '').toLowerCase();
        const agentId = (role === 'admin' || role === 'superadmin') ? undefined : req.user.userId;
        return this.smsService.getConversations(accountId, agentId, channel);
    }
    async getThread(number, req, channel) {
        const accountId = req.user.accountId;
        const role = (req.user.role || '').toLowerCase();
        const agentId = (role === 'admin' || role === 'superadmin') ? undefined : req.user.userId;
        return this.smsService.getThread(number, accountId, channel, agentId);
    }
    async deleteConversation(number, req, channel) {
        const accountId = req.user.accountId;
        const role = (req.user.role || '').toLowerCase();
        if (role !== 'admin' && role !== 'superadmin') {
            return { error: 'Only admins can delete conversations' };
        }
        return this.smsService.deleteConversation(number, accountId, channel);
    }
};
exports.SmsController = SmsController;
__decorate([
    (0, common_1.Post)('send'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [send_sms_dto_1.SendSmsDto, Object]),
    __metadata("design:returntype", Promise)
], SmsController.prototype, "send", null);
__decorate([
    (0, common_1.Get)('conversations'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('channel')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], SmsController.prototype, "getConversations", null);
__decorate([
    (0, common_1.Get)('conversations/:number'),
    __param(0, (0, common_1.Param)('number')),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Query)('channel')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", Promise)
], SmsController.prototype, "getThread", null);
__decorate([
    (0, common_1.Delete)('conversations/:number'),
    __param(0, (0, common_1.Param)('number')),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Query)('channel')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", Promise)
], SmsController.prototype, "deleteConversation", null);
exports.SmsController = SmsController = __decorate([
    (0, common_1.Controller)('sms'),
    __metadata("design:paramtypes", [sms_service_1.SmsService])
], SmsController);
//# sourceMappingURL=sms.controller.js.map
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
exports.SuperAdminController = void 0;
const common_1 = require("@nestjs/common");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const superadmin_service_1 = require("./superadmin.service");
class NumberEntryDto {
    number;
    callerName;
    areaCode;
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], NumberEntryDto.prototype, "number", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], NumberEntryDto.prototype, "callerName", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], NumberEntryDto.prototype, "areaCode", void 0);
class ApproveDto {
    agentLimit;
    numberPool;
    packageName;
}
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], ApproveDto.prototype, "agentLimit", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => NumberEntryDto),
    __metadata("design:type", Array)
], ApproveDto.prototype, "numberPool", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ApproveDto.prototype, "packageName", void 0);
class AssignNumbersDto {
    numberPool;
}
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => NumberEntryDto),
    __metadata("design:type", Array)
], AssignNumbersDto.prototype, "numberPool", void 0);
class RejectDto {
    reason;
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RejectDto.prototype, "reason", void 0);
class TranscribeRecordingDto {
    source;
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['recording', 'voicemail']),
    __metadata("design:type", String)
], TranscribeRecordingDto.prototype, "source", void 0);
let SuperAdminController = class SuperAdminController {
    superAdminService;
    constructor(superAdminService) {
        this.superAdminService = superAdminService;
    }
    getDashboard() {
        return this.superAdminService.getDashboard();
    }
    getOverview() {
        return this.superAdminService.getOverview();
    }
    getAllCompanies() {
        return this.superAdminService.getAllCompanies();
    }
    getCompanyDetails(id) {
        return this.superAdminService.getCompanyDetails(id);
    }
    regenerateAccessCode(id) {
        return this.superAdminService.regenerateAccessCode(id);
    }
    approveCompany(id, dto) {
        return this.superAdminService.approveCompany(id, dto.agentLimit, dto.numberPool, dto.packageName);
    }
    rejectCompany(id, dto) {
        return this.superAdminService.rejectCompany(id, dto.reason);
    }
    deactivateCompany(id) {
        return this.superAdminService.deactivateCompany(id);
    }
    deleteCompany(id) {
        return this.superAdminService.deleteCompany(id);
    }
    activateCompany(id) {
        return this.superAdminService.activateCompany(id);
    }
    getPendingVerifications() {
        return this.superAdminService.getPendingVerifications();
    }
    resendOtp(email) {
        return this.superAdminService.regenerateOtp(email);
    }
    getAvailableNumbers() {
        return this.superAdminService.getAvailableNumbers();
    }
    searchAvailableNumbers(country, areaCode, type) {
        return this.superAdminService.searchAvailableNumbers({ country: country || 'US', areaCode, type });
    }
    orderNumber(body) {
        return this.superAdminService.orderNumber(body.phoneNumber, body.features || ['voice']);
    }
    createMessagingProfile(name) {
        return this.superAdminService.createMessagingProfile(name);
    }
    getMessagingProfile() {
        return this.superAdminService.getMessagingProfile();
    }
    assignNumbers(id, dto) {
        return this.superAdminService.assignNumbers(id, dto.numberPool);
    }
    unassignNumber(id, number) {
        return this.superAdminService.unassignNumber(id, number);
    }
    assignPackage(id, packageName) {
        return this.superAdminService.assignPackage(id, packageName);
    }
    updateAgentLimit(id, agentLimit) {
        return this.superAdminService.updateAgentLimit(id, Number(agentLimit));
    }
    updateFeatures(id, body) {
        return this.superAdminService.updateFeatures(id, body);
    }
    getPackageUsage(id) {
        return this.superAdminService.getPackageUsage(id);
    }
    getPackages() {
        return superadmin_service_1.SuperAdminService.PACKAGES;
    }
    getBillingSummary() {
        return this.superAdminService.getBillingSummary();
    }
    getAnalytics() {
        return this.superAdminService.getAnalytics();
    }
    getCompanyAnalytics(id) {
        return this.superAdminService.getCompanyAnalytics(id);
    }
    getRecordings(accountId, search, from, to, limit) {
        return this.superAdminService.getRecordings({
            accountId,
            search,
            from,
            to,
            limit: limit ? Number(limit) : undefined,
        });
    }
    getCompanyRecordings(id, search, from, to, limit) {
        return this.superAdminService.getRecordings({
            accountId: id,
            search,
            from,
            to,
            limit: limit ? Number(limit) : undefined,
        });
    }
    transcribeRecording(id, dto) {
        return this.superAdminService.transcribeRecording(id, dto.source || 'recording');
    }
};
exports.SuperAdminController = SuperAdminController;
__decorate([
    (0, common_1.Get)('dashboard'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SuperAdminController.prototype, "getDashboard", null);
__decorate([
    (0, common_1.Get)('overview'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SuperAdminController.prototype, "getOverview", null);
__decorate([
    (0, common_1.Get)('companies'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SuperAdminController.prototype, "getAllCompanies", null);
__decorate([
    (0, common_1.Get)('companies/:id/details'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SuperAdminController.prototype, "getCompanyDetails", null);
__decorate([
    (0, common_1.Post)('companies/:id/access-code/regenerate'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SuperAdminController.prototype, "regenerateAccessCode", null);
__decorate([
    (0, common_1.Post)('companies/:id/approve'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, ApproveDto]),
    __metadata("design:returntype", void 0)
], SuperAdminController.prototype, "approveCompany", null);
__decorate([
    (0, common_1.Post)('companies/:id/reject'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, RejectDto]),
    __metadata("design:returntype", void 0)
], SuperAdminController.prototype, "rejectCompany", null);
__decorate([
    (0, common_1.Post)('companies/:id/deactivate'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SuperAdminController.prototype, "deactivateCompany", null);
__decorate([
    (0, common_1.Post)('companies/:id/delete'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SuperAdminController.prototype, "deleteCompany", null);
__decorate([
    (0, common_1.Post)('companies/:id/activate'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SuperAdminController.prototype, "activateCompany", null);
__decorate([
    (0, common_1.Get)('pending-verifications'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SuperAdminController.prototype, "getPendingVerifications", null);
__decorate([
    (0, common_1.Post)('pending-verifications/:email/resend-otp'),
    __param(0, (0, common_1.Param)('email')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SuperAdminController.prototype, "resendOtp", null);
__decorate([
    (0, common_1.Get)('numbers'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SuperAdminController.prototype, "getAvailableNumbers", null);
__decorate([
    (0, common_1.Get)('numbers/available'),
    __param(0, (0, common_1.Query)('country')),
    __param(1, (0, common_1.Query)('areaCode')),
    __param(2, (0, common_1.Query)('type')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], SuperAdminController.prototype, "searchAvailableNumbers", null);
__decorate([
    (0, common_1.Post)('numbers/order'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SuperAdminController.prototype, "orderNumber", null);
__decorate([
    (0, common_1.Post)('messaging/create-profile'),
    __param(0, (0, common_1.Body)('name')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SuperAdminController.prototype, "createMessagingProfile", null);
__decorate([
    (0, common_1.Get)('messaging/profile'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SuperAdminController.prototype, "getMessagingProfile", null);
__decorate([
    (0, common_1.Post)('companies/:id/assign-numbers'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, AssignNumbersDto]),
    __metadata("design:returntype", void 0)
], SuperAdminController.prototype, "assignNumbers", null);
__decorate([
    (0, common_1.Post)('companies/:id/unassign-number'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('number')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], SuperAdminController.prototype, "unassignNumber", null);
__decorate([
    (0, common_1.Patch)('companies/:id/package'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('packageName')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], SuperAdminController.prototype, "assignPackage", null);
__decorate([
    (0, common_1.Patch)('companies/:id/agent-limit'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('agentLimit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", void 0)
], SuperAdminController.prototype, "updateAgentLimit", null);
__decorate([
    (0, common_1.Patch)('companies/:id/features'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], SuperAdminController.prototype, "updateFeatures", null);
__decorate([
    (0, common_1.Get)('companies/:id/package-usage'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SuperAdminController.prototype, "getPackageUsage", null);
__decorate([
    (0, common_1.Get)('packages'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SuperAdminController.prototype, "getPackages", null);
__decorate([
    (0, common_1.Get)('billing-summary'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SuperAdminController.prototype, "getBillingSummary", null);
__decorate([
    (0, common_1.Get)('analytics'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SuperAdminController.prototype, "getAnalytics", null);
__decorate([
    (0, common_1.Get)('analytics/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SuperAdminController.prototype, "getCompanyAnalytics", null);
__decorate([
    (0, common_1.Get)('recordings'),
    __param(0, (0, common_1.Query)('accountId')),
    __param(1, (0, common_1.Query)('search')),
    __param(2, (0, common_1.Query)('from')),
    __param(3, (0, common_1.Query)('to')),
    __param(4, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], SuperAdminController.prototype, "getRecordings", null);
__decorate([
    (0, common_1.Get)('companies/:id/recordings'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('search')),
    __param(2, (0, common_1.Query)('from')),
    __param(3, (0, common_1.Query)('to')),
    __param(4, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], SuperAdminController.prototype, "getCompanyRecordings", null);
__decorate([
    (0, common_1.Post)('recordings/:id/transcribe'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, TranscribeRecordingDto]),
    __metadata("design:returntype", void 0)
], SuperAdminController.prototype, "transcribeRecording", null);
exports.SuperAdminController = SuperAdminController = __decorate([
    (0, common_1.Controller)('superadmin'),
    (0, roles_decorator_1.Roles)('SuperAdmin'),
    __metadata("design:paramtypes", [superadmin_service_1.SuperAdminService])
], SuperAdminController);
//# sourceMappingURL=superadmin.controller.js.map
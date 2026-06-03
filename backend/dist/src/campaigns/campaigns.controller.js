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
exports.CampaignsController = void 0;
const common_1 = require("@nestjs/common");
const campaigns_service_1 = require("./campaigns.service");
const create_campaign_dto_1 = require("./dto/create-campaign.dto");
const update_campaign_dto_1 = require("./dto/update-campaign.dto");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
let CampaignsController = class CampaignsController {
    campaignsService;
    constructor(campaignsService) {
        this.campaignsService = campaignsService;
    }
    create(createCampaignDto) {
        return this.campaignsService.create(createCampaignDto);
    }
    findAll(accountId) {
        return this.campaignsService.findAll(accountId);
    }
    findOne(id) {
        return this.campaignsService.findOne(id);
    }
    getMetrics(id) {
        return this.campaignsService.getMetrics(id);
    }
    assignLists(id, listIds) {
        return this.campaignsService.assignLists(id, listIds || []);
    }
    getAssignedLists(id) {
        return this.campaignsService.getAssignedLists(id);
    }
    update(id, updateCampaignDto) {
        return this.campaignsService.update(id, updateCampaignDto);
    }
    remove(id) {
        return this.campaignsService.remove(id);
    }
};
exports.CampaignsController = CampaignsController;
__decorate([
    (0, roles_decorator_1.Roles)('Admin', 'Manager'),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_campaign_dto_1.CreateCampaignDto]),
    __metadata("design:returntype", void 0)
], CampaignsController.prototype, "create", null);
__decorate([
    (0, roles_decorator_1.Roles)('Admin', 'Manager', 'Agent'),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('accountId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CampaignsController.prototype, "findAll", null);
__decorate([
    (0, roles_decorator_1.Roles)('Admin', 'Manager', 'Agent'),
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CampaignsController.prototype, "findOne", null);
__decorate([
    (0, roles_decorator_1.Roles)('Admin', 'Manager', 'Agent'),
    (0, common_1.Get)(':id/metrics'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CampaignsController.prototype, "getMetrics", null);
__decorate([
    (0, roles_decorator_1.Roles)('Admin', 'Manager'),
    (0, common_1.Patch)(':id/lists'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('listIds')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Array]),
    __metadata("design:returntype", void 0)
], CampaignsController.prototype, "assignLists", null);
__decorate([
    (0, roles_decorator_1.Roles)('Admin', 'Manager', 'Agent'),
    (0, common_1.Get)(':id/lists'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CampaignsController.prototype, "getAssignedLists", null);
__decorate([
    (0, roles_decorator_1.Roles)('Admin', 'Manager'),
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_campaign_dto_1.UpdateCampaignDto]),
    __metadata("design:returntype", void 0)
], CampaignsController.prototype, "update", null);
__decorate([
    (0, roles_decorator_1.Roles)('Admin'),
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CampaignsController.prototype, "remove", null);
exports.CampaignsController = CampaignsController = __decorate([
    (0, common_1.Controller)('campaigns'),
    __metadata("design:paramtypes", [campaigns_service_1.CampaignsService])
], CampaignsController);
//# sourceMappingURL=campaigns.controller.js.map
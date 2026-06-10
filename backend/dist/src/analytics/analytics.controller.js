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
exports.AnalyticsController = void 0;
const common_1 = require("@nestjs/common");
const analytics_service_1 = require("./analytics.service");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
let AnalyticsController = class AnalyticsController {
    analyticsService;
    constructor(analyticsService) {
        this.analyticsService = analyticsService;
    }
    getOverview(req) {
        return this.analyticsService.getOverview(req?.user);
    }
    getHourly(date, req) {
        return this.analyticsService.getHourlyStats(date, req?.user);
    }
    async exportCsv(start, end, res, req) {
        const csv = await this.analyticsService.exportCsv(start ? new Date(start) : undefined, end ? new Date(end) : undefined, req?.user);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="calls-export-${Date.now()}.csv"`);
        res.send(csv);
    }
    getAgentScores(req) {
        return this.analyticsService.getAllAgentScores(req?.user);
    }
    getRecordings(limit, phone, agentId, dateFrom, dateTo, req) {
        return this.analyticsService.getRecordings({
            limit: limit ? parseInt(limit) : 200,
            phone,
            agentId,
            dateFrom,
            dateTo,
        }, req?.user);
    }
    getMyPeriodStats(tzOffset, req) {
        return this.analyticsService.getMyPeriodStats(req?.user, tzOffset !== undefined ? parseInt(tzOffset, 10) : undefined);
    }
    getHistory(limit, req) {
        return this.analyticsService.getHistory({
            limit: limit ? parseInt(limit) : 150,
        }, req?.user);
    }
    getHeatmap(req) {
        return this.analyticsService.getStateHeatmap(req?.user);
    }
    getCountryHeatmap(req) {
        return this.analyticsService.getCountryHeatmap(req?.user);
    }
    updateTags(id, tags, req) {
        return this.analyticsService.updateCallTags(id, tags, req?.user);
    }
    getCampaignStats(id, start, end, req) {
        return this.analyticsService.getCampaignStats(id, start ? new Date(start) : undefined, end ? new Date(end) : undefined, req?.user);
    }
    getAgentStats(id, start, end, req) {
        return this.analyticsService.getAgentStats(id, start ? new Date(start) : undefined, end ? new Date(end) : undefined, req?.user);
    }
};
exports.AnalyticsController = AnalyticsController;
__decorate([
    (0, roles_decorator_1.Roles)('Admin', 'Manager', 'Agent'),
    (0, common_1.Get)('overview'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "getOverview", null);
__decorate([
    (0, roles_decorator_1.Roles)('Admin', 'Manager', 'Agent'),
    (0, common_1.Get)('hourly'),
    __param(0, (0, common_1.Query)('date')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "getHourly", null);
__decorate([
    (0, roles_decorator_1.Roles)('Admin', 'Manager'),
    (0, common_1.Get)('export'),
    __param(0, (0, common_1.Query)('start')),
    __param(1, (0, common_1.Query)('end')),
    __param(2, (0, common_1.Res)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "exportCsv", null);
__decorate([
    (0, roles_decorator_1.Roles)('Admin', 'Manager'),
    (0, common_1.Get)('agents/scores'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "getAgentScores", null);
__decorate([
    (0, roles_decorator_1.Roles)('Admin', 'Manager'),
    (0, common_1.Get)('recordings'),
    __param(0, (0, common_1.Query)('limit')),
    __param(1, (0, common_1.Query)('phone')),
    __param(2, (0, common_1.Query)('agentId')),
    __param(3, (0, common_1.Query)('dateFrom')),
    __param(4, (0, common_1.Query)('dateTo')),
    __param(5, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, Object]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "getRecordings", null);
__decorate([
    (0, roles_decorator_1.Roles)('Admin', 'Manager', 'Agent'),
    (0, common_1.Get)('my-period-stats'),
    __param(0, (0, common_1.Query)('tzOffset')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "getMyPeriodStats", null);
__decorate([
    (0, roles_decorator_1.Roles)('Admin', 'Manager', 'Agent'),
    (0, common_1.Get)('history'),
    __param(0, (0, common_1.Query)('limit')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "getHistory", null);
__decorate([
    (0, roles_decorator_1.Roles)('Admin', 'Manager'),
    (0, common_1.Get)('heatmap'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "getHeatmap", null);
__decorate([
    (0, roles_decorator_1.Roles)('Admin', 'Manager'),
    (0, common_1.Get)('country-heatmap'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "getCountryHeatmap", null);
__decorate([
    (0, roles_decorator_1.Roles)('Admin', 'Manager'),
    (0, common_1.Patch)('recordings/:id/tags'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('tags')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Array, Object]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "updateTags", null);
__decorate([
    (0, roles_decorator_1.Roles)('Admin', 'Manager'),
    (0, common_1.Get)('campaign/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('start')),
    __param(2, (0, common_1.Query)('end')),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "getCampaignStats", null);
__decorate([
    (0, roles_decorator_1.Roles)('Admin', 'Manager'),
    (0, common_1.Get)('agent/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('start')),
    __param(2, (0, common_1.Query)('end')),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "getAgentStats", null);
exports.AnalyticsController = AnalyticsController = __decorate([
    (0, common_1.Controller)('analytics'),
    __metadata("design:paramtypes", [analytics_service_1.AnalyticsService])
], AnalyticsController);
//# sourceMappingURL=analytics.controller.js.map
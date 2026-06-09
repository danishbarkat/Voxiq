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
exports.LeadsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const leads_service_1 = require("./leads.service");
const create_lead_dto_1 = require("./dto/create-lead.dto");
const update_lead_dto_1 = require("./dto/update-lead.dto");
const client_1 = require("@prisma/client");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
let LeadsController = class LeadsController {
    leadsService;
    constructor(leadsService) {
        this.leadsService = leadsService;
    }
    downloadTemplate(res) {
        const headers = ['firstName', 'lastName', 'phone', 'address', 'tags', 'email', 'company', 'notes'];
        const sample1 = ['Muhammad', 'Usman', '+923001234567', 'House 5 Block A DHA Lahore', 'hot-lead,interested', 'usman@yourcompany.com', 'Usman Trading Co', 'Interested in product - call back requested'];
        const sample2 = ['Ayesha', 'Siddiqui', '+923451234567', 'Flat 12 Gulshan-e-Iqbal Karachi', 'follow-up,callback', 'ayesha@yourcompany.com', 'Siddiqui Enterprises', 'Wants demo on Wednesday afternoon'];
        const sample3 = ['Bilal', 'Ahmed', '+923211234567', 'Street 3 G-11 Islamabad', 'new', 'bilal@yourcompany.com', 'Ahmed Solutions', ''];
        const rows = [headers, sample1, sample2, sample3]
            .map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(','))
            .join('\r\n');
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="voxiq-leads-template.csv"');
        res.send('﻿' + rows);
    }
    async importCsv(file, accountId, listId, newListName, req) {
        if (!file) {
            throw new common_1.BadRequestException('No file uploaded');
        }
        if (!accountId) {
            throw new common_1.BadRequestException('accountId is required');
        }
        if (!listId && !newListName) {
            throw new common_1.BadRequestException('Either listId or newListName is required');
        }
        const result = await this.leadsService.importCsv(file, accountId, listId, newListName, req?.user);
        return {
            message: 'Import completed',
            ...result,
        };
    }
    create(createLeadDto, req) {
        return this.leadsService.create(createLeadDto, req?.user);
    }
    findAll(accountId, listId, status, agentId, limit, offset, req) {
        return this.leadsService.findAll({
            accountId,
            listId,
            status,
            agentId,
            limit: limit ? parseInt(limit) : undefined,
            offset: offset ? parseInt(offset) : undefined,
        }, req?.user);
    }
    findAllLists(accountId, req) {
        return this.leadsService.findAllLists(accountId, req?.user);
    }
    findAllAccounts(req) {
        return this.leadsService.findAllAccounts(req?.user);
    }
    createAccount(name, req) {
        if (!name)
            throw new common_1.BadRequestException('Account name is required');
        return this.leadsService.createAccount(name, req?.user);
    }
    updateAccount(id, data, req) {
        return this.leadsService.updateAccount(id, data, req?.user);
    }
    deleteAccount(id, req) {
        return this.leadsService.deleteAccount(id, req?.user);
    }
    createList(name, accountId, description, req) {
        if (!name || !accountId) {
            throw new common_1.BadRequestException('list name and accountId are required');
        }
        return this.leadsService.createList({ name, accountId, description }, req?.user);
    }
    findOne(id, req) {
        return this.leadsService.findOne(id, req?.user);
    }
    getCallHistory(id, req) {
        return this.leadsService.getCallHistory(id, req?.user);
    }
    update(id, updateLeadDto, req) {
        return this.leadsService.update(id, updateLeadDto, req?.user);
    }
    updateStatus(id, status, req) {
        return this.leadsService.updateStatus(id, status, req?.user);
    }
    removeList(id, req) {
        return this.leadsService.deleteList(id, req?.user);
    }
    removeLead(id, req) {
        return this.leadsService.deleteLead(id, req?.user);
    }
};
exports.LeadsController = LeadsController;
__decorate([
    (0, roles_decorator_1.Roles)('Admin', 'Manager'),
    (0, common_1.Get)('import/template'),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], LeadsController.prototype, "downloadTemplate", null);
__decorate([
    (0, roles_decorator_1.Roles)('Admin', 'Manager'),
    (0, common_1.Post)('import'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)('accountId')),
    __param(2, (0, common_1.Body)('listId')),
    __param(3, (0, common_1.Body)('newListName')),
    __param(4, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, Object]),
    __metadata("design:returntype", Promise)
], LeadsController.prototype, "importCsv", null);
__decorate([
    (0, roles_decorator_1.Roles)('Admin', 'Manager'),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_lead_dto_1.CreateLeadDto, Object]),
    __metadata("design:returntype", void 0)
], LeadsController.prototype, "create", null);
__decorate([
    (0, roles_decorator_1.Roles)('Admin', 'Manager', 'Agent'),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('accountId')),
    __param(1, (0, common_1.Query)('listId')),
    __param(2, (0, common_1.Query)('status')),
    __param(3, (0, common_1.Query)('agentId')),
    __param(4, (0, common_1.Query)('limit')),
    __param(5, (0, common_1.Query)('offset')),
    __param(6, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, Object]),
    __metadata("design:returntype", void 0)
], LeadsController.prototype, "findAll", null);
__decorate([
    (0, roles_decorator_1.Roles)('Admin', 'Manager'),
    (0, common_1.Get)('lists'),
    __param(0, (0, common_1.Query)('accountId')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], LeadsController.prototype, "findAllLists", null);
__decorate([
    (0, roles_decorator_1.Roles)('Admin'),
    (0, common_1.Get)('accounts'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], LeadsController.prototype, "findAllAccounts", null);
__decorate([
    (0, roles_decorator_1.Roles)('Admin'),
    (0, common_1.Post)('accounts'),
    __param(0, (0, common_1.Body)('name')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], LeadsController.prototype, "createAccount", null);
__decorate([
    (0, roles_decorator_1.Roles)('Admin'),
    (0, common_1.Patch)('accounts/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], LeadsController.prototype, "updateAccount", null);
__decorate([
    (0, roles_decorator_1.Roles)('Admin'),
    (0, common_1.Delete)('accounts/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], LeadsController.prototype, "deleteAccount", null);
__decorate([
    (0, roles_decorator_1.Roles)('Admin', 'Manager'),
    (0, common_1.Post)('lists'),
    __param(0, (0, common_1.Body)('name')),
    __param(1, (0, common_1.Body)('accountId')),
    __param(2, (0, common_1.Body)('description')),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", void 0)
], LeadsController.prototype, "createList", null);
__decorate([
    (0, roles_decorator_1.Roles)('Admin', 'Manager', 'Agent'),
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], LeadsController.prototype, "findOne", null);
__decorate([
    (0, roles_decorator_1.Roles)('Admin', 'Manager', 'Agent'),
    (0, common_1.Get)(':id/history'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], LeadsController.prototype, "getCallHistory", null);
__decorate([
    (0, roles_decorator_1.Roles)('Admin', 'Manager'),
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_lead_dto_1.UpdateLeadDto, Object]),
    __metadata("design:returntype", void 0)
], LeadsController.prototype, "update", null);
__decorate([
    (0, roles_decorator_1.Roles)('Admin', 'Manager', 'Agent'),
    (0, common_1.Patch)(':id/status'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('status')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], LeadsController.prototype, "updateStatus", null);
__decorate([
    (0, roles_decorator_1.Roles)('Admin', 'Manager'),
    (0, common_1.Delete)('lists/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], LeadsController.prototype, "removeList", null);
__decorate([
    (0, roles_decorator_1.Roles)('Admin', 'Manager'),
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], LeadsController.prototype, "removeLead", null);
exports.LeadsController = LeadsController = __decorate([
    (0, common_1.Controller)('leads'),
    __metadata("design:paramtypes", [leads_service_1.LeadsService])
], LeadsController);
//# sourceMappingURL=leads.controller.js.map
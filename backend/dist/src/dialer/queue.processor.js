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
var QueueProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueProcessor = void 0;
const bull_1 = require("@nestjs/bull");
const common_1 = require("@nestjs/common");
const dialer_service_1 = require("./dialer.service");
let QueueProcessor = QueueProcessor_1 = class QueueProcessor {
    dialerService;
    logger = new common_1.Logger(QueueProcessor_1.name);
    constructor(dialerService) {
        this.dialerService = dialerService;
    }
    async handleParallelDial(job) {
        this.logger.log(`Processing parallel dial job: ${job.id}`);
        try {
            await this.dialerService.executeParallelDial(job.data);
            this.logger.log(`Parallel dial job ${job.id} completed`);
        }
        catch (error) {
            this.logger.error(`Parallel dial job ${job.id} failed: ${error.message}`);
            throw error;
        }
    }
    async handleSingleDial(job) {
        this.logger.log(`Processing single dial job: ${job.id}`);
        try {
            await this.dialerService.executeParallelDial({
                campaignId: job.data.campaignId,
                leadIds: [job.data.leadId],
                agentId: job.data.agentId,
            });
            this.logger.log(`Single dial job ${job.id} completed`);
        }
        catch (error) {
            this.logger.error(`Single dial job ${job.id} failed: ${error.message}`);
            throw error;
        }
    }
};
exports.QueueProcessor = QueueProcessor;
__decorate([
    (0, bull_1.Process)('parallel-dial'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], QueueProcessor.prototype, "handleParallelDial", null);
__decorate([
    (0, bull_1.Process)('single-dial'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], QueueProcessor.prototype, "handleSingleDial", null);
exports.QueueProcessor = QueueProcessor = QueueProcessor_1 = __decorate([
    (0, bull_1.Processor)('dialer'),
    __metadata("design:paramtypes", [dialer_service_1.DialerService])
], QueueProcessor);
//# sourceMappingURL=queue.processor.js.map
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
var CallbackService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CallbackService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let CallbackService = CallbackService_1 = class CallbackService {
    prisma;
    logger = new common_1.Logger(CallbackService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async recycleCallbacks() {
        const now = new Date();
        const dueCallbacks = await this.prisma.lead.findMany({
            where: {
                status: client_1.LeadStatus.CALLBACK,
                callbackAt: { lte: now },
            },
            select: { id: true, firstName: true, lastName: true, phone: true },
        });
        if (dueCallbacks.length === 0)
            return;
        this.logger.log(`Recycling ${dueCallbacks.length} callback leads`);
        await this.prisma.lead.updateMany({
            where: { id: { in: dueCallbacks.map(l => l.id) } },
            data: {
                status: client_1.LeadStatus.NEW,
                callbackAt: null,
            },
        });
        this.logger.log(`Recycled: ${dueCallbacks.map(l => `${l.firstName} (${l.phone})`).join(', ')}`);
    }
};
exports.CallbackService = CallbackService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_5_MINUTES),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CallbackService.prototype, "recycleCallbacks", null);
exports.CallbackService = CallbackService = CallbackService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CallbackService);
//# sourceMappingURL=callback.service.js.map
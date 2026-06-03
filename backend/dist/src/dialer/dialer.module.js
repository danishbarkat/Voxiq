"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DialerModule = void 0;
const common_1 = require("@nestjs/common");
const bull_1 = require("@nestjs/bull");
const dialer_service_1 = require("./dialer.service");
const dialer_controller_1 = require("./dialer.controller");
const queue_processor_1 = require("./queue.processor");
const callback_service_1 = require("./callback.service");
const voip_module_1 = require("../voip/voip.module");
const websocket_module_1 = require("../websocket/websocket.module");
const prisma_module_1 = require("../prisma/prisma.module");
let DialerModule = class DialerModule {
};
exports.DialerModule = DialerModule;
exports.DialerModule = DialerModule = __decorate([
    (0, common_1.Module)({
        imports: [
            bull_1.BullModule.registerQueue({
                name: 'dialer',
            }),
            voip_module_1.VoipModule,
            websocket_module_1.WebsocketModule,
            prisma_module_1.PrismaModule,
        ],
        controllers: [dialer_controller_1.DialerController],
        providers: [dialer_service_1.DialerService, queue_processor_1.QueueProcessor, callback_service_1.CallbackService],
        exports: [dialer_service_1.DialerService],
    })
], DialerModule);
//# sourceMappingURL=dialer.module.js.map
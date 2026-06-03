"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoipModule = void 0;
const common_1 = require("@nestjs/common");
const voip_service_1 = require("./voip.service");
const config_1 = require("@nestjs/config");
const voip_controller_1 = require("./voip.controller");
const prisma_module_1 = require("../prisma/prisma.module");
const websocket_module_1 = require("../websocket/websocket.module");
const sms_module_1 = require("../sms/sms.module");
let VoipModule = class VoipModule {
};
exports.VoipModule = VoipModule;
exports.VoipModule = VoipModule = __decorate([
    (0, common_1.Module)({
        imports: [config_1.ConfigModule, prisma_module_1.PrismaModule, (0, common_1.forwardRef)(() => websocket_module_1.WebsocketModule), sms_module_1.SmsModule],
        controllers: [voip_controller_1.VoipController],
        providers: [voip_service_1.VoipService],
        exports: [voip_service_1.VoipService],
    })
], VoipModule);
//# sourceMappingURL=voip.module.js.map
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const bull_1 = require("@nestjs/bull");
const throttler_1 = require("@nestjs/throttler");
const schedule_1 = require("@nestjs/schedule");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const validation_1 = require("./config/validation");
const prisma_module_1 = require("./prisma/prisma.module");
const users_module_1 = require("./users/users.module");
const voip_module_1 = require("./voip/voip.module");
const websocket_module_1 = require("./websocket/websocket.module");
const dialer_module_1 = require("./dialer/dialer.module");
const leads_module_1 = require("./leads/leads.module");
const campaigns_module_1 = require("./campaigns/campaigns.module");
const voicemail_module_1 = require("./voicemail/voicemail.module");
const analytics_module_1 = require("./analytics/analytics.module");
const auth_module_1 = require("./auth/auth.module");
const integrations_module_1 = require("./integrations/integrations.module");
const backup_module_1 = require("./backup/backup.module");
const superadmin_module_1 = require("./superadmin/superadmin.module");
const sms_module_1 = require("./sms/sms.module");
const billing_module_1 = require("./billing/billing.module");
const core_1 = require("@nestjs/core");
const jwt_auth_guard_1 = require("./auth/guards/jwt-auth.guard");
const roles_guard_1 = require("./auth/guards/roles.guard");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: '.env',
                validationSchema: validation_1.validationSchema,
            }),
            throttler_1.ThrottlerModule.forRoot([
                { name: 'short', ttl: 60000, limit: 20 },
                { name: 'long', ttl: 900000, limit: 100 },
            ]),
            schedule_1.ScheduleModule.forRoot(),
            bull_1.BullModule.forRoot({
                redis: {
                    host: process.env.REDIS_HOST || 'localhost',
                    port: parseInt(process.env.REDIS_PORT || '6379'),
                },
            }),
            prisma_module_1.PrismaModule,
            users_module_1.UsersModule,
            voip_module_1.VoipModule,
            websocket_module_1.WebsocketModule,
            dialer_module_1.DialerModule,
            leads_module_1.LeadsModule,
            campaigns_module_1.CampaignsModule,
            voicemail_module_1.VoicemailModule,
            analytics_module_1.AnalyticsModule,
            auth_module_1.AuthModule,
            integrations_module_1.IntegrationsModule,
            backup_module_1.BackupModule,
            superadmin_module_1.SuperAdminModule,
            sms_module_1.SmsModule,
            billing_module_1.BillingModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [
            app_service_1.AppService,
            { provide: core_1.APP_GUARD, useClass: throttler_1.ThrottlerGuard },
            { provide: core_1.APP_GUARD, useClass: jwt_auth_guard_1.JwtAuthGuard },
            { provide: core_1.APP_GUARD, useClass: roles_guard_1.RolesGuard },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map
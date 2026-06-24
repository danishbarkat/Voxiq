import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { validationSchema } from './config/validation';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { VoipModule } from './voip/voip.module';
import { WebsocketModule } from './websocket/websocket.module';
import { DialerModule } from './dialer/dialer.module';
import { LeadsModule } from './leads/leads.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { VoicemailModule } from './voicemail/voicemail.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AuthModule } from './auth/auth.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { BackupModule } from './backup/backup.module';
import { SuperAdminModule } from './superadmin/superadmin.module';
import { SmsModule } from './sms/sms.module';
import { BillingModule } from './billing/billing.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema,
    }),
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 60000, limit: 20 },   // 20 req/min per IP
      { name: 'long',  ttl: 900000, limit: 100 },  // 100 req/15min per IP
    ]),
    ScheduleModule.forRoot(),
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),
    PrismaModule,
    UsersModule,
    VoipModule,
    WebsocketModule,
    DialerModule,
    LeadsModule,
    CampaignsModule,
    VoicemailModule,
    AnalyticsModule,
    AuthModule,
    IntegrationsModule,
    BackupModule,
    SuperAdminModule,
    SmsModule,
    BillingModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule { }

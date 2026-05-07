import { Module } from '@nestjs/common';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import { VoipModule } from '../voip/voip.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [VoipModule, PrismaModule],
    controllers: [IntegrationsController],
    providers: [IntegrationsService],
    exports: [IntegrationsService],
})
export class IntegrationsModule { }

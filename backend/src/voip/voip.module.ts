import { Module, forwardRef } from '@nestjs/common';
import { VoipService } from './voip.service';
import { ConfigModule } from '@nestjs/config';
import { VoipController } from './voip.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { SmsModule } from '../sms/sms.module';

@Module({
    imports: [ConfigModule, PrismaModule, forwardRef(() => WebsocketModule), SmsModule],
    controllers: [VoipController],
    providers: [VoipService],
    exports: [VoipService],
})
export class VoipModule { }

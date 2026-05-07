import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { DialerService } from './dialer.service';
import { DialerController } from './dialer.controller';
import { QueueProcessor } from './queue.processor';
import { CallbackService } from './callback.service';
import { VoipModule } from '../voip/voip.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [
        BullModule.registerQueue({
            name: 'dialer',
        }),
        VoipModule,
        WebsocketModule,
        PrismaModule,
    ],
    controllers: [DialerController],
    providers: [DialerService, QueueProcessor, CallbackService],
    exports: [DialerService],
})
export class DialerModule { }

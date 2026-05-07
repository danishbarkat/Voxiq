import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { VoicemailService } from './voicemail.service';
import { VoicemailController } from './voicemail.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [ConfigModule, PrismaModule],
    controllers: [VoicemailController],
    providers: [VoicemailService],
    exports: [VoicemailService],
})
export class VoicemailModule { }

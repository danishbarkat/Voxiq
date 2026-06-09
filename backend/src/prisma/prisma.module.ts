import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { DataRetentionService } from './data-retention.service';

@Global()
@Module({
  providers: [PrismaService, DataRetentionService],
  exports: [PrismaService],
})
export class PrismaModule {}

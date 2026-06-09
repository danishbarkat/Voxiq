import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from './prisma.service';
import { promises as fs } from 'fs';
import { join } from 'path';

@Injectable()
export class DataRetentionService {
  private readonly logger = new Logger(DataRetentionService.name);
  private readonly retentionDays = 30;

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async purgeExpiredCommunicationHistory() {
    const cutoff = new Date(Date.now() - this.retentionDays * 24 * 60 * 60 * 1000);

    const expiredCalls = await this.prisma.callLog.findMany({
      where: {
        OR: [
          { startedAt: { lt: cutoff } },
          { createdAt: { lt: cutoff } },
        ],
      },
      select: {
        id: true,
        recordingUrl: true,
        vmRecordingUrl: true,
      },
    });

    let deletedFiles = 0;
    for (const call of expiredCalls) {
      for (const url of [call.recordingUrl, call.vmRecordingUrl]) {
        const removed = await this.deleteLocalUploadIfPresent(url);
        if (removed) deletedFiles++;
      }
    }

    const [callResult, smsResult] = await Promise.all([
      this.prisma.callLog.deleteMany({
        where: {
          OR: [
            { startedAt: { lt: cutoff } },
            { createdAt: { lt: cutoff } },
          ],
        },
      }),
      this.prisma.smsMessage.deleteMany({
        where: { createdAt: { lt: cutoff } },
      }),
    ]);

    if (callResult.count || smsResult.count || deletedFiles) {
      this.logger.log(
        `Retention cleanup complete. Deleted ${callResult.count} call logs, ${smsResult.count} SMS messages, ${deletedFiles} local recordings older than ${this.retentionDays} days.`,
      );
    }
  }

  private async deleteLocalUploadIfPresent(url?: string | null) {
    if (!url) return false;
    const marker = '/uploads/recordings/';
    const markerIndex = url.indexOf(marker);
    if (markerIndex === -1) return false;

    const relativePath = url.slice(markerIndex + 1).replace(/\//g, '\\');
    const absolutePath = join(process.cwd(), relativePath);

    try {
      await fs.unlink(absolutePath);
      return true;
    } catch (error: any) {
      if (error?.code !== 'ENOENT') {
        this.logger.warn(`Failed to delete recording ${absolutePath}: ${error?.message || error}`);
      }
      return false;
    }
  }
}

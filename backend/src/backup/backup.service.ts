import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

@Injectable()
export class BackupService {
    private readonly logger = new Logger(BackupService.name);

    constructor(private config: ConfigService) { }

    @Cron(CronExpression.EVERY_DAY_AT_2AM)
    async runDailyBackup() {
        const dbUrl = this.config.get<string>('DATABASE_URL') || '';
        const backupDir = this.config.get<string>('BACKUP_LOCAL_PATH') || '/opt/MB-dailer/backups';

        try {
            if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `backup-${timestamp}.sql`;
            const filepath = path.join(backupDir, filename);

            this.logger.log(`Starting DB backup → ${filepath}`);
            await execAsync(`pg_dump "${dbUrl}" > "${filepath}"`);

            // Keep only last 7 backups
            const files = fs.readdirSync(backupDir)
                .filter(f => f.startsWith('backup-') && f.endsWith('.sql'))
                .map(f => ({ name: f, time: fs.statSync(path.join(backupDir, f)).mtime.getTime() }))
                .sort((a, b) => b.time - a.time);

            for (const old of files.slice(7)) {
                fs.unlinkSync(path.join(backupDir, old.name));
                this.logger.log(`Deleted old backup: ${old.name}`);
            }

            this.logger.log(`Backup complete: ${filename}`);
        } catch (err) {
            this.logger.error(`Backup failed: ${(err as Error).message}`);
        }
    }
}

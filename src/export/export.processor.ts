import { Inject, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { ExportStatus } from './export.entity';
import { IExportRepository } from './interfaces/export.repository.interface';
import { EXPORT_REPOSITORY } from './export.tokens';
import { WorkerHealthRegistry } from '../queue/worker-health.registry';

@Processor('pdf-export')
export class ExportProcessor extends WorkerHost implements OnModuleInit, OnModuleDestroy {
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor(
    @Inject(EXPORT_REPOSITORY) private readonly repository: IExportRepository,
    private readonly workerHealthRegistry: WorkerHealthRegistry,
  ) {
    super();
  }

  onModuleInit(): void {
    this.reportHeartbeat();
    this.heartbeatTimer = setInterval(() => this.reportHeartbeat(), 30_000);
    this.heartbeatTimer.unref();
  }

  onModuleDestroy(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  async process(job: Job<{ exportId: string }>): Promise<void> {
    this.reportHeartbeat();
    const exportId = job.data.exportId;
    const exportJob = await this.repository.findById(exportId);
    if (!exportJob) {
      return;
    }

    await this.repository.updateStatus(exportId, ExportStatus.PROCESSING, {
      status: ExportStatus.PROCESSING,
    });

    try {
      const outDir = join(process.cwd(), 'tmp', 'exports');
      mkdirSync(outDir, { recursive: true });

      const pdfBuffer = Buffer.from('PDF placeholder for export: ' + exportId, 'utf8');
      const filePath = join(outDir, `${exportId}.pdf`);
      writeFileSync(filePath, pdfBuffer);

      await this.repository.updateStatus(exportId, ExportStatus.COMPLETED, {
        status: ExportStatus.COMPLETED,
        downloadPath: filePath,
        fileName: exportJob.fileName,
        completedAt: new Date(),
      });
    } catch (error) {
      await this.repository.updateStatus(exportId, ExportStatus.FAILED, {
        status: ExportStatus.FAILED,
        errorMessage: error instanceof Error ? error.message : 'Unknown PDF export error',
      });
      throw error;
    } finally {
      this.reportHeartbeat();
    }
  }

  private reportHeartbeat(): void {
    this.workerHealthRegistry.heartbeat('pdf-export');
  }
}

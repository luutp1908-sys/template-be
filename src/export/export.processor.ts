import {
  BadRequestException,
  ConflictException,
  Inject,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job, UnrecoverableError } from 'bullmq';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { Logger } from 'nestjs-pino';
import { ExportStatus } from './export.entity';
import { IExportRepository } from './interfaces/export.repository.interface';
import { EXPORT_REPOSITORY } from './export.tokens';
import { WorkerHealthRegistry } from '../queue/worker-health.registry';

@Processor('pdf-export')
export class ExportProcessor extends WorkerHost implements OnModuleInit, OnModuleDestroy {
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private readonly queueName = 'pdf-export';

  constructor(
    @Inject(EXPORT_REPOSITORY) private readonly repository: IExportRepository,
    private readonly workerHealthRegistry: WorkerHealthRegistry,
    private readonly logger: Logger,
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
    this.logger.log(
      {
        module: 'queue',
        operation: 'export.process',
        queue: this.queueName,
        exportId,
      },
      'queue.job.started',
    );
    const exportJob = await this.repository.findById(exportId);
    if (!exportJob) {
      this.logger.warn(
        {
          module: 'queue',
          operation: 'export.process',
          queue: this.queueName,
          exportId,
        },
        'queue.job.export_not_found',
      );
      return;
    }

    try {
      await this.repository.updateStatus(exportId, ExportStatus.PROCESSING, {
        status: ExportStatus.PROCESSING,
      });

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
      this.logger.log(
        {
          module: 'queue',
          operation: 'export.process',
          queue: this.queueName,
          exportId,
          filePath,
        },
        'queue.job.completed',
      );
    } catch (error) {
      const terminalFailure = this.isTerminalFailure(error);

      await this.repository.updateStatus(exportId, ExportStatus.FAILED, {
        status: ExportStatus.FAILED,
        errorMessage: error instanceof Error ? error.message : 'Unknown PDF export error',
      });

      this.logger.error(
        {
          module: 'queue',
          operation: 'export.process',
          queue: this.queueName,
          exportId,
          failureType: terminalFailure ? 'terminal' : 'retryable',
          err: error instanceof Error ? error : undefined,
        },
        terminalFailure ? 'queue.job.failed.terminal' : 'queue.job.failed.retryable',
      );

      if (terminalFailure) {
        const message = error instanceof Error ? error.message : 'Terminal PDF export error';
        throw new UnrecoverableError(message);
      }

      throw error;
    } finally {
      this.reportHeartbeat();
    }
  }

  private reportHeartbeat(): void {
    this.workerHealthRegistry.heartbeat(this.queueName);
  }

  private isTerminalFailure(error: unknown): boolean {
    return (
      error instanceof BadRequestException ||
      error instanceof ConflictException ||
      error instanceof NotFoundException ||
      error instanceof UnprocessableEntityException
    );
  }
}

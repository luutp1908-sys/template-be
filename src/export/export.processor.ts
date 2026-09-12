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
import { ExportEntity, ExportStatus } from './export.entity';
import { IExportRepository } from './interfaces/export.repository.interface';
import { EXPORT_REPOSITORY } from './export.tokens';
import { WorkerHealthRegistry } from '../queue/worker-health.registry';

@Processor('pdf-export')
export class ExportProcessor extends WorkerHost implements OnModuleInit, OnModuleDestroy {
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private readonly queueName = 'pdf-export';
  private readonly operation = 'export.process';

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
    const attemptCount = this.resolveAttemptCount(job);
    this.logger.log(this.logContext(exportId, attemptCount), 'queue.job.started');

    const exportJob = await this.loadExportJobOrSkip(exportId);
    if (!exportJob) {
      return;
    }

    if (this.shouldSkipDuplicate(exportJob, exportId, attemptCount)) {
      return;
    }

    try {
      const claimed = await this.claimProcessingState(exportId, attemptCount);
      if (!claimed) {
        return;
      }

      const filePath = this.generatePdfFile(exportId);

      const completed = await this.markCompleted(exportId, exportJob.fileName, attemptCount, filePath);
      if (!completed) {
        return;
      }

      this.logger.log(
        this.logContext(exportId, attemptCount, { filePath }),
        'queue.job.completed',
      );
    } catch (error) {
      await this.handleProcessingError(error, job, exportId, attemptCount);
    } finally {
      this.reportHeartbeat();
    }
  }

  private async loadExportJobOrSkip(exportId: string): Promise<ExportEntity | null> {
    const exportJob = await this.repository.findById(exportId);
    if (exportJob) {
      return exportJob;
    }

    this.logger.warn(this.logContext(exportId), 'queue.job.export_not_found');
    return null;
  }

  private shouldSkipDuplicate(exportJob: ExportEntity, exportId: string, attemptCount: number): boolean {
    if (exportJob.status === ExportStatus.COMPLETED) {
      this.logger.log(
        this.logContext(exportId, attemptCount, { state: exportJob.status }),
        'queue.job.idempotent.skip_completed',
      );
      return true;
    }

    if (exportJob.status === ExportStatus.PROCESSING) {
      this.logger.warn(
        this.logContext(exportId, attemptCount, { state: exportJob.status }),
        'queue.job.idempotent.skip_processing',
      );
      return true;
    }

    return false;
  }

  private async claimProcessingState(exportId: string, attemptCount: number): Promise<boolean> {
    const processingClaim = await this.repository.updateStatus(
      exportId,
      ExportStatus.PROCESSING,
      {
        status: ExportStatus.PROCESSING,
        attemptCount,
      },
      [ExportStatus.PENDING, ExportStatus.FAILED],
    );

    if (processingClaim) {
      return true;
    }

    this.logger.warn(
      this.logContext(exportId, attemptCount),
      'queue.job.idempotent.skip_claim_lost',
    );
    return false;
  }

  private generatePdfFile(exportId: string): string {
    const outDir = join(process.cwd(), 'tmp', 'exports');
    mkdirSync(outDir, { recursive: true });

    const pdfBuffer = Buffer.from('PDF placeholder for export: ' + exportId, 'utf8');
    const filePath = join(outDir, `${exportId}.pdf`);
    writeFileSync(filePath, pdfBuffer);
    return filePath;
  }

  private async markCompleted(
    exportId: string,
    fileName: string,
    attemptCount: number,
    filePath: string,
  ): Promise<boolean> {
    const completed = await this.repository.updateStatus(
      exportId,
      ExportStatus.COMPLETED,
      {
        status: ExportStatus.COMPLETED,
        downloadPath: filePath,
        fileName,
        attemptCount,
        completedAt: new Date(),
      },
      [ExportStatus.PROCESSING],
    );

    if (completed) {
      return true;
    }

    const latest = await this.repository.findById(exportId);
    if (latest?.status === ExportStatus.COMPLETED) {
      const contractPreserved = latest.fileName === fileName && latest.downloadPath === filePath;
      if (contractPreserved) {
        this.logger.log(
          this.logContext(exportId, attemptCount, {
            filePath,
            fileName,
            state: latest.status,
          }),
          'queue.job.idempotent.contract_preserved',
        );
        return false;
      }

      this.logger.error(
        this.logContext(exportId, attemptCount, {
          expectedFilePath: filePath,
          expectedFileName: fileName,
          actualFilePath: latest.downloadPath,
          actualFileName: latest.fileName,
          state: latest.status,
        }),
        'queue.job.idempotent.contract_mismatch',
      );

      throw new UnrecoverableError('Completed export output contract mismatch');
    }

    this.logger.warn(
      this.logContext(exportId, attemptCount, { filePath }),
      'queue.job.idempotent.skip_stale_completion',
    );
    return false;
  }

  private async handleProcessingError(
    error: unknown,
    job: Job<{ exportId: string }>,
    exportId: string,
    attemptCount: number,
  ): Promise<void> {
    const terminalFailure = this.isTerminalFailure(error);
    const maxAttempts = this.resolveMaxAttempts(job, attemptCount);
    const retriesExhausted = !terminalFailure && attemptCount >= maxAttempts;

    const failed = await this.markFailed(exportId, attemptCount, error);
    if (!failed) {
      return;
    }

    this.logger.error(
      this.logContext(exportId, attemptCount, {
        maxAttempts,
        failureType: terminalFailure ? 'terminal' : 'retryable',
        err: error instanceof Error ? error : undefined,
      }),
      terminalFailure ? 'queue.job.failed.terminal' : 'queue.job.failed.retryable',
    );

    if (!terminalFailure && retriesExhausted) {
      this.logger.error(
        this.logContext(exportId, attemptCount, { maxAttempts }),
        'queue.job.retry.exhausted',
      );
    }

    if (!terminalFailure && !retriesExhausted) {
      this.logger.warn(
        this.logContext(exportId, attemptCount, {
          maxAttempts,
          nextAttempt: attemptCount + 1,
        }),
        'queue.job.retry.scheduled',
      );
    }

    if (terminalFailure) {
      const message = error instanceof Error ? error.message : 'Terminal PDF export error';
      throw new UnrecoverableError(message);
    }

    throw error;
  }

  private async markFailed(
    exportId: string,
    attemptCount: number,
    error: unknown,
  ): Promise<boolean> {
    const failed = await this.repository.updateStatus(
      exportId,
      ExportStatus.FAILED,
      {
        status: ExportStatus.FAILED,
        errorMessage: error instanceof Error ? error.message : 'Unknown PDF export error',
        attemptCount,
      },
      [ExportStatus.PROCESSING],
    );

    if (failed) {
      return true;
    }

    this.logger.warn(
      this.logContext(exportId, attemptCount),
      'queue.job.idempotent.skip_stale_failure',
    );
    return false;
  }

  private logContext(
    exportId: string,
    attemptCount?: number,
    extra: Record<string, unknown> = {},
  ): Record<string, unknown> {
    return {
      module: 'queue',
      operation: this.operation,
      queue: this.queueName,
      exportId,
      ...(attemptCount !== undefined ? { attemptCount } : {}),
      ...extra,
    };
  }

  private reportHeartbeat(): void {
    this.workerHealthRegistry.heartbeat(this.queueName);
  }

  private isTerminalFailure(error: unknown): boolean {
    return (
      error instanceof UnrecoverableError ||
      error instanceof BadRequestException ||
      error instanceof ConflictException ||
      error instanceof NotFoundException ||
      error instanceof UnprocessableEntityException
    );
  }

  private resolveAttemptCount(job: Job<{ exportId: string }>): number {
    return Number.isFinite(job.attemptsMade) ? job.attemptsMade + 1 : 1;
  }

  private resolveMaxAttempts(job: Job<{ exportId: string }>, fallback: number): number {
    const attempts = job.opts?.attempts;
    if (typeof attempts === 'number' && Number.isFinite(attempts) && attempts > 0) {
      return attempts;
    }

    return fallback;
  }
}

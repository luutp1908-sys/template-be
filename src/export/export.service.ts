import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Logger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import { JobsOptions, Queue } from 'bullmq';
import { existsSync } from 'fs';
import { QueueHealthService } from '../queue/queue-health.service';
import { WorkspaceService } from '../workspace/workspace.service';
import { TemplateService } from '../template/template.service';
import { CreateExportDto } from './dto/create-export.dto';
import { ExportEntity } from './export.entity';
import { IExportRepository } from './interfaces/export.repository.interface';
import { EXPORT_REPOSITORY } from './export.tokens';

@Injectable()
export class ExportService {
  private readonly queueName = 'pdf-export';

  constructor(
    @Inject(EXPORT_REPOSITORY) private readonly repository: IExportRepository,
    @InjectQueue('pdf-export') private readonly exportQueue: Queue,
    private readonly workspaceService: WorkspaceService,
    private readonly templateService: TemplateService,
    private readonly configService: ConfigService,
    private readonly logger: Logger,
    @Optional() private readonly queueHealthService?: QueueHealthService,
  ) {}

  private getExportJobOptions(): JobsOptions {
    return {
      attempts: this.configService.get<number>('queue.exportJob.attempts', 3),
      backoff: {
        type: this.configService.get<'fixed' | 'exponential'>('queue.exportJob.backoffType', 'exponential'),
        delay: this.configService.get<number>('queue.exportJob.backoffDelayMs', 5000),
      },
      removeOnComplete: {
        count: this.configService.get<number>('queue.exportJob.removeOnCompleteCount', 1000),
      },
      removeOnFail: this.configService.get<boolean>('queue.exportJob.removeOnFail', false),
    };
  }

  private async assertQueueSubmissionReady(): Promise<void> {
    const mockMode = this.configService.get<boolean>('app.mockMode', false);
    if (mockMode) {
      return;
    }

    const queueEnabled = this.configService.get<boolean>('queue.enabled', true);
    if (!queueEnabled) {
      throw new ServiceUnavailableException('Export queue is disabled');
    }

    if (this.queueHealthService) {
      const readiness = await this.queueHealthService.checkReadiness();
      if (readiness.required && !readiness.healthy) {
        throw new ServiceUnavailableException(readiness.reason ?? 'Export queue is unavailable');
      }
      return;
    }

    try {
      await this.exportQueue.waitUntilReady();
    } catch {
      throw new ServiceUnavailableException('Export queue is unavailable');
    }
  }

  async createJob(payload: CreateExportDto, userId: string): Promise<ExportEntity> {
    if (payload.workspaceId) {
      const workspace = await this.workspaceService.findById(payload.workspaceId);
      if (!workspace) {
        throw new NotFoundException('Workspace not found');
      }
    }

    if (payload.templateId) {
      await this.templateService.findById(payload.templateId);
    }

    await this.assertQueueSubmissionReady();

    const created = await this.repository.create(payload, userId);

    this.logger.log(
      {
        module: 'queue',
        operation: 'export.enqueue',
        queue: this.queueName,
        exportId: created.id,
        userId,
      },
      'queue.enqueue.attempt',
    );

    try {
      const enqueueOptions: JobsOptions = {
        ...this.getExportJobOptions(),
        jobId: created.id,
      };

      const job = await this.exportQueue.add(
        this.queueName,
        { exportId: created.id },
        enqueueOptions,
      );
      this.logger.log(
        {
          module: 'queue',
          operation: 'export.enqueue',
          queue: this.queueName,
          exportId: created.id,
          userId,
          jobId: job.id,
        },
        'queue.enqueue.success',
      );
    } catch (error) {
      this.logger.error(
        {
          module: 'queue',
          operation: 'export.enqueue',
          queue: this.queueName,
          exportId: created.id,
          userId,
          err: error instanceof Error ? error : undefined,
        },
        'queue.enqueue.failed',
      );
      throw new ServiceUnavailableException('Export queue is unavailable');
    }

    return created;
  }

  async findJobStatus(id: string, userId: string): Promise<ExportEntity | null> {
    return this.repository.findById(id, userId);
  }

  async findJobStatusOrThrow(id: string, userId: string): Promise<ExportEntity> {
    const exportJob = await this.findJobStatus(id, userId);
    if (!exportJob) {
      throw new NotFoundException('Export job not found');
    }

    return exportJob;
  }

  async resolveDownloadableJobOrThrow(id: string, userId: string): Promise<ExportEntity> {
    const exportJob = await this.findJobStatusOrThrow(id, userId);

    if (exportJob.status !== 'completed' || !exportJob.downloadPath) {
      throw new ConflictException('Export job is not completed yet');
    }

    if (!existsSync(exportJob.downloadPath)) {
      throw new ConflictException('Export file has not been generated yet');
    }

    return exportJob;
  }
}

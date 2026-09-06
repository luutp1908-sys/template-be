import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { WorkspaceService } from '../workspace/workspace.service';
import { TemplateService } from '../template/template.service';
import { CreateExportDto } from './dto/create-export.dto';
import { ExportEntity } from './export.entity';
import { IExportRepository } from './interfaces/export.repository.interface';
import { EXPORT_REPOSITORY } from './export.tokens';

@Injectable()
export class ExportService {
  constructor(
    @Inject(EXPORT_REPOSITORY) private readonly repository: IExportRepository,
    @InjectQueue('pdf-export') private readonly exportQueue: Queue,
    private readonly workspaceService: WorkspaceService,
    private readonly templateService: TemplateService,
  ) {}

  async createJob(payload: CreateExportDto, userId: string): Promise<ExportEntity> {
    if (payload.workspaceId) {
      const workspace = await this.workspaceService.findById(payload.workspaceId);
      if (!workspace) {
        throw new BadRequestException(`Invalid workspaceId: ${payload.workspaceId}`);
      }
    }

    if (payload.templateId) {
      const template = await this.templateService.findById(payload.templateId).catch(() => null);
      if (!template) {
        throw new BadRequestException(`Invalid templateId: ${payload.templateId}`);
      }
    }

    const created = await this.repository.create(payload, userId);
    await this.exportQueue.add('pdf-export', { exportId: created.id });
    return created;
  }

  async findJobStatus(id: string, userId: string): Promise<ExportEntity | null> {
    return this.repository.findById(id, userId);
  }
}

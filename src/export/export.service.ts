import { Inject, Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CreateExportDto } from './dto/create-export.dto';
import { ExportEntity } from './export.entity';
import { IExportRepository } from './interfaces/export.repository.interface';

@Injectable()
export class ExportService {
  constructor(
    @Inject('EXPORT_REPOSITORY') private readonly repository: IExportRepository,
    @InjectQueue('pdf-export') private readonly exportQueue: Queue,
  ) {}

  async createJob(payload: CreateExportDto, userId: string): Promise<ExportEntity> {
    const created = await this.repository.create(payload, userId);
    await this.exportQueue.add('pdf-export', { exportId: created.id });
    return created;
  }

  async findJobStatus(id: string, userId: string): Promise<ExportEntity | null> {
    return this.repository.findById(id, userId);
  }
}

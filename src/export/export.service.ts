import { Inject, Injectable } from '@nestjs/common';
import { CreateExportDto } from './dto/create-export.dto';
import { ExportEntity } from './export.entity';
import { IExportRepository } from './interfaces/export.repository.interface';

@Injectable()
export class ExportService {
  constructor(@Inject('EXPORT_REPOSITORY') private readonly repository: IExportRepository) {}

  async createJob(payload: CreateExportDto, userId: string): Promise<ExportEntity> {
    return this.repository.create(payload, userId);
  }

  async findJobStatus(id: string, userId: string): Promise<ExportEntity | null> {
    return this.repository.findById(id, userId);
  }
}

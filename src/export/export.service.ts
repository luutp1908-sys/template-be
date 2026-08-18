import { Injectable } from '@nestjs/common';
import { CreateExportDto } from './dto/create-export.dto';
import { ExportEntity } from './export.entity';
import { ExportRepository } from './export.repository';

@Injectable()
export class ExportService {
  constructor(private readonly repository: ExportRepository) {}

  async createJob(payload: CreateExportDto, userId: string): Promise<ExportEntity> {
    return this.repository.create(payload, userId);
  }

  async findJobStatus(id: string, userId: string): Promise<ExportEntity | null> {
    return this.repository.findById(id, userId);
  }
}

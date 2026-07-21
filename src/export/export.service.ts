import { Injectable } from '@nestjs/common';
import { CreateExportDto } from './dto/create-export.dto';
import { ExportEntity } from './export.entity';
import { ExportRepository } from './export.repository';

@Injectable()
export class ExportService {
  constructor(private readonly repository: ExportRepository) {}

  async create(payload: CreateExportDto): Promise<ExportEntity> {
    return this.repository.create(payload);
  }

  async findById(id: string): Promise<ExportEntity | null> {
    return this.repository.findById(id);
  }
}

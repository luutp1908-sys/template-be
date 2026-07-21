import { Injectable } from '@nestjs/common';
import { InMemoryStore } from '../common/testing/in-memory-store';
import { CreateExportDto } from './dto/create-export.dto';
import { ExportEntity } from './export.entity';
import { IExportRepository } from './interfaces/export.repository.interface';
import { ExportMapper } from './export.mapper';

@Injectable()
export class ExportRepository implements IExportRepository {
  private readonly store = new InMemoryStore<ExportEntity>();

  async create(payload: CreateExportDto): Promise<ExportEntity> {
    return this.store.create((base) =>
      ExportMapper.toEntity({
        ...base,
        ...payload,
      }),
    );
  }

  async findById(id: string): Promise<ExportEntity | null> {
    return this.store.findById(id);
  }
}

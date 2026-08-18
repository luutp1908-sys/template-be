import { Injectable } from '@nestjs/common';
import { InMemoryStore } from '../common/testing/in-memory-store';
import { CreateExportDto } from './dto/create-export.dto';
import { ExportEntity, ExportStatus } from './export.entity';
import { ExportMapper } from './export.mapper';

@Injectable()
export class ExportRepository {
  private readonly store = new InMemoryStore<ExportEntity>();

  private toPdfFileName(templateName?: string): string {
    const base = (templateName ?? 'template')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 120);

    return `${base || 'template'}.pdf`;
  }

  async create(payload: CreateExportDto, userId: string): Promise<ExportEntity> {
    return this.store.create((base) =>
      ExportMapper.toEntity({
        ...base,
        requestedByUserId: userId,
        status: ExportStatus.PENDING,
        fileName: this.toPdfFileName(payload.templateName),
        ...payload,
      }),
    );
  }

  async findById(id: string, userId: string): Promise<ExportEntity | null> {
    const exportJob = this.store.findById(id);
    if (!exportJob || exportJob.requestedByUserId !== userId) {
      return null;
    }

    return exportJob;
  }
}

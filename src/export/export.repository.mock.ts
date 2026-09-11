import { Injectable } from '@nestjs/common';
import { InMemoryStore } from '../common/testing/in-memory-store';
import { ExportEntity, ExportStatus } from './export.entity';
import { ExportMapper } from './export.mapper';
import { CreateExportRecord } from './interfaces/export.repository.interface';

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

  async create(payload: CreateExportRecord, userId: string): Promise<ExportEntity> {
    return this.store.create((base) =>
      ExportMapper.toEntity({
        ...base,
        requestedByUserId: userId,
        status: ExportStatus.PENDING,
        fileName: this.toPdfFileName(payload.templateName),
        attemptCount: 0,
        ...payload,
      }),
    );
  }

  async findById(id: string, userId?: string): Promise<ExportEntity | null> {
    const exportJob = this.store.findById(id);
    if (!exportJob) {
      return null;
    }

    if (userId && exportJob.requestedByUserId !== userId) {
      return null;
    }

    return exportJob;
  }

  async updateStatus(id: string, status: string, data: Partial<ExportEntity> = {}): Promise<ExportEntity | null> {
    const current = this.store.findById(id);
    if (!current) {
      return null;
    }

    const updated = ExportMapper.toEntity({
      ...current,
      ...data,
      status: status as ExportStatus,
      updatedAt: new Date(),
    });

    this.store['data'].set(id, updated);
    return updated;
  }
}

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateExportDto } from './dto/create-export.dto';
import { ExportEntity, ExportStatus } from './export.entity';

@Injectable()
export class ExportRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toPdfFileName(templateName?: string): string {
    const base = (templateName ?? 'template')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 120);

    return `${base || 'template'}.pdf`;
  }

  async create(payload: CreateExportDto, userId: string): Promise<ExportEntity> {
    const exportJob = await this.prisma.export.create({
      data: {
        requestedByUserId: userId,
        workspaceId: payload.workspaceId ?? null,
        draftId: payload.draftId ?? null,
        templateId: payload.templateId ?? null,
        format: payload.format,
        status: ExportStatus.PENDING,
        fileName: this.toPdfFileName(payload.templateName),
        content: payload.content as unknown as Prisma.InputJsonValue,
      },
    });

    return exportJob as unknown as ExportEntity;
  }

  async findById(id: string, userId: string): Promise<ExportEntity | null> {
    const exportJob = await this.prisma.export.findFirst({
      where: {
        id,
        requestedByUserId: userId,
      },
    });

    return (exportJob as ExportEntity | null) ?? null;
  }
}

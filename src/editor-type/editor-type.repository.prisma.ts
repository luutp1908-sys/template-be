import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { mapPrismaWriteError } from '../database/prisma-write-error.mapper';
import { EditorTypeEntity } from './editor-type.entity';
import { CreateEditorTypeRecord, IEditorTypeRepository } from './interfaces/editor-type.repository.interface';
import { EditorTypeMapper } from './editor-type.mapper';

@Injectable()
export class EditorTypeRepository implements IEditorTypeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(payload: CreateEditorTypeRecord): Promise<EditorTypeEntity> {
    const name = payload.name ?? 'Unknown';
    const key = name.toLowerCase().replace(/\s+/g, '-').slice(0, 60);
    try {
      const created = await this.prisma.editorType.create({ data: { key, name } });
      return EditorTypeMapper.toEntity(created as any);
    } catch (error) {
      mapPrismaWriteError(error, {
        entityName: 'Editor type',
        duplicateMessage: 'Editor type key already exists',
        fallbackMessage: 'Editor type creation failed',
      });
    }
  }

  async findById(id: string): Promise<EditorTypeEntity | null> {
    const row = await this.prisma.editorType.findUnique({ where: { id } });
    return row ? EditorTypeMapper.toEntity(row as any) : null;
  }

  async ensureByKey(key: string, name: string, tx?: any): Promise<string> {
    const client = tx ?? this.prisma;

    const dbEditorType = await client.editorType.upsert({
      where: { key },
      create: { key, name },
      update: { name, deletedAt: null },
      select: { id: true },
    });

    return dbEditorType.id;
  }
}

export default EditorTypeRepository;

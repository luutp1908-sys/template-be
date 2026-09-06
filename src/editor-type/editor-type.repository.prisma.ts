import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateEditorTypeDto } from './dto/create-editor-type.dto';
import { EditorTypeEntity } from './editor-type.entity';
import { IEditorTypeRepository } from './interfaces/editor-type.repository.interface';
import { EditorTypeMapper } from './editor-type.mapper';
import { getEditorTypeById } from '../common/constants/editor-types.constant';

@Injectable()
export class EditorTypeRepository implements IEditorTypeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(payload: CreateEditorTypeDto): Promise<EditorTypeEntity> {
    const name = payload.name ?? 'Unknown';
    const key = name.toLowerCase().replace(/\s+/g, '-').slice(0, 60);
    const created = await this.prisma.editorType.create({ data: { key, name } });
    return EditorTypeMapper.toEntity(created as any);
  }

  async findById(id: string): Promise<EditorTypeEntity | null> {
    const row = await this.prisma.editorType.findUnique({ where: { id } });
    return row ? EditorTypeMapper.toEntity(row as any) : null;
  }

  async ensureByNumericId(editorTypeId: number, tx?: any): Promise<string> {
    const editorType = getEditorTypeById(editorTypeId);
    if (!editorType) {
      throw new BadRequestException(`Unsupported editorTypeId: ${editorTypeId}`);
    }

    const name = `${editorType.type.charAt(0).toUpperCase()}${editorType.type.slice(1)}`;
    const client = tx ?? this.prisma;

    const dbEditorType = await client.editorType.upsert({
      where: { key: editorType.type },
      create: { key: editorType.type, name },
      update: { name, deletedAt: null },
      select: { id: true },
    });

    return dbEditorType.id;
  }
}

export default EditorTypeRepository;

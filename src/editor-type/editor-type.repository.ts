import { Injectable } from '@nestjs/common';
import { InMemoryStore } from '../common/testing/in-memory-store';
import { CreateEditorTypeDto } from './dto/create-editor-type.dto';
import { EditorTypeEntity } from './editor-type.entity';
import { IEditorTypeRepository } from './interfaces/editor-type.repository.interface';
import { EditorTypeMapper } from './editor-type.mapper';

@Injectable()
export class EditorTypeRepository implements IEditorTypeRepository {
  private readonly store = new InMemoryStore<EditorTypeEntity>();

  async create(payload: CreateEditorTypeDto): Promise<EditorTypeEntity> {
    return this.store.create((base) =>
      EditorTypeMapper.toEntity({
        ...base,
        ...payload,
      }),
    );
  }

  async findById(id: string): Promise<EditorTypeEntity | null> {
    return this.store.findById(id);
  }
}

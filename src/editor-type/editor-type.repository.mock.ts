import { Injectable } from '@nestjs/common';
import { InMemoryStore } from '../common/testing/in-memory-store';
import { EditorTypeEntity } from './editor-type.entity';
import { CreateEditorTypeRecord, IEditorTypeRepository } from './interfaces/editor-type.repository.interface';
import { EditorTypeMapper } from './editor-type.mapper';

@Injectable()
export class EditorTypeRepository implements IEditorTypeRepository {
  private readonly store = new InMemoryStore<EditorTypeEntity>();

  async create(payload: CreateEditorTypeRecord): Promise<EditorTypeEntity> {
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

  async ensureByKey(key: string): Promise<string> {
    // In mock mode, return deterministic key-based id for tests.
    return `mock-editor-type-${key}`;
  }
}

export default EditorTypeRepository;

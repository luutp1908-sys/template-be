
import { Inject, Injectable } from '@nestjs/common';
import { CreateEditorTypeDto } from './dto/create-editor-type.dto';
import { EditorTypeEntity } from './editor-type.entity';
import { IEditorTypeRepository } from './interfaces/editor-type.repository.interface';
import { EditorTypeRepository } from './editor-type.repository';

@Injectable()
export class EditorTypeService {
  constructor(
    @Inject(EditorTypeRepository)
    private readonly repository: IEditorTypeRepository,
  ) {}

  async create(payload: CreateEditorTypeDto): Promise<EditorTypeEntity> {
    return this.repository.create(payload);
  }

  async findById(id: string): Promise<EditorTypeEntity | null> {
    return this.repository.findById(id);
  }

  /**
   * Ensure the editorType row exists for a numeric editor type id and return its DB id.
   * Accepts an optional transaction client `tx` to run atomically with other operations.
   */
  async ensureEditorTypeByNumericId(editorTypeId: number, tx?: any): Promise<string> {
    return this.repository.ensureByNumericId(editorTypeId, tx);
  }
}

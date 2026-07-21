import { Injectable } from '@nestjs/common';
import { CreateEditorTypeDto } from './dto/create-editor-type.dto';
import { EditorTypeEntity } from './editor-type.entity';
import { EditorTypeRepository } from './editor-type.repository';

@Injectable()
export class EditorTypeService {
  constructor(private readonly repository: EditorTypeRepository) {}

  async create(payload: CreateEditorTypeDto): Promise<EditorTypeEntity> {
    return this.repository.create(payload);
  }

  async findById(id: string): Promise<EditorTypeEntity | null> {
    return this.repository.findById(id);
  }
}

import { CreateEditorTypeDto } from '../dto/create-editor-type.dto';
import { EditorTypeEntity } from '../editor-type.entity';

export interface IEditorTypeRepository {
  create(_payload: CreateEditorTypeDto): Promise<EditorTypeEntity>;
  findById(_id: string): Promise<EditorTypeEntity | null>;
}

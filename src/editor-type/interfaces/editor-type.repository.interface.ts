import { EditorTypeEntity } from '../editor-type.entity';

export interface CreateEditorTypeRecord {
  name?: string;
}

export interface IEditorTypeRepository {
  create(_payload: CreateEditorTypeRecord): Promise<EditorTypeEntity>;
  findById(_id: string): Promise<EditorTypeEntity | null>;
  ensureByKey(_key: string, _name: string, _tx?: any): Promise<string>;
}

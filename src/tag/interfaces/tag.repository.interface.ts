import { TagEntity } from '../tag.entity';

export interface CreateTagRecord {
  name?: string;
}

export interface ITagRepository {
  create(_payload: CreateTagRecord): Promise<TagEntity>;
  findById(_id: string): Promise<TagEntity | null>;
}

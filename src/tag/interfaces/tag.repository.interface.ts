import { CreateTagDto } from '../dto/create-tag.dto';
import { TagEntity } from '../tag.entity';

export interface ITagRepository {
  create(_payload: CreateTagDto): Promise<TagEntity>;
  findById(_id: string): Promise<TagEntity | null>;
}

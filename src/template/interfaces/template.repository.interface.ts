import { CreateTemplateDto } from '../dto/create-template.dto';
import { TemplateListQueryDto } from '../dto/template-list-query.dto';
import { UpdateTemplateDto } from '../dto/update-template.dto';
import { TemplateEntity, TemplateListEntity } from '../template.entity';

export interface ITemplateRepository {
  create(_payload: CreateTemplateDto, _authorId: string): Promise<TemplateEntity>;
  findById(_id: string): Promise<TemplateEntity | null>;
  findMany(_query: TemplateListQueryDto): Promise<TemplateListEntity>;
  update(_id: string, _payload: UpdateTemplateDto): Promise<TemplateEntity | null>;
  remove(_id: string): Promise<boolean>;
  publish(_id: string): Promise<TemplateEntity | null>;
  archive(_id: string): Promise<TemplateEntity | null>;
}

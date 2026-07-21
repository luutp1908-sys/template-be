import { CreateTemplateDto } from '../dto/create-template.dto';
import { TemplateListQueryDto } from '../dto/template-list-query.dto';
import { UpdateTemplateDto } from '../dto/update-template.dto';
import { TemplateEntity, TemplateListEntity } from '../template.entity';

export interface ITemplateRepository {
  create(_payload: CreateTemplateDto, _authorId: string | null): Promise<TemplateEntity>;
  findById(_id: string, _includeDeleted?: boolean): Promise<TemplateEntity | null>;
  findMany(_query: TemplateListQueryDto): Promise<TemplateListEntity>;
  update(_id: string, _payload: UpdateTemplateDto): Promise<TemplateEntity | null>;
  softDelete(_id: string): Promise<boolean>;
  publish(_id: string): Promise<TemplateEntity | null>;
  archive(_id: string): Promise<TemplateEntity | null>;
  restore(_id: string): Promise<TemplateEntity | null>;
}

import { CreateTemplateDto } from '../dto/create-template.dto';
import { TemplateEntity } from '../template.entity';

export interface ITemplateRepository {
  create(_payload: CreateTemplateDto): Promise<TemplateEntity>;
  findById(_id: string): Promise<TemplateEntity | null>;
}

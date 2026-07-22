import { PartialType } from '@nestjs/swagger';
import { CreateTemplateContentDto } from './create-template-content.dto';

export class UpdateTemplateContentDto extends PartialType(CreateTemplateContentDto) {}
import { IsOptional, IsString } from 'class-validator';

export class CreateTemplateDto {
  @IsString()
  @IsOptional()
  name?: string;
}

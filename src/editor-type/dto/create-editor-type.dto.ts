import { IsOptional, IsString } from 'class-validator';

export class CreateEditorTypeDto {
  @IsString()
  @IsOptional()
  name?: string;
}

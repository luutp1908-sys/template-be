import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateEditorTypeDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  @IsOptional()
  name?: string;
}

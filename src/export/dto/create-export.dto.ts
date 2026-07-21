import { IsOptional, IsString } from 'class-validator';

export class CreateExportDto {
  @IsString()
  @IsOptional()
  name?: string;
}

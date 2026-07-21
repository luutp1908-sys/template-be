import { IsOptional, IsString } from 'class-validator';

export class CreateSearchDto {
  @IsString()
  @IsOptional()
  name?: string;
}

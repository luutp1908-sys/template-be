import { IsOptional, IsString } from 'class-validator';

export class CreateTagDto {
  @IsString()
  @IsOptional()
  name?: string;
}

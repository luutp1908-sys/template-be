import { IsOptional, IsString } from 'class-validator';

export class CreateAiDto {
  @IsString()
  @IsOptional()
  name?: string;
}

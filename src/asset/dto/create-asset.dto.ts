import { IsOptional, IsString } from 'class-validator';

export class CreateAssetDto {
  @IsString()
  @IsOptional()
  name?: string;
}

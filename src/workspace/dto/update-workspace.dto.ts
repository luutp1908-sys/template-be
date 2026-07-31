import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export enum WorkspaceTypeDto {
  PERSONAL = 'PERSONAL',
  TEAM = 'TEAM',
}

export class UpdateWorkspaceDto {
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(160)
  name?: string;

  @IsEnum(WorkspaceTypeDto)
  @IsOptional()
  type?: WorkspaceTypeDto;

  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(1000)
  description?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2048)
  avatarUrl?: string;

  @IsBoolean()
  @IsOptional()
  isArchived?: boolean;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 8, example: 'S3cureP@ssword' })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ required: false, maxLength: 120, example: 'John Doe' })
  @IsString()
  @IsOptional()
  @MaxLength(120)
  displayName?: string;
}

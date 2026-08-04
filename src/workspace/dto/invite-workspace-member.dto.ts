import { IsEmail, IsString, MaxLength } from 'class-validator';

export class InviteWorkspaceMemberDto {
  @IsString()
  @IsEmail()
  @MaxLength(320)
  email!: string;
}

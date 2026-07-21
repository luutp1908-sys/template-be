import { ApiProperty } from '@nestjs/swagger';

class AuthUserProfile {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ nullable: true })
  displayName!: string | null;

  @ApiProperty({ type: [String] })
  roles!: string[];

  @ApiProperty({ type: [String] })
  permissions!: string[];
}

export class AuthEntity {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  refreshToken!: string;

  @ApiProperty({ example: 'Bearer' })
  tokenType!: string;

  @ApiProperty({ example: '15m' })
  accessTokenExpiresIn!: string;

  @ApiProperty({ type: () => AuthUserProfile })
  user!: AuthUserProfile;
}

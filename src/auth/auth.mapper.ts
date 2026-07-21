import { AuthEntity } from './auth.entity';

export class AuthMapper {
  static toEntity(partial: Partial<AuthEntity>): AuthEntity {
    return {
      accessToken: partial.accessToken ?? '',
      refreshToken: partial.refreshToken ?? '',
      tokenType: partial.tokenType ?? 'Bearer',
      accessTokenExpiresIn: partial.accessTokenExpiresIn ?? '15m',
      user: partial.user ?? {
        id: '',
        email: '',
        displayName: null,
        roles: [],
        permissions: [],
      },
    };
  }
}

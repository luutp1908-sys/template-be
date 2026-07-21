import { AuthEntity } from './auth.entity';

export class AuthMapper {
  static toEntity(partial: Partial<AuthEntity>): AuthEntity {
    return {
      userId: partial.userId ?? '',
      accessToken: partial.accessToken ?? '',
      refreshToken: partial.refreshToken ?? '',
    };
  }
}

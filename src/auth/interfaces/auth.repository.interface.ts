import { RegisterDto } from '../dto/register.dto';
import { AuthUser, AuthUserWithSecrets } from '../types/auth-user.type';

export interface IAuthRepository {
  findUserByEmail(email: string): Promise<AuthUserWithSecrets | null>;
  findUserById(id: string): Promise<AuthUserWithSecrets | null>;
  findAuthUserById(id: string): Promise<AuthUser | null>;
  createUser(payload: RegisterDto, passwordHash: string): Promise<AuthUserWithSecrets>;
  updateRefreshTokenHash(userId: string, refreshTokenHash: string | null): Promise<void>;
  updateLastLogin(userId: string): Promise<void>;
}

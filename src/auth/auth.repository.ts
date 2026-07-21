import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthEntity } from './auth.entity';
import { IAuthRepository } from './interfaces/auth.repository.interface';
import { AuthMapper } from './auth.mapper';

@Injectable()
export class AuthRepository implements IAuthRepository {
  private readonly users = new Map<string, { id: string; email: string; password: string }>();

  async login(payload: LoginDto): Promise<AuthEntity> {
    const user = this.users.get(payload.email);
    const userId = user?.id ?? randomUUID();
    return AuthMapper.toEntity({
      userId,
      accessToken: `mock_access_token_${userId}`,
      refreshToken: `mock_refresh_token_${userId}`,
    });
  }

  async register(payload: RegisterDto): Promise<AuthEntity> {
    const existing = this.users.get(payload.email);
    const userId = existing?.id ?? randomUUID();

    this.users.set(payload.email, {
      id: userId,
      email: payload.email,
      password: payload.password,
    });

    return AuthMapper.toEntity({
      userId,
      accessToken: `mock_access_token_${userId}`,
      refreshToken: `mock_refresh_token_${userId}`,
    });
  }
}

import { ConflictException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { RegisterDto } from './dto/register.dto';
import { IAuthRepository } from './interfaces/auth.repository.interface';
import { AuthUser, AuthUserWithSecrets } from './types/auth-user.type';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'

interface MockUserRecord extends AuthUserWithSecrets {
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class AuthRepository implements IAuthRepository {
  private readonly mockUsersByEmail = new Map<string, MockUserRecord>();
  private readonly mockUsersById = new Map<string, MockUserRecord>();
  private readonly mockFilePath: string;

  constructor(private readonly configService: ConfigService) {
    this.mockFilePath = join(process.cwd(), 'src', 'common', 'testing', 'mock-users.json')
    try {
      const dir = dirname(this.mockFilePath)
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
      if (!existsSync(this.mockFilePath)) writeFileSync(this.mockFilePath, JSON.stringify([]))
      const raw = readFileSync(this.mockFilePath, 'utf8') || '[]'
      const arr = JSON.parse(raw) as any[]
      arr.forEach((it) => {
        const record: MockUserRecord = {
          ...it,
          createdAt: it.createdAt ? new Date(it.createdAt) : new Date(),
          updatedAt: it.updatedAt ? new Date(it.updatedAt) : new Date(),
          deletedAt: it.deletedAt ? new Date(it.deletedAt) : null,
        }
        this.mockUsersByEmail.set(record.email, record)
        this.mockUsersById.set(record.id, record)
      })
    } catch (err) {
      this.mockUsersByEmail.clear()
      this.mockUsersById.clear()
    }
  }

  private persistMockStore() {
    try {
      const arr = [...this.mockUsersById.values()].map((e) => ({
        ...e,
        createdAt: e.createdAt?.toISOString?.() ?? e.createdAt,
        updatedAt: e.updatedAt?.toISOString?.() ?? e.updatedAt,
        deletedAt: e.deletedAt?.toISOString?.() ?? e.deletedAt,
      }))
      writeFileSync(this.mockFilePath, JSON.stringify(arr, null, 2), 'utf8')
      // eslint-disable-next-line no-console
      console.log('[mock-users] persisted', this.mockFilePath, arr.length, 'items')
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[mock-users] failed to persist', err)
    }
  }

  async findUserByEmail(email: string): Promise<AuthUserWithSecrets | null> {
    const mock = this.mockUsersByEmail.get(email.toLowerCase());
    if (!mock || mock.deletedAt) {
      return null;
    }
    return this.toAuthUserWithSecrets(mock);
  }

  async findUserById(id: string): Promise<AuthUserWithSecrets | null> {
    const mock = this.mockUsersById.get(id);
    if (!mock || mock.deletedAt) {
      return null;
    }
    return this.toAuthUserWithSecrets(mock);
  }

  async findAuthUserById(id: string): Promise<AuthUser | null> {
    const mock = this.mockUsersById.get(id);
    if (!mock || mock.deletedAt) {
      return null;
    }
    return {
      id: mock.id,
      email: mock.email,
      displayName: mock.displayName,
      roles: ['member'],
      permissions: ['template:read'],
    };
  }

  async createUser(payload: RegisterDto, passwordHash: string): Promise<AuthUserWithSecrets> {
    const normalizedEmail = payload.email.toLowerCase();
    if (this.mockUsersByEmail.has(normalizedEmail)) {
      throw new ConflictException('Email already registered');
    }

    const now = new Date();
    const mockUser: MockUserRecord = {
      id: randomUUID(),
      email: normalizedEmail,
      displayName: payload.displayName ?? null,
      isActive: true,
      passwordHash,
      refreshTokenHash: null,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    this.mockUsersByEmail.set(normalizedEmail, mockUser);
    this.mockUsersById.set(mockUser.id, mockUser);
    this.persistMockStore()
    return this.toAuthUserWithSecrets(mockUser);
  }

  async updateRefreshTokenHash(userId: string, refreshTokenHash: string | null): Promise<void> {
    const mock = this.mockUsersById.get(userId);
    if (!mock) return;
    mock.refreshTokenHash = refreshTokenHash;
    mock.updatedAt = new Date();
    this.persistMockStore()
  }

  async updateLastLogin(userId: string): Promise<void> {
    const mock = this.mockUsersById.get(userId);
    if (!mock) return;
    mock.updatedAt = new Date();
    this.persistMockStore()
  }

  private toAuthUserWithSecrets(user: MockUserRecord): AuthUserWithSecrets {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      isActive: user.isActive,
      passwordHash: user.passwordHash,
      refreshTokenHash: user.refreshTokenHash,
    };
  }
}

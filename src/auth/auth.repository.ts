import { ConflictException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { IAuthRepository } from './interfaces/auth.repository.interface';
import { AuthUser, AuthUserWithSecrets } from './types/auth-user.type';

interface MockUserRecord extends AuthUserWithSecrets {
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class AuthRepository implements IAuthRepository {
  private readonly isMockMode: boolean;
  private readonly mockUsersByEmail = new Map<string, MockUserRecord>();
  private readonly mockUsersById = new Map<string, MockUserRecord>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.isMockMode = this.configService.get<boolean>('app.mockMode', false);
  }

  async findUserByEmail(email: string): Promise<AuthUserWithSecrets | null> {
    if (this.isMockMode) {
      const mock = this.mockUsersByEmail.get(email.toLowerCase());
      if (!mock || mock.deletedAt) {
        return null;
      }
      return this.toAuthUserWithSecrets(mock);
    }

    const user = await this.prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        isActive: true,
        passwordHash: true,
        refreshTokenHash: true,
      },
    });

    if (!user) {
      return null;
    }

    return user;
  }

  async findUserById(id: string): Promise<AuthUserWithSecrets | null> {
    if (this.isMockMode) {
      const mock = this.mockUsersById.get(id);
      if (!mock || mock.deletedAt) {
        return null;
      }
      return this.toAuthUserWithSecrets(mock);
    }

    const user = await this.prisma.user.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        isActive: true,
        passwordHash: true,
        refreshTokenHash: true,
      },
    });

    if (!user) {
      return null;
    }

    return user;
  }

  async findAuthUserById(id: string): Promise<AuthUser | null> {
    if (this.isMockMode) {
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

    const user = await this.prisma.user.findFirst({
      where: {
        id,
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        userRoles: {
          where: {
            role: {
              deletedAt: null,
            },
          },
          select: {
            role: {
              select: {
                key: true,
                rolePermissions: {
                  where: {
                    permission: {
                      deletedAt: null,
                    },
                  },
                  select: {
                    permission: {
                      select: {
                        key: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    const roles = [...new Set(user.userRoles.map((ur) => ur.role.key))];
    const permissions = [
      ...new Set(
        user.userRoles.flatMap((ur) => ur.role.rolePermissions.map((rp) => rp.permission.key)),
      ),
    ];

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      roles,
      permissions,
    };
  }

  async createUser(payload: RegisterDto, passwordHash: string): Promise<AuthUserWithSecrets> {
    if (this.isMockMode) {
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
      return this.toAuthUserWithSecrets(mockUser);
    }

    const user = await this.prisma.user.create({
      data: {
        email: payload.email.toLowerCase(),
        displayName: payload.displayName ?? null,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        isActive: true,
        passwordHash: true,
        refreshTokenHash: true,
      },
    });

    return user;
  }

  async updateRefreshTokenHash(userId: string, refreshTokenHash: string | null): Promise<void> {
    if (this.isMockMode) {
      const mock = this.mockUsersById.get(userId);
      if (!mock) {
        return;
      }
      mock.refreshTokenHash = refreshTokenHash;
      mock.updatedAt = new Date();
      return;
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash },
    });
  }

  async updateLastLogin(userId: string): Promise<void> {
    if (this.isMockMode) {
      const mock = this.mockUsersById.get(userId);
      if (!mock) {
        return;
      }
      mock.updatedAt = new Date();
      return;
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
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

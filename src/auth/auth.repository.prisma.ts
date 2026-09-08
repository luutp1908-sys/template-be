import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { Logger } from 'nestjs-pino';
import { ROLE_KEYS } from '../common/constants/roles.constant';
import { CacheService } from '../cache/cache.service';
import { mapPrismaWriteError } from '../database/prisma-write-error.mapper';
import { PrismaService } from '../database/prisma.service';
import { CreateAuthUserRecord, IAuthRepository } from './interfaces/auth.repository.interface';
import { AuthUser, AuthUserWithSecrets } from './types/auth-user.type';

@Injectable()
export class AuthRepository implements IAuthRepository {
  private readonly authUserCachePrefix = 'auth:user';

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly cacheService?: CacheService,
    private readonly logger?: Logger,
  ) {}

  async findUserByEmail(email: string): Promise<AuthUserWithSecrets | null> {
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
    const cacheKey = `${this.authUserCachePrefix}:${id}`;
    const cached = await this.cacheService?.getJson<AuthUser>(cacheKey);
    if (cached) {
      return cached;
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

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      roles,
      permissions,
    };

    const ttlMs = this.configService.get<number>('cache.ttlMs.authUser', 60000);
    await this.cacheService?.setJson(cacheKey, authUser, ttlMs);

    return authUser;
  }

  async createUser(payload: CreateAuthUserRecord, passwordHash: string): Promise<AuthUserWithSecrets> {
    const normalizedEmail = payload.email.toLowerCase();

    try {
      return await this.prisma.$transaction(async (tx) => {
        const createdUser = await tx.user.create({
          data: {
            email: normalizedEmail,
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

        const userRole = await tx.role.findFirst({
          where: {
            key: ROLE_KEYS.user,
            deletedAt: null,
          },
          select: {
            id: true,
          },
        });

        if (userRole) {
          await tx.userRole.create({
            data: {
              userId: createdUser.id,
              roleId: userRole.id,
            },
          });
        }

        return createdUser;
      });
    } catch (error) {
      this.logger?.error(
        `AUTH_CREATE_USER_FAILED email=${normalizedEmail} reason=${(error as Error).message}`,
      );
      mapPrismaWriteError(error, {
        entityName: 'User',
        duplicateMessage: 'Email already registered',
        fallbackMessage: 'Registration failed while writing to database',
      });
    }
  }

  async updateRefreshTokenHash(userId: string, refreshTokenHash: string | null): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: { refreshTokenHash },
      });
    } catch (error) {
      this.logger?.error(
        `AUTH_REFRESH_TOKEN_HASH_UPDATE_FAILED userId=${userId} reason=${(error as Error).message}`,
      );
      mapPrismaWriteError(error, {
        entityName: 'User',
        notFoundMessage: 'User not found',
        fallbackMessage: 'Refresh token update failed',
      });
    }
  }

  async updateLastLogin(userId: string): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: { lastLoginAt: new Date() },
      });
    } catch (error) {
      this.logger?.error(
        `AUTH_LAST_LOGIN_UPDATE_FAILED userId=${userId} reason=${(error as Error).message}`,
      );
      mapPrismaWriteError(error, {
        entityName: 'User',
        notFoundMessage: 'User not found',
        fallbackMessage: 'Last login update failed',
      });
    }
  }
}

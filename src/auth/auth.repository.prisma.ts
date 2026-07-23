import { ConflictException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { IAuthRepository } from './interfaces/auth.repository.interface';
import { AuthUser, AuthUserWithSecrets } from './types/auth-user.type';

@Injectable()
export class AuthRepository implements IAuthRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
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
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash },
    });
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }
}

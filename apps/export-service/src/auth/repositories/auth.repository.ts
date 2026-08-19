import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuthUser } from '../types/auth-user.type';

@Injectable()
export class ExportAuthRepository {
  constructor(private readonly prisma: PrismaService) {}

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
}

import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../database/prisma.service';
import { AuthUser } from '../../auth/types/auth-user.type';
import { WORKSPACE_MEMBERSHIP_KEY } from '../decorators/workspace-membership.decorator';

@Injectable()
export class WorkspaceMembershipGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(WORKSPACE_MEMBERSHIP_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest<{ user?: AuthUser; params?: Record<string, string> }>();
    const user = request.user;
    const workspaceId = request.params?.id ?? request.params?.workspaceId;

    if (!user?.id || !workspaceId) {
      throw new ForbiddenException('Workspace access denied');
    }

    const membership = await this.prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: user.id,
      },
      select: {
        role: true,
      },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this workspace');
    }

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    if (!requiredRoles.includes(membership.role)) {
      throw new ForbiddenException('You do not have permission to access this workspace');
    }

    return true;
  }
}

import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthUser } from '../../auth/types/auth-user.type';
import { WORKSPACE_MEMBERSHIP_KEY } from '../decorators/workspace-membership.decorator';
import { WorkspaceAccessPolicy } from '../policies/workspace-access.policy';

@Injectable()
export class WorkspaceMembershipGuard implements CanActivate {
  constructor(
    private readonly policy: WorkspaceAccessPolicy,
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

    await this.policy.assertAccess({
      userId: user?.id ?? '',
      workspaceId: workspaceId ?? '',
      requiredRoles: requiredRoles as Array<'OWNER' | 'ADMIN' | 'MEMBER'> | undefined,
    });

    return true;
  }
}

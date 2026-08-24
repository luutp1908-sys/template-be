import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export type WorkspaceAccessRole = 'OWNER' | 'ADMIN' | 'MEMBER';

export interface WorkspaceAccessRequest {
  userId: string;
  workspaceId: string;
  requiredRoles?: WorkspaceAccessRole[];
}

@Injectable()
export class WorkspaceAccessPolicy {
  constructor(private readonly prisma: PrismaService) {}

  async assertAccess(request: WorkspaceAccessRequest): Promise<WorkspaceAccessRole> {
    const { userId, workspaceId, requiredRoles } = request;

    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }

    if (!workspaceId) {
      throw new UnauthorizedException('Workspace identifier is required');
    }

    const membership = await this.prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId,
      },
      select: {
        role: true,
      },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this workspace');
    }

    if (!requiredRoles || requiredRoles.length === 0) {
      return membership.role as WorkspaceAccessRole;
    }

    if (!requiredRoles.includes(membership.role as WorkspaceAccessRole)) {
      throw new ForbiddenException('You do not have permission to access this workspace');
    }

    return membership.role as WorkspaceAccessRole;
  }
}

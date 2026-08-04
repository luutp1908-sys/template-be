import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthUser } from '../auth/types/auth-user.type';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { InviteWorkspaceMemberDto } from './dto/invite-workspace-member.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { WorkspaceEntity } from './workspace.entity';
import { WorkspaceRepository } from './workspace.repository';

@Injectable()
export class WorkspaceService {
  constructor(private readonly repository: WorkspaceRepository) {}

  async create(payload: CreateWorkspaceDto, createdByUserId?: string): Promise<WorkspaceEntity> {
    return this.repository.create(payload, createdByUserId);
  }

  async findMany(user: AuthUser): Promise<WorkspaceEntity[]> {
    return this.repository.findMany(user.id);
  }

  async findById(id: string): Promise<WorkspaceEntity | null> {
    return this.repository.findById(id);
  }

  async findMembers(workspaceId: string): Promise<unknown[]> {
    return this.repository.findMembers(workspaceId);
  }

  async update(id: string, payload: UpdateWorkspaceDto): Promise<WorkspaceEntity> {
    const updated = await this.repository.update(id, payload);
    if (!updated) {
      throw new NotFoundException(`Workspace ${id} not found`);
    }
    return updated;
  }

  async remove(id: string): Promise<WorkspaceEntity> {
    const removed = await this.repository.remove(id);
    if (!removed) {
      throw new NotFoundException(`Workspace ${id} not found`);
    }
    return removed;
  }

  async inviteMember(workspaceId: string, payload: InviteWorkspaceMemberDto, user: AuthUser): Promise<unknown> {
    return this.repository.inviteMember(workspaceId, payload, user.id);
  }

  async updateMemberRole(workspaceId: string, memberId: string, role: string, userId: string): Promise<unknown> {
    return this.repository.updateMemberRole(workspaceId, memberId, role, userId);
  }

  async removeMember(workspaceId: string, memberId: string, userId: string): Promise<boolean> {
    return this.repository.removeMember(workspaceId, memberId, userId);
  }
}

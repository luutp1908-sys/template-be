import { Injectable, NotFoundException, Inject, ForbiddenException } from '@nestjs/common';
import { CreateUserDraftDto } from './dto/create-user-draft.dto';
import { UpdateUserDraftDto } from './dto/update-user-draft.dto';
import { UserDraftListQueryDto } from './dto/user-draft-list-query.dto';
import { UserDraftEntity, UserDraftListEntity } from './user-draft.entity';
import { WorkspaceService } from '../workspace/workspace.service';

@Injectable()
export class UserDraftService {
  constructor(
    @Inject('USER_DRAFT_REPOSITORY') private readonly repository: any,
    private readonly workspaceService: WorkspaceService,
  ) {}

  private async resolveWorkspaceId(userId: string, requestedWorkspaceId?: string): Promise<string | null> {
    if (requestedWorkspaceId) {
      return this.workspaceService.findMemberWorkspaceId(userId, requestedWorkspaceId);
    }

    return this.workspaceService.findFirstWorkspaceIdByUserId(userId);
  }

  private async getAccessibleWorkspaceIds(userId: string): Promise<string[]> {
    return this.workspaceService.findWorkspaceIdsByUserId(userId);
  }

  private ensureRequestedWorkspaceAccessible(requestedWorkspaceId: string | undefined, workspaceIds: string[]): void {
    if (!requestedWorkspaceId) {
      return;
    }

    if (!workspaceIds.includes(requestedWorkspaceId)) {
      throw new ForbiddenException('Workspace access denied');
    }
  }

  async create(payload: CreateUserDraftDto, userId: string): Promise<UserDraftEntity> {
    const workspaceId = await this.resolveWorkspaceId(userId, payload.workspaceId);
    return this.repository.create(payload, userId, workspaceId);
  }

  async findById(id: string, userId: string): Promise<UserDraftEntity> {
    const workspaceIds = await this.getAccessibleWorkspaceIds(userId);
    const userDraft = await this.repository.findById(id, userId, workspaceIds);
    if (!userDraft) {
      throw new NotFoundException('User draft not found');
    }

    return userDraft;
  }

  async findMany(query: UserDraftListQueryDto, userId: string): Promise<UserDraftListEntity> {
    const workspaceIds = await this.getAccessibleWorkspaceIds(userId);
    this.ensureRequestedWorkspaceAccessible(query.workspaceId, workspaceIds);
    return this.repository.findMany(query, userId, workspaceIds);
  }

  async update(id: string, payload: UpdateUserDraftDto, userId: string): Promise<UserDraftEntity> {
    const workspaceIds = await this.getAccessibleWorkspaceIds(userId);
    const userDraft = await this.repository.update(id, payload, userId, workspaceIds);
    if (!userDraft) {
      throw new NotFoundException('User draft not found');
    }

    return userDraft;
  }

  async touch(id: string, userId: string): Promise<UserDraftEntity> {
    const workspaceIds = await this.getAccessibleWorkspaceIds(userId);
    const userDraft = await this.repository.touch(id, userId, workspaceIds);
    if (!userDraft) {
      throw new NotFoundException('User draft not found');
    }

    return userDraft;
  }

  async remove(id: string, userId: string): Promise<void> {
    const workspaceIds = await this.getAccessibleWorkspaceIds(userId);
    const removed = await this.repository.remove(id, userId, workspaceIds);
    if (!removed) {
      throw new NotFoundException('User draft not found');
    }
  }
}
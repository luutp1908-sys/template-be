import { ConflictException, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { InviteWorkspaceMemberDto } from './dto/invite-workspace-member.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { WorkspaceEntity } from './workspace.entity';
import { IWorkspaceRepository } from './interfaces/workspace.repository.interface';
import { WorkspaceMapper } from './workspace.mapper';

function buildWorkspaceSlug(name: string): string {
  const normalized = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  return normalized || `workspace-${randomUUID().slice(0, 8)}`;
}

@Injectable()
export class WorkspaceRepository implements IWorkspaceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(payload: CreateWorkspaceDto, createdByUserId?: string): Promise<WorkspaceEntity> {
    const name = payload.name?.trim() || 'Untitled Workspace';

    const workspace = await this.prisma.$transaction(async (tx) => {
      const created = await tx.workspace.create({
        data: {
          id: randomUUID(),
          name,
          slug: buildWorkspaceSlug(name),
          type: payload.type ?? 'PERSONAL',
          description: payload.description ?? null,
          avatarUrl: payload.avatarUrl ?? null,
          isArchived: payload.isArchived ?? false,
        },
        select: {
          id: true,
          name: true,
          slug: true,
          type: true,
          description: true,
          avatarUrl: true,
          isArchived: true,
          deletedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (createdByUserId) {
        await tx.workspaceMember.create({
          data: {
            id: randomUUID(),
            workspaceId: created.id,
            userId: createdByUserId,
            role: 'OWNER',
            invitedBy: createdByUserId,
          },
        });
      }

      return created;
    });

    return WorkspaceMapper.toEntity(workspace);
  }

  async findMany(userId: string): Promise<WorkspaceEntity[]> {
    const rows = await this.prisma.workspace.findMany({
      where: {
        deletedAt: null,
        workspaceMembers: {
          some: {
            userId,
          },
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ createdAt: 'asc' }],
    });

    return rows.map((row) => WorkspaceMapper.toEntity(row));
  }

  async findById(id: string): Promise<WorkspaceEntity | null> {
    const row = await this.prisma.workspace.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        name: true,
        slug: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return row ? WorkspaceMapper.toEntity(row) : null;
  }

  async update(id: string, payload: UpdateWorkspaceDto): Promise<WorkspaceEntity | null> {
    const data: Record<string, unknown> = {};

    if (payload.name !== undefined) data.name = payload.name.trim();
    void payload.type;
    void payload.description;
    void payload.avatarUrl;
    void payload.isArchived;

    if (Object.keys(data).length === 0) {
      return this.findById(id);
    }

    const row = await this.prisma.workspace.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        slug: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return WorkspaceMapper.toEntity(row);
  }

  async remove(id: string): Promise<WorkspaceEntity | null> {
    const row = await this.prisma.workspace.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: {
        id: true,
        name: true,
        slug: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return WorkspaceMapper.toEntity(row);
  }

  async inviteMember(workspaceId: string, payload: InviteWorkspaceMemberDto, invitedByUserId: string): Promise<unknown> {
    const workspace = await this.prisma.workspace.findFirst({
      where: { id: workspaceId, deletedAt: null },
      select: { id: true, type: true },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    if (workspace.type !== 'TEAM') {
      throw new ForbiddenException('Invitations are only supported for team workspaces');
    }

    const inviterMembership = await this.prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: invitedByUserId },
      select: { role: true },
    });

    if (!inviterMembership || !['OWNER', 'ADMIN'].includes(inviterMembership.role)) {
      throw new ForbiddenException('Only workspace owners and admins can invite members');
    }

    const invitedUser = await this.prisma.user.findFirst({
      where: { email: payload.email.toLowerCase(), deletedAt: null },
      select: { id: true, email: true },
    });

    if (!invitedUser) {
      throw new NotFoundException('User not found');
    }

    if (invitedUser.id === invitedByUserId) {
      throw new ConflictException('You cannot invite yourself');
    }

    const existingMembership = await this.prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: invitedUser.id },
      select: { id: true },
    });

    if (existingMembership) {
      throw new ConflictException('User is already a member of this workspace');
    }

    return this.prisma.workspaceMember.create({
      data: {
        id: randomUUID(),
        workspaceId,
        userId: invitedUser.id,
        role: 'MEMBER',
        invitedBy: invitedByUserId,
      },
    });
  }
}
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { WorkspaceEntity } from './workspace.entity';
import { IWorkspaceRepository, WorkspaceMembershipRole } from './interfaces/workspace.repository.interface';
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

  async findMemberWorkspaceId(userId: string, workspaceId: string): Promise<string | null> {
    const membership = await this.prisma.workspaceMember.findFirst({
      where: {
        userId,
        workspaceId,
      },
      select: { workspaceId: true },
    });

    return membership?.workspaceId ?? null;
  }

  async findFirstWorkspaceIdByUserId(userId: string): Promise<string | null> {
    const membership = await this.prisma.workspaceMember.findFirst({
      where: { userId },
      select: { workspaceId: true },
      orderBy: { createdAt: 'asc' },
    });

    return membership?.workspaceId ?? null;
  }

  async findWorkspaceIdsByUserId(userId: string): Promise<string[]> {
    const memberships = await this.prisma.workspaceMember.findMany({
      where: { userId },
      select: { workspaceId: true },
    });

    return memberships.map((membership) => membership.workspaceId);
  }

  async findMemberRole(workspaceId: string, userId: string): Promise<string | null> {
    const membership = await this.prisma.workspaceMember.findFirst({
      where: { workspaceId, userId },
      select: { role: true },
    });

    return membership?.role ?? null;
  }

  async findMembershipById(
    workspaceId: string,
    memberId: string,
  ): Promise<{ id: string; role: string; userId: string; workspaceId: string } | null> {
    const membership = await this.prisma.workspaceMember.findFirst({
      where: { id: memberId, workspaceId },
      select: { id: true, role: true, userId: true, workspaceId: true },
    });

    return membership ?? null;
  }

  async createMember(
    workspaceId: string,
    userId: string,
    role: WorkspaceMembershipRole,
    invitedByUserId: string,
  ): Promise<unknown> {
    return this.prisma.workspaceMember.create({
      data: {
        id: randomUUID(),
        workspaceId,
        userId,
        role,
        invitedBy: invitedByUserId,
      },
    });
  }

  async updateMemberRoleById(memberId: string, role: WorkspaceMembershipRole): Promise<unknown> {
    return this.prisma.workspaceMember.update({
      where: { id: memberId },
      data: { role },
    });
  }

  async removeMemberById(memberId: string): Promise<boolean> {
    const result = await this.prisma.workspaceMember.deleteMany({ where: { id: memberId } });
    return result.count > 0;
  }

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
        type: true,
        description: true,
        avatarUrl: true,
        isArchived: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return row ? WorkspaceMapper.toEntity(row) : null;
  }

  async findMembers(workspaceId: string): Promise<unknown[]> {
    const members = await this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      select: {
        id: true,
        role: true,
        joinedAt: true,
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
      },
      orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
    });

    return members.map((member) => ({
      id: member.id,
      userId: member.user.id,
      email: member.user.email,
      name: member.user.displayName ?? member.user.email,
      role: member.role,
      joinedAt: member.joinedAt,
    }));
  }

  async update(id: string, payload: UpdateWorkspaceDto): Promise<WorkspaceEntity | null> {
    const data: Record<string, unknown> = {};

    if (payload.name !== undefined) data.name = payload.name.trim();
    if (payload.type !== undefined) data.type = payload.type;
    if (payload.description !== undefined) data.description = payload.description;
    if (payload.avatarUrl !== undefined) data.avatarUrl = payload.avatarUrl;
    if (payload.isArchived !== undefined) data.isArchived = payload.isArchived;

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
        type: true,
        description: true,
        avatarUrl: true,
        isArchived: true,
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

}
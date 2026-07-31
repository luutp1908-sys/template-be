import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
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

  async findMany(): Promise<WorkspaceEntity[]> {
    const rows = await this.prisma.workspace.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        slug: true,
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

}
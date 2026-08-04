import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateUserDraftDto } from './dto/create-user-draft.dto';
import { UpdateUserDraftDto } from './dto/update-user-draft.dto';
import { UserDraftListQueryDto } from './dto/user-draft-list-query.dto';
import { UserDraftEntity, UserDraftListEntity } from './user-draft.entity';

@Injectable()
export class UserDraftRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  private async resolveWorkspaceId(userId: string, requestedWorkspaceId?: string): Promise<string | null> {
    if (requestedWorkspaceId) {
      const membership = await this.prisma.workspaceMember.findFirst({
        where: {
          userId,
          workspaceId: requestedWorkspaceId,
        },
        select: { workspaceId: true },
      });

      return membership?.workspaceId ?? null;
    }

    const firstMembership = await this.prisma.workspaceMember.findFirst({
      where: { userId },
      select: { workspaceId: true },
      orderBy: { createdAt: 'asc' },
    });

    return firstMembership?.workspaceId ?? null;
  }

  async create(payload: CreateUserDraftDto, userId: string): Promise<UserDraftEntity> {
    const workspaceId = await this.resolveWorkspaceId(userId, payload.workspaceId);

    return this.prisma.userDraft.create({
      data: {
        userId,
        workspaceId,
        templateId: payload.templateId ?? null,
        name: payload.name,
        thumbnail: payload.thumbnail ?? null,
        content: payload.content,
        lastOpenedAt: new Date(),
      },
    });
  }

  async findById(id: string, userId: string): Promise<UserDraftEntity | null> {
    return this.prisma.userDraft.findFirst({
      where: { id, userId },
    });
  }

  async findMany(query: UserDraftListQueryDto, userId: string): Promise<UserDraftListEntity> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const sortBy = query.sortBy ?? 'updatedAt';
    const sortOrder = query.sortOrder ?? 'desc';
    console.log('findMany workspaceId', query)
    const where: Prisma.UserDraftWhereInput = {
      userId,
      ...(query.workspaceId ? { workspaceId: query.workspaceId } : {}),
      ...(query.templateId ? { templateId: query.templateId } : {}),
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.userDraft.count({ where }),
      this.prisma.userDraft.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: {
          [sortBy]: sortOrder,
        },
      }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
    };
  }

  async update(id: string, payload: UpdateUserDraftDto, userId: string): Promise<UserDraftEntity | null> {
    const found = await this.prisma.userDraft.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!found) {
      return null;
    }

    return this.prisma.userDraft.update({
      where: { id },
      data: {
        ...(payload.workspaceId !== undefined ? { workspaceId: payload.workspaceId } : {}),
        ...(payload.templateId !== undefined ? { templateId: payload.templateId } : {}),
        ...(payload.name !== undefined ? { name: payload.name } : {}),
        ...(payload.thumbnail !== undefined ? { thumbnail: payload.thumbnail } : {}),
        ...(payload.content !== undefined ? { content: payload.content } : {}),
      },
    });
  }

  async touch(id: string, userId: string): Promise<UserDraftEntity | null> {
    const found = await this.prisma.userDraft.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!found) {
      return null;
    }

    return this.prisma.userDraft.update({
      where: { id },
      data: {
        lastOpenedAt: new Date(),
      },
    });
  }

  async remove(id: string, userId: string): Promise<boolean> {
    const result = await this.prisma.userDraft.deleteMany({
      where: { id, userId },
    });

    return result.count > 0;
  }
}

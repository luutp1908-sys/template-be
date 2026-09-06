import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateUserDraftDto } from './dto/create-user-draft.dto';
import { UpdateUserDraftDto } from './dto/update-user-draft.dto';
import { UserDraftListQueryDto } from './dto/user-draft-list-query.dto';
import { UserDraftEntity, UserDraftListEntity } from './user-draft.entity';

@Injectable()
export class UserDraftRepository {
  constructor(private readonly prisma: PrismaService) {}

  private async buildAccessibleDraftWhere(
    userId: string,
    workspaceIds: string[],
    extraWhere: Prisma.UserDraftWhereInput = {},
  ): Promise<Prisma.UserDraftWhereInput> {
    if (workspaceIds.length === 0) {
      return { id: { in: [] } };
    }

    return {
      AND: [
        extraWhere,
        {
          OR: [{ userId }, { workspaceId: { in: workspaceIds } }],
        },
      ],
    };
  }

  async create(payload: CreateUserDraftDto, userId: string, workspaceId: string | null): Promise<UserDraftEntity> {
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

  async findById(id: string, userId: string, workspaceIds: string[]): Promise<UserDraftEntity | null> {
    const where = await this.buildAccessibleDraftWhere(userId, workspaceIds, { id });

    return this.prisma.userDraft.findFirst({
      where,
    });
  }

  async findMany(query: UserDraftListQueryDto, userId: string, workspaceIds: string[]): Promise<UserDraftListEntity> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const sortBy = query.sortBy ?? 'updatedAt';
    const sortOrder = query.sortOrder ?? 'desc';

    const where = await this.buildAccessibleDraftWhere(
      userId,
      workspaceIds,
      {
        ...(query.workspaceId ? { workspaceId: query.workspaceId } : {}),
        ...(query.templateId ? { templateId: query.templateId } : {}),
      },
    );

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

  async update(
    id: string,
    payload: UpdateUserDraftDto,
    userId: string,
    workspaceIds: string[],
  ): Promise<UserDraftEntity | null> {
    const found = await this.prisma.userDraft.findFirst({
      where: await this.buildAccessibleDraftWhere(userId, workspaceIds, { id }),
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

  async touch(id: string, userId: string, workspaceIds: string[]): Promise<UserDraftEntity | null> {
    const found = await this.prisma.userDraft.findFirst({
      where: await this.buildAccessibleDraftWhere(userId, workspaceIds, { id }),
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

  async remove(id: string, userId: string, workspaceIds: string[]): Promise<boolean> {
    const result = await this.prisma.userDraft.deleteMany({
      where: await this.buildAccessibleDraftWhere(userId, workspaceIds, { id }),
    });

    return result.count > 0;
  }
}

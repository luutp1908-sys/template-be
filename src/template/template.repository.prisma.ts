import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { TemplateListQueryDto } from './dto/template-list-query.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { ITemplateRepository } from './interfaces/template.repository.interface';
import { TemplateEntity, TemplateListEntity } from './template.entity';
import { TemplateMapper } from './template.mapper';

const templateInclude = {
  author: {
    select: {
      id: true,
      email: true,
      displayName: true,
    },
  },
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
  editorType: {
    select: {
      id: true,
      key: true,
      name: true,
    },
  },
} satisfies Prisma.TemplateInclude;

@Injectable()
export class TemplateRepository implements ITemplateRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async create(payload: CreateTemplateDto, authorId: string): Promise<TemplateEntity> {
    const created = await this.prisma.template.create({
      data: {
        title: payload.title,
        slug: payload.slug,
        authorId,
        editorTypeId: payload.editorTypeId,
        categoryId: payload.categoryId,
        thumbnail: payload.thumbnail ?? null,
        status: payload.status ?? 'draft',
      },
      include: templateInclude,
    });

    return TemplateMapper.toEntity(created);
  }

  async findById(id: string): Promise<TemplateEntity | null> {
    const template = await this.prisma.template.findUnique({
      where: { id },
      include: templateInclude,
    });

    return template ? TemplateMapper.toEntity(template) : null;
  }

  async findMany(query: TemplateListQueryDto): Promise<TemplateListEntity> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'desc';

    const where: Prisma.TemplateWhereInput = {
      ...(query.editorTypeId ? { editorTypeId: query.editorTypeId } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.authorId ? { authorId: query.authorId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            title: {
              contains: query.search,
              mode: 'insensitive',
            },
          }
        : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.template.count({ where }),
      this.prisma.template.findMany({
        where,
        include: templateInclude,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: {
          [sortBy]: sortOrder,
        },
      }),
    ]);

    return {
      items: rows.map((row) => TemplateMapper.toEntity(row)),
      total,
      page,
      pageSize,
    };
  }

  async update(id: string, payload: UpdateTemplateDto): Promise<TemplateEntity | null> {
    const found = await this.prisma.template.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!found) {
      return null;
    }

    const updated = await this.prisma.template.update({
      where: { id },
      data: {
        ...(payload.title !== undefined ? { title: payload.title } : {}),
        ...(payload.slug !== undefined ? { slug: payload.slug } : {}),
        ...(payload.editorTypeId !== undefined ? { editorTypeId: payload.editorTypeId } : {}),
        ...(payload.categoryId !== undefined ? { categoryId: payload.categoryId } : {}),
        ...(payload.thumbnail !== undefined ? { thumbnail: payload.thumbnail } : {}),
        ...(payload.status !== undefined ? { status: payload.status } : {}),
      },
      include: templateInclude,
    });

    return TemplateMapper.toEntity(updated);
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.prisma.template.deleteMany({ where: { id } });
    return result.count > 0;
  }

  async publish(id: string): Promise<TemplateEntity | null> {
    return this.update(id, { status: 'published' });
  }

  async archive(id: string): Promise<TemplateEntity | null> {
    return this.update(id, { status: 'archived' });
  }
}

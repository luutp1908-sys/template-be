import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CategoryListQueryDto } from './dto/category-list-query.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryEntity } from './category.entity';
import { ICategoryRepository } from './interfaces/category.repository.interface';
import { randomUUID } from 'crypto';

@Injectable()
export class CategoryRepository implements ICategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(query: CategoryListQueryDto): Promise<CategoryEntity[]> {
    // Build where clause, mapping numeric editorTypeId (mock-style 0/1/2)
    // to actual EditorType UUIDs stored in DB.
    const where: any = { deletedAt: null };

    if (query.editorTypeId !== undefined) {
      // DTO currently casts query value to Number. If it's a small integer
      // (mock-style), map to the corresponding EditorType by creation order.
      if (typeof query.editorTypeId === 'number') {
        const idx = query.editorTypeId;
        const editorTypes = await this.prisma.editorType.findMany({ orderBy: [{ createdAt: 'asc' }], select: { id: true } });
        const et = editorTypes[idx];
        if (!et) {
          // no matching editor type for this numeric index -> return empty
          return [];
        }
        where.editorTypeId = et.id;
      } else {
        where.editorTypeId = String(query.editorTypeId);
      }
    }

    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }

    const rows = await this.prisma.category.findMany({
      where,
      orderBy: [{ createdAt: 'asc' }],
      select: {
        id: true,
        workspaceId: true,
        editorTypeId: true,
        parentId: true,
        name: true,
        slug: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return rows as unknown as CategoryEntity[];
  }

  async create(_payload: CreateCategoryDto): Promise<CategoryEntity> {
    // Creating a category via Prisma requires workspaceId and editorTypeId
    // which are not present on the minimal CreateCategoryDto used in the scaffold.
    // Implement full create behavior once DTO/entity include required fields.
    const payload = _payload as CreateCategoryDto;

    const slug = payload.slug ?? payload.name.toLowerCase().replace(/\s+/g, '-').slice(0, 180);

    // Database schema requires workspaceId and editorTypeId. If not provided,
    // attempt to reuse the first existing row, otherwise create sensible defaults
    // so the repository behaves similarly to the in-memory mock in dev.
    let workspaceId =
      payload.workspaceId ?? (await this.prisma.workspace.findFirst({ select: { id: true } }))?.id;

    if (!workspaceId) {
      // create a default workspace to match mock behavior (avoids hard failures)
      const wsId = randomUUID();
      const ws = await this.prisma.workspace.create({
        data: { id: wsId, name: 'Default Workspace', slug: `default-${wsId.slice(0, 8)}` },
        select: { id: true },
      });
      workspaceId = ws.id;
    }

    let editorTypeId = payload.editorTypeId ? String(payload.editorTypeId) : undefined;
    if (!editorTypeId) {
      editorTypeId = (await this.prisma.editorType.findFirst({ select: { id: true } }))?.id;
    }

    if (!editorTypeId) {
      // create a default editor type similar to mock's permissive behavior
      const etId = randomUUID();
      const et = await this.prisma.editorType.create({
        data: { id: etId, key: `default-${etId.slice(0, 8)}`, name: 'Default' },
        select: { id: true },
      });
      editorTypeId = et.id;
    }

    const created = await this.prisma.category.create({
      data: {
        id: randomUUID(),
        workspaceId,
        editorTypeId: editorTypeId,
        parentId: payload.parentId ?? null,
        name: payload.name,
        slug,
      },
      select: {
        id: true,
        workspaceId: true,
        editorTypeId: true,
        parentId: true,
        name: true,
        slug: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return created as unknown as CategoryEntity;
  }

  async findById(id: string): Promise<CategoryEntity | null> {
    const row = await this.prisma.category.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, workspaceId: true, editorTypeId: true, parentId: true, name: true, slug: true, deletedAt: true, createdAt: true, updatedAt: true },
    });

    if (!row) return null;

    return {
      id: row.id,
      workspaceId: (row as any).workspaceId,
      editorTypeId: (row as any).editorTypeId,
      parentId: (row as any).parentId ?? null,
      name: (row as any).name,
      slug: (row as any).slug,
      deletedAt: (row as any).deletedAt ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    } as CategoryEntity;
  }

  async findChildren(id: string): Promise<CategoryEntity[]> {
    const rows = await this.prisma.category.findMany({
      where: { parentId: id, deletedAt: null },
      select: { id: true, workspaceId: true, editorTypeId: true, parentId: true, name: true, slug: true, deletedAt: true, createdAt: true, updatedAt: true },
    });
    return rows as unknown as CategoryEntity[];
  }

  async findDescendants(id: string): Promise<CategoryEntity[]> {
    const descendants: CategoryEntity[] = [];
    let queue = [id];
    const seen = new Set<string>();

    while (queue.length > 0) {
      const rows = await this.prisma.category.findMany({
        where: { parentId: { in: queue }, deletedAt: null },
        select: { id: true, workspaceId: true, editorTypeId: true, parentId: true, name: true, slug: true, deletedAt: true, createdAt: true, updatedAt: true },
      });

      const next: string[] = [];
      for (const r of rows) {
        if (seen.has(r.id)) continue;
        seen.add(r.id);
        descendants.push(r as unknown as CategoryEntity);
        next.push(r.id);
      }

      queue = next;
    }

    return descendants;
  }

  async findAncestors(id: string): Promise<CategoryEntity[]> {
    const ancestors: CategoryEntity[] = [];
    let current = await this.prisma.category.findUnique({ where: { id }, select: { parentId: true } });
    if (!current) throw new NotFoundException('Category not found');

    while (current && current.parentId) {
      const parent: any = await this.prisma.category.findFirst({ where: { id: current.parentId, deletedAt: null }, select: { id: true, workspaceId: true, editorTypeId: true, parentId: true, name: true, slug: true, deletedAt: true, createdAt: true, updatedAt: true } });
      if (!parent) break;
      ancestors.push(parent as unknown as CategoryEntity);
      current = await this.prisma.category.findUnique({ where: { id: parent.id }, select: { parentId: true } });
    }

    return ancestors.reverse();
  }

  async update(id: string, payload: UpdateCategoryDto): Promise<CategoryEntity> {
    const updated = await this.prisma.category.update({
      where: { id },
      data: { ...payload },
      select: { id: true, workspaceId: true, editorTypeId: true, parentId: true, name: true, slug: true, deletedAt: true, createdAt: true, updatedAt: true },
    });
    return updated as unknown as CategoryEntity;
  }

  async move(id: string, newParentId: string | null): Promise<CategoryEntity> {
    if (newParentId === id) {
      throw new BadRequestException('Cannot set parent to self');
    }

    // check cycles: ensure newParentId is not a descendant of id
    if (newParentId) {
      const descendants = await this.findDescendants(id);
      if (descendants.some((d) => d.id === newParentId)) {
        throw new BadRequestException('Cannot move category into its own descendant');
      }
    }

    const updated = await this.prisma.category.update({ where: { id }, data: { parentId: newParentId }, select: { id: true, workspaceId: true, editorTypeId: true, parentId: true, name: true, slug: true, deletedAt: true, createdAt: true, updatedAt: true } });
    return updated as unknown as CategoryEntity;
  }

  async softDeleteSafe(id: string): Promise<void> {
    // refuse delete if children exist
    const child = await this.prisma.category.findFirst({ where: { parentId: id, deletedAt: null }, select: { id: true } });
    if (child) {
      throw new BadRequestException('Category has child categories; delete aborted');
    }

    // refuse if templates exist in this category
    const template = await this.prisma.template.findFirst({ where: { categoryId: id }, select: { id: true } });
    if (template) {
      throw new BadRequestException('Category has templates; delete aborted');
    }

    await this.prisma.category.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async getTreeByWorkspace(workspaceId: string): Promise<CategoryEntity[]> {
    const rows = await this.prisma.category.findMany({ where: { workspaceId, deletedAt: null }, select: { id: true, workspaceId: true, editorTypeId: true, parentId: true, name: true, slug: true, deletedAt: true, createdAt: true, updatedAt: true } });
    return rows as unknown as CategoryEntity[];
  }

  async getTemplatesRecursive(id: string): Promise<any[]> {
    const ids = [id, ...(await this.findDescendants(id)).map((d) => d.id)];
    const templates = await this.prisma.template.findMany({ where: { categoryId: { in: ids }, }, select: { id: true, title: true, slug: true, authorId: true, status: true, createdAt: true, updatedAt: true } });
    return templates;
  }
}

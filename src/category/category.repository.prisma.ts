import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CategoryEntity } from './category.entity';
import { ICategoryRepository } from './interfaces/category.repository.interface';

@Injectable()
export class CategoryRepository implements ICategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(_payload: CreateCategoryDto): Promise<CategoryEntity> {
    // Creating a category via Prisma requires workspaceId and editorTypeId
    // which are not present on the minimal CreateCategoryDto used in the scaffold.
    // Implement full create behavior once DTO/entity include required fields.
    throw new BadRequestException('Prisma-backed create not implemented: missing required fields');
  }

  async findById(id: string): Promise<CategoryEntity | null> {
    const row = await this.prisma.category.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, createdAt: true, updatedAt: true },
    });

    if (!row) return null;

    return {
      id: row.id,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    } as CategoryEntity;
  }
}

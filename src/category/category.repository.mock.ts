import { Injectable } from '@nestjs/common';
import { InMemoryStore } from '../common/testing/in-memory-store';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CategoryEntity } from './category.entity';
import { ICategoryRepository } from './interfaces/category.repository.interface';
import { CategoryMapper } from './category.mapper';

@Injectable()
export class CategoryRepository implements ICategoryRepository {
  private readonly store = new InMemoryStore<CategoryEntity>();

  async create(payload: CreateCategoryDto): Promise<CategoryEntity> {
    return this.store.create((base) =>
      CategoryMapper.toEntity({
        ...base,
        ...payload,
      }),
    );
  }

  async findById(id: string): Promise<CategoryEntity | null> {
    return this.store.findById(id);
  }
}

import { Injectable } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CategoryEntity } from './category.entity';
import { CategoryRepository } from './category.repository';

@Injectable()
export class CategoryService {
  constructor(private readonly repository: CategoryRepository) {}

  async create(payload: CreateCategoryDto): Promise<CategoryEntity> {
    return this.repository.create(payload);
  }

  async findById(id: string): Promise<CategoryEntity | null> {
    return this.repository.findById(id);
  }
}

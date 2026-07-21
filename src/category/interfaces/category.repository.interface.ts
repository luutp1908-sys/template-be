import { CreateCategoryDto } from '../dto/create-category.dto';
import { CategoryEntity } from '../category.entity';

export interface ICategoryRepository {
  create(_payload: CreateCategoryDto): Promise<CategoryEntity>;
  findById(_id: string): Promise<CategoryEntity | null>;
}

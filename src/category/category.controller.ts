import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CategoryEntity } from './category.entity';
import { CategoryService } from './category.service';

@ApiTags('category')
@ApiBearerAuth()
@Controller({ path: 'category', version: '1' })
export class CategoryController {
  constructor(private readonly service: CategoryService) {}

  @Post()
  create(@Body() payload: CreateCategoryDto): Promise<CategoryEntity> {
    return this.service.create(payload);
  }

  @Get(':id')
  findById(@Param('id') id: string): Promise<CategoryEntity | null> {
    return this.service.findById(id);
  }
}

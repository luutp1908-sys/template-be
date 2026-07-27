import { Body, Controller, Get, Param, Post, Patch, Delete, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CategoryListQueryDto } from './dto/category-list-query.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { MoveCategoryDto } from './dto/move-category.dto';
import { CategoryEntity } from './category.entity';
import { CategoryService } from './category.service';

@ApiTags('category')
@ApiBearerAuth()
@Controller({ path: 'category', version: '1' })
export class CategoryController {
  constructor(private readonly service: CategoryService) {}

  @Get()
  findMany(@Query() query: CategoryListQueryDto): Promise<CategoryEntity[]> {
    return this.service.findMany(query);
  }

  @Post()
  create(@Body() payload: CreateCategoryDto): Promise<CategoryEntity> {
    return this.service.create(payload);
  }

  @Get(':id')
  findById(@Param('id') id: string): Promise<CategoryEntity | null> {
    return this.service.findById(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() payload: UpdateCategoryDto): Promise<CategoryEntity> {
    return this.service.update(id, payload);
  }

  @Delete(':id')
  delete(@Param('id') id: string): Promise<void> {
    return this.service.delete(id);
  }

  @Get('workspace/:workspaceId/tree')
  getTree(@Param('workspaceId') workspaceId: string): Promise<any> {
    return this.service.getTreeByWorkspace(workspaceId);
  }

  @Post(':id/move')
  move(@Param('id') id: string, @Body() payload: MoveCategoryDto): Promise<CategoryEntity> {
    return this.service.move(id, payload.newParentId ?? null);
  }

  @Get(':id/breadcrumbs')
  breadcrumbs(@Param('id') id: string): Promise<CategoryEntity[]> {
    return this.service.getBreadcrumbs(id);
  }

  @Get(':id/descendants')
  descendants(@Param('id') id: string): Promise<CategoryEntity[]> {
    return this.service.getDescendants(id);
  }

  @Get(':id/ancestors')
  ancestors(@Param('id') id: string): Promise<CategoryEntity[]> {
    return this.service.getAncestors(id);
  }

  @Get(':id/templates')
  templates(@Param('id') id: string, @Query('recursive') recursive?: string): Promise<any[]> {
    // default to recursive behavior
    return this.service.getTemplatesRecursive(id);
  }
}

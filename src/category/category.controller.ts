import { Body, Controller, Get, Param, Post, Patch, Delete, Query, ParseUUIDPipe } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CategoryListQueryDto } from './dto/category-list-query.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { MoveCategoryDto } from './dto/move-category.dto';
import { CategoryEntity } from './category.entity';
import { CategoryResponseDto, CategoryTreeNodeResponseDto } from './dto/category-response.dto';
import { CategoryService } from './category.service';

@ApiTags('category')
@ApiBearerAuth()
@Controller({ path: 'category', version: '1' })
export class CategoryController {
  constructor(private readonly service: CategoryService) {}

  private toCategoryResponse(entity: CategoryEntity): CategoryResponseDto {
    return {
      id: entity.id,
      editorTypeId: entity.editorTypeId,
      parentId: entity.parentId,
      name: entity.name,
      slug: entity.slug,
      templateCount: entity.templateCount,
      seo: entity.seo
        ? {
            metaTitle: entity.seo.metaTitle ?? null,
            metaDescription: entity.seo.metaDescription ?? null,
            metaKeywords: entity.seo.metaKeywords ?? null,
            ogTitle: entity.seo.ogTitle ?? null,
            ogDescription: entity.seo.ogDescription ?? null,
            ogImage: entity.seo.ogImage ?? null,
            canonicalUrl: entity.seo.canonicalUrl ?? null,
            robotsMeta: entity.seo.robotsMeta ?? null,
          }
        : null,
      deletedAt: entity.deletedAt ?? null,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  private toCategoryTreeNodeResponse(node: any): CategoryTreeNodeResponseDto {
    return {
      ...this.toCategoryResponse(node as CategoryEntity),
      children: Array.isArray(node.children)
        ? node.children.map((child: any) => this.toCategoryTreeNodeResponse(child))
        : [],
    };
  }

  @Get()
  async findMany(@Query() query: CategoryListQueryDto): Promise<CategoryResponseDto[]> {
    const entities = await this.service.findMany(query);
    return entities.map((entity) => this.toCategoryResponse(entity));
  }

  @Post()
  async create(@Body() payload: CreateCategoryDto): Promise<CategoryResponseDto> {
    const entity = await this.service.create(payload);
    return this.toCategoryResponse(entity);
  }

  @Get('stats/hierarchy/:id')
  @ApiNotFoundResponse({ description: 'Category not found.' })
  getHierarchyStats(@Param('id', new ParseUUIDPipe()) id: string): Promise<any> {
    return this.service.getHierarchyStats(id);
  }

  @Get('stats/orphans')
  getOrphanedCategories(): Promise<any[]> {
    return this.service.getOrphanedCategories();
  }

  @Get(':id')
  async findById(@Param('id', new ParseUUIDPipe()) id: string): Promise<CategoryResponseDto | null> {
    const entity = await this.service.findById(id);
    return entity ? this.toCategoryResponse(entity) : null;
  }

  @Patch(':id')
  @ApiNotFoundResponse({ description: 'Category not found.' })
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() payload: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    const entity = await this.service.update(id, payload);
    return this.toCategoryResponse(entity);
  }

  @Delete(':id')
  @ApiNotFoundResponse({ description: 'Category not found.' })
  @ApiConflictResponse({ description: 'Category cannot be deleted due to dependent state.' })
  delete(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    return this.service.delete(id);
  }

  @Get('tree')
  async getTree(): Promise<CategoryTreeNodeResponseDto[]> {
    const tree = await this.service.getTree();
    return (tree as any[]).map((node) => this.toCategoryTreeNodeResponse(node));
  }

  @Post(':id/move')
  @ApiNotFoundResponse({ description: 'Category not found.' })
  @ApiConflictResponse({ description: 'Category move violates hierarchy constraints.' })
  async move(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() payload: MoveCategoryDto,
  ): Promise<CategoryResponseDto> {
    const entity = await this.service.move(id, payload.newParentId ?? null);
    return this.toCategoryResponse(entity);
  }

  @Get(':id/breadcrumbs')
  @ApiNotFoundResponse({ description: 'Category not found.' })
  async breadcrumbs(@Param('id', new ParseUUIDPipe()) id: string): Promise<CategoryResponseDto[]> {
    const entities = await this.service.getBreadcrumbs(id);
    return entities.map((entity) => this.toCategoryResponse(entity));
  }

  @Get(':id/descendants')
  async descendants(@Param('id', new ParseUUIDPipe()) id: string): Promise<CategoryResponseDto[]> {
    const entities = await this.service.getDescendants(id);
    return entities.map((entity) => this.toCategoryResponse(entity));
  }

  @Get(':id/ancestors')
  @ApiNotFoundResponse({ description: 'Category not found.' })
  async ancestors(@Param('id', new ParseUUIDPipe()) id: string): Promise<CategoryResponseDto[]> {
    const entities = await this.service.getAncestors(id);
    return entities.map((entity) => this.toCategoryResponse(entity));
  }

  @Get(':id/templates')
  @ApiNotFoundResponse({ description: 'Category not found.' })
  templates(@Param('id', new ParseUUIDPipe()) id: string): Promise<any[]> {
    return this.service.getTemplatesRecursive(id);
  }
}

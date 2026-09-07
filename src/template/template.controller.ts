import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthUser } from '../auth/types/auth-user.type';
import { CreateTemplateDto } from './dto/create-template.dto';
import { TemplateListQueryDto } from './dto/template-list-query.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { TemplateStatsQueryDto } from './dto/template-stats-query.dto';
import { CategoryPopularityStatsEntity, PopularityStatsEntity, TemplateEntity, TemplateListEntity } from './template.entity';
import {
  TemplateCategoryStatsResponseDto,
  TemplateListResponseDto,
  TemplatePopularityStatsResponseDto,
  TemplateResponseDto,
} from './dto/template-response.dto';
import { TemplateService } from './template.service';

@ApiTags('template')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'template', version: '1' })
export class TemplateController {
  constructor(private readonly service: TemplateService) {}

  private toTemplateResponse(entity: TemplateEntity): TemplateResponseDto {
    return {
      id: entity.id,
      title: entity.title,
      slug: entity.slug,
      thumbnail: entity.thumbnail,
      author: entity.author
        ? {
            id: entity.author.id,
            email: entity.author.email,
            displayName: entity.author.displayName,
          }
        : null,
      category: {
        id: entity.category.id,
        name: entity.category.name,
        slug: entity.category.slug,
      },
      editorType: {
        id: entity.editorType.id,
        type: entity.editorType.type,
      },
      status: entity.status,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  private toTemplateListResponse(entity: TemplateListEntity): TemplateListResponseDto {
    return {
      items: entity.items.map((item) => this.toTemplateResponse(item)),
      total: entity.total,
      page: entity.page,
      pageSize: entity.pageSize,
    };
  }

  private toPopularityStatsResponse(entity: PopularityStatsEntity): TemplatePopularityStatsResponseDto {
    return {
      editorType: {
        id: entity.editorType.id,
        type: entity.editorType.type,
        name: entity.editorType.name,
      },
      templateCount: entity.templateCount,
      publishedCount: entity.publishedCount,
      draftCount: entity.draftCount,
    };
  }

  private toCategoryStatsResponse(entity: CategoryPopularityStatsEntity): TemplateCategoryStatsResponseDto {
    return {
      categoryId: entity.categoryId,
      categoryName: entity.categoryName,
      editorTypeId: entity.editorTypeId,
      templateCount: entity.templateCount,
      publishedCount: entity.publishedCount,
    };
  }

  @Get()
  @Public()
  @ApiOperation({
    summary: 'List templates with pagination, sorting, filtering, and title search',
  })
  @ApiOkResponse({ type: Object })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['createdAt', 'updatedAt', 'title', 'status'],
  })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'status', required: false, enum: ['draft', 'published', 'archived'] })
  @ApiQuery({ name: 'editorTypeId', required: false, type: Number, enum: [0, 1, 2, 3] })
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  @ApiQuery({ name: 'authorId', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findMany(@Query() query: TemplateListQueryDto): Promise<TemplateListResponseDto> {
    const result = await this.service.findMany(query);
    return this.toTemplateListResponse(result);
  }

  @Post()
  @ApiOperation({ summary: 'Create template metadata' })
  @ApiOkResponse({ type: Object })
  create(
    @Body() payload: CreateTemplateDto,
    @CurrentUser() user?: AuthUser,
  ): Promise<TemplateResponseDto> {
    const isMockMode = (process.env.MOCK_MODE ?? '').toLowerCase() === 'true';
    if (!user?.id && !isMockMode) {
      throw new UnauthorizedException(
        'Authentication is required to create template when MOCK_MODE is disabled',
      );
    }
    return this.service.create(payload, user?.id ?? '').then((entity) => this.toTemplateResponse(entity));
  }

  @Get('stats/popularity')
  @Public()
  @ApiOperation({ summary: 'Get popularity stats by editor type' })
  @ApiOkResponse({ type: [Object] })
  async getPopularityStats(@Query() query: TemplateStatsQueryDto): Promise<TemplatePopularityStatsResponseDto[]> {
    const rows = await this.service.getPopularityStats(query);
    return rows.map((row) => this.toPopularityStatsResponse(row));
  }

  @Get('stats/by-category')
  @Public()
  @ApiOperation({ summary: 'Get template counts by category' })
  @ApiOkResponse({ type: [Object] })
  async getCategoryStats(@Query() query: TemplateStatsQueryDto): Promise<TemplateCategoryStatsResponseDto[]> {
    const rows = await this.service.getCategoryStats(query);
    return rows.map((row) => this.toCategoryStatsResponse(row));
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get template metadata by id' })
  @ApiOkResponse({ type: Object })
  async findById(@Param('id') id: string): Promise<TemplateResponseDto> {
    const entity = await this.service.findById(id);
    return this.toTemplateResponse(entity);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update template metadata' })
  @ApiOkResponse({ type: Object })
  async update(@Param('id') id: string, @Body() payload: UpdateTemplateDto): Promise<TemplateResponseDto> {
    const entity = await this.service.update(id, payload);
    return this.toTemplateResponse(entity);
  }

  @Patch(':id/publish')
  @ApiOperation({ summary: 'Publish template metadata' })
  @ApiOkResponse({ type: Object })
  async publish(@Param('id') id: string): Promise<TemplateResponseDto> {
    const entity = await this.service.publish(id);
    return this.toTemplateResponse(entity);
  }

  @Patch(':id/archive')
  @ApiOperation({ summary: 'Archive template metadata' })
  @ApiOkResponse({ type: Object })
  async archive(@Param('id') id: string): Promise<TemplateResponseDto> {
    const entity = await this.service.archive(id);
    return this.toTemplateResponse(entity);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete template metadata' })
  @ApiNoContentResponse()
  async remove(@Param('id') id: string): Promise<void> {
    await this.service.remove(id);
  }
}

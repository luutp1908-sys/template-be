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
import { TemplateService } from './template.service';

@ApiTags('template')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'template', version: '1' })
export class TemplateController {
  constructor(private readonly service: TemplateService) {}

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
  findMany(@Query() query: TemplateListQueryDto): Promise<TemplateListEntity> {
    return this.service.findMany(query);
  }

  @Post()
  @ApiOperation({ summary: 'Create template metadata' })
  @ApiOkResponse({ type: Object })
  create(
    @Body() payload: CreateTemplateDto,
    @CurrentUser() user?: AuthUser,
  ): Promise<TemplateEntity> {
    const isMockMode = (process.env.MOCK_MODE ?? '').toLowerCase() === 'true';
    if (!user?.id && !isMockMode) {
      throw new UnauthorizedException(
        'Authentication is required to create template when MOCK_MODE is disabled',
      );
    }

    return this.service.create(payload, user?.id ?? '');
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get template metadata by id' })
  @ApiOkResponse({ type: Object })
  findById(@Param('id') id: string): Promise<TemplateEntity> {
    return this.service.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update template metadata' })
  @ApiOkResponse({ type: Object })
  update(@Param('id') id: string, @Body() payload: UpdateTemplateDto): Promise<TemplateEntity> {
    return this.service.update(id, payload);
  }

  @Patch(':id/publish')
  @ApiOperation({ summary: 'Publish template metadata' })
  @ApiOkResponse({ type: Object })
  publish(@Param('id') id: string): Promise<TemplateEntity> {
    return this.service.publish(id);
  }

  @Patch(':id/archive')
  @ApiOperation({ summary: 'Archive template metadata' })
  @ApiOkResponse({ type: Object })
  archive(@Param('id') id: string): Promise<TemplateEntity> {
    return this.service.archive(id);
  }

  @Get('stats/popularity')
  @Public()
  @ApiOperation({ summary: 'Get popularity stats by editor type' })
  @ApiOkResponse({ type: [Object] })
  getPopularityStats(@Query() query: TemplateStatsQueryDto): Promise<PopularityStatsEntity[]> {
    return this.service.getPopularityStats(query);
  }

  @Get('stats/by-category')
  @Public()
  @ApiOperation({ summary: 'Get template counts by category' })
  @ApiOkResponse({ type: [Object] })
  getCategoryStats(@Query() query: TemplateStatsQueryDto): Promise<CategoryPopularityStatsEntity[]> {
    return this.service.getCategoryStats(query);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete template metadata' })
  @ApiNoContentResponse()
  async remove(@Param('id') id: string): Promise<void> {
    await this.service.remove(id);
  }
}

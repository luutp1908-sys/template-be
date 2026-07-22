import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthUser } from '../auth/types/auth-user.type';
import { CreateTemplateDto } from './dto/create-template.dto';
import { TemplateListQueryDto } from './dto/template-list-query.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { TemplateEntity, TemplateListEntity } from './template.entity';
import { TemplateService } from './template.service';

@ApiTags('template')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'template', version: '1' })
export class TemplateController {
  constructor(private readonly service: TemplateService) {}

  @Get()
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
  @ApiQuery({ name: 'editorTypeId', required: false, type: String })
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
    @CurrentUser() user: AuthUser,
  ): Promise<TemplateEntity> {
    return this.service.create(payload, user.id);
  }

  @Get(':id')
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

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete template metadata' })
  @ApiNoContentResponse()
  async remove(@Param('id') id: string): Promise<void> {
    await this.service.remove(id);
  }
}

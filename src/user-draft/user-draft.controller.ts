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
import { ApiBearerAuth, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthUser } from '../auth/types/auth-user.type';
import { CreateUserDraftDto } from './dto/create-user-draft.dto';
import { UpdateUserDraftDto } from './dto/update-user-draft.dto';
import { UserDraftListQueryDto } from './dto/user-draft-list-query.dto';
import { UserDraftEntity, UserDraftListEntity } from './user-draft.entity';
import { UserDraftListResponseDto, UserDraftResponseDto } from './dto/user-draft-response.dto';
import { UserDraftService } from './user-draft.service';

@ApiTags('user-draft')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'user-draft', version: '1' })
export class UserDraftController {
  constructor(private readonly service: UserDraftService) {}

  private toUserDraftResponse(entity: UserDraftEntity): UserDraftResponseDto {
    return {
      id: entity.id,
      userId: entity.userId,
      workspaceId: entity.workspaceId,
      templateId: entity.templateId,
      name: entity.name,
      thumbnail: entity.thumbnail,
      content: entity.content,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      lastOpenedAt: entity.lastOpenedAt,
    };
  }

  private toUserDraftListResponse(entity: UserDraftListEntity): UserDraftListResponseDto {
    return {
      items: entity.items.map((item) => this.toUserDraftResponse(item)),
      total: entity.total,
      page: entity.page,
      pageSize: entity.pageSize,
    };
  }

  @Get()
  @ApiOperation({ summary: 'List drafts for the current user' })
  @ApiOkResponse({ type: Object })
  findMany(
    @Query() query: UserDraftListQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<UserDraftListResponseDto> {
    return this.service
      .findMany(query, user.id)
      .then((entity) => this.toUserDraftListResponse(entity));
  }

  @Post()
  @ApiOperation({ summary: 'Create a draft for the current user' })
  @ApiOkResponse({ type: Object })
  create(
    @Body() payload: CreateUserDraftDto,
    @CurrentUser() user: AuthUser,
  ): Promise<UserDraftResponseDto> {
    return this.service.create(payload, user.id).then((entity) => this.toUserDraftResponse(entity));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a draft by id for the current user' })
  @ApiOkResponse({ type: Object })
  findById(@Param('id') id: string, @CurrentUser() user: AuthUser): Promise<UserDraftResponseDto> {
    return this.service.findById(id, user.id).then((entity) => this.toUserDraftResponse(entity));
  }

  @Get(':id/template-content')
  @ApiOperation({ summary: 'Get draft content only (private)' })
  @ApiOkResponse({ type: Object })
  getDraftTemplateContent(@Param('id') id: string, @CurrentUser() user: AuthUser): Promise<UserDraftResponseDto> {
    return this.service.findById(id, user.id).then((entity) => this.toUserDraftResponse(entity));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a draft by id for the current user' })
  @ApiOkResponse({ type: Object })
  update(
    @Param('id') id: string,
    @Body() payload: UpdateUserDraftDto,
    @CurrentUser() user: AuthUser,
  ): Promise<UserDraftResponseDto> {
    return this.service.update(id, payload, user.id).then((entity) => this.toUserDraftResponse(entity));
  }

  @Patch(':id/open')
  @ApiOperation({ summary: 'Mark a draft as recently opened' })
  @ApiOkResponse({ type: Object })
  touch(@Param('id') id: string, @CurrentUser() user: AuthUser): Promise<UserDraftResponseDto> {
    return this.service.touch(id, user.id).then((entity) => this.toUserDraftResponse(entity));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a draft by id for the current user' })
  @ApiNoContentResponse()
  async remove(@Param('id') id: string, @CurrentUser() user: AuthUser): Promise<void> {
    await this.service.remove(id, user.id);
  }
}
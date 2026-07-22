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
import { UserDraftService } from './user-draft.service';

@ApiTags('user-draft')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'user-draft', version: '1' })
export class UserDraftController {
  constructor(private readonly service: UserDraftService) {}

  @Get()
  @ApiOperation({ summary: 'List drafts for the current user' })
  @ApiOkResponse({ type: Object })
  findMany(
    @Query() query: UserDraftListQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<UserDraftListEntity> {
    return this.service.findMany(query, user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a draft for the current user' })
  @ApiOkResponse({ type: Object })
  create(
    @Body() payload: CreateUserDraftDto,
    @CurrentUser() user: AuthUser,
  ): Promise<UserDraftEntity> {
    return this.service.create(payload, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a draft by id for the current user' })
  @ApiOkResponse({ type: Object })
  findById(@Param('id') id: string, @CurrentUser() user: AuthUser): Promise<UserDraftEntity> {
    return this.service.findById(id, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a draft by id for the current user' })
  @ApiOkResponse({ type: Object })
  update(
    @Param('id') id: string,
    @Body() payload: UpdateUserDraftDto,
    @CurrentUser() user: AuthUser,
  ): Promise<UserDraftEntity> {
    return this.service.update(id, payload, user.id);
  }

  @Patch(':id/open')
  @ApiOperation({ summary: 'Mark a draft as recently opened' })
  @ApiOkResponse({ type: Object })
  touch(@Param('id') id: string, @CurrentUser() user: AuthUser): Promise<UserDraftEntity> {
    return this.service.touch(id, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a draft by id for the current user' })
  @ApiNoContentResponse()
  async remove(@Param('id') id: string, @CurrentUser() user: AuthUser): Promise<void> {
    await this.service.remove(id, user.id);
  }
}
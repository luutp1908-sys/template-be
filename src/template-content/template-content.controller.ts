import { Body, Controller, Delete, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateTemplateContentDto } from './dto/create-template-content.dto';
import { TemplateContentEntity } from './template-content.entity';
import { TemplateContentService } from './template-content.service';
import { AuthUser } from '../auth/types/auth-user.type';
import {
  TemplateContentFromDraftResponseDto,
  TemplateContentResponseDto,
} from './dto/template-content-response.dto';
import { UserDraftEntity } from '../user-draft/user-draft.entity';

@ApiTags('template-content')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'template-content', version: '1' })
export class TemplateContentController {
  constructor(private readonly service: TemplateContentService) {}

  private toTemplateContentResponse(entity: TemplateContentEntity): TemplateContentResponseDto {
    return {
      templateId: entity.templateId,
      content: entity.content,
    };
  }

  private toUserDraftResponse(draft: UserDraftEntity) {
    return {
      id: draft.id,
      userId: draft.userId,
      workspaceId: draft.workspaceId,
      templateId: draft.templateId,
      name: draft.name,
      thumbnail: draft.thumbnail,
      content: draft.content,
      createdAt: draft.createdAt,
      updatedAt: draft.updatedAt,
      lastOpenedAt: draft.lastOpenedAt,
    };
  }

  @Get(':templateId')
  @Public()
  @ApiOperation({ summary: 'Get template content by template id' })
  @ApiOkResponse({ type: Object })
  async findByTemplateId(@Param('templateId') templateId: string): Promise<TemplateContentResponseDto> {
    const entity = await this.service.findByTemplateId(templateId);
    return this.toTemplateContentResponse(entity);
  }

  @Get('from-draft/:draftId')
  @ApiOperation({ summary: 'Get merged template content from a user draft' })
  @ApiOkResponse({ type: Object })
  async findFromDraft(
    @Param('draftId') draftId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<TemplateContentFromDraftResponseDto> {
    const result = await this.service.findFromDraft(draftId, user.id);
    return {
      templateContent: result.templateContent
        ? this.toTemplateContentResponse(result.templateContent)
        : null,
      draft: this.toUserDraftResponse(result.draft),
    };
  }

  @Put(':templateId')
  @ApiOperation({ summary: 'Upsert template content by template id' })
  @ApiOkResponse({ type: Object })
  upsert(
    @Param('templateId') templateId: string,
    @Body() payload: CreateTemplateContentDto,
  ): Promise<TemplateContentResponseDto> {
    return this.service
      .upsert(templateId, payload)
      .then((entity) => this.toTemplateContentResponse(entity));
  }

  @Delete(':templateId')
  @ApiOperation({ summary: 'Delete template content by template id' })
  @ApiNoContentResponse()
  async remove(@Param('templateId') templateId: string): Promise<void> {
    await this.service.remove(templateId);
  }
}
import { Body, Controller, Delete, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateTemplateContentDto } from './dto/create-template-content.dto';
import { TemplateContentEntity } from './template-content.entity';
import { TemplateContentService } from './template-content.service';
import { AuthUser } from '../auth/types/auth-user.type';

@ApiTags('template-content')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'template-content', version: '1' })
export class TemplateContentController {
  constructor(private readonly service: TemplateContentService) {}

  @Get(':templateId')
  @Public()
  @ApiOperation({ summary: 'Get template content by template id' })
  @ApiOkResponse({ type: Object })
  findByTemplateId(@Param('templateId') templateId: string): Promise<TemplateContentEntity> {
    return this.service.findByTemplateId(templateId);
  }

  @Get('from-draft/:draftId')
  @ApiOperation({ summary: 'Get merged template content from a user draft' })
  @ApiOkResponse({ type: Object })
  findFromDraft(@Param('draftId') draftId: string, @CurrentUser() user: AuthUser): Promise<any> {
    return this.service.findFromDraft(draftId, user.id);
  }

  @Put(':templateId')
  @ApiOperation({ summary: 'Upsert template content by template id' })
  @ApiOkResponse({ type: Object })
  upsert(
    @Param('templateId') templateId: string,
    @Body() payload: CreateTemplateContentDto,
  ): Promise<TemplateContentEntity> {
    return this.service.upsert(templateId, payload);
  }

  @Delete(':templateId')
  @ApiOperation({ summary: 'Delete template content by template id' })
  @ApiNoContentResponse()
  async remove(@Param('templateId') templateId: string): Promise<void> {
    await this.service.remove(templateId);
  }
}
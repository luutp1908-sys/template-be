import { Body, Controller, Delete, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateTemplateContentDto } from './dto/create-template-content.dto';
import { TemplateContentEntity } from './template-content.entity';
import { TemplateContentService } from './template-content.service';

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
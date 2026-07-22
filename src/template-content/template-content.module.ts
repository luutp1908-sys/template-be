import { Module } from '@nestjs/common';
import { TemplateContentController } from './template-content.controller';
import { TemplateContentRepository } from './template-content.repository';
import { TemplateContentService } from './template-content.service';

@Module({
  controllers: [TemplateContentController],
  providers: [TemplateContentService, TemplateContentRepository],
  exports: [TemplateContentService],
})
export class TemplateContentModule {}
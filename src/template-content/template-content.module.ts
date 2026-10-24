import { Module } from '@nestjs/common';
import { TemplateContentController } from './template-content.controller';
import { TemplateContentRepository } from './template-content.repository.prisma';
import { TemplateContentService } from './template-content.service';
import { UserDraftModule } from '../user-draft/user-draft.module';
const TEMPLATE_CONTENT_REPOSITORY = 'TEMPLATE_CONTENT_REPOSITORY';

@Module({
  imports: [UserDraftModule],
  controllers: [TemplateContentController],
  providers: [
    TemplateContentService,
    { provide: TEMPLATE_CONTENT_REPOSITORY, useClass: TemplateContentRepository },
  ],
  exports: [TemplateContentService],
})
export class TemplateContentModule {}
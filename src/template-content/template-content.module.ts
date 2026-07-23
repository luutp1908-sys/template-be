import { Module } from '@nestjs/common';
import { TemplateContentController } from './template-content.controller';
import { TemplateContentService } from './template-content.service';

const impl = process.env.MOCK_MODE === 'true' || process.env.MOCK_MODE === '1'
  ? require('./template-content.repository.mock')
  : require('./template-content.repository.prisma');
const TEMPLATE_CONTENT_REPOSITORY = 'TEMPLATE_CONTENT_REPOSITORY';

@Module({
  controllers: [TemplateContentController],
  providers: [
    TemplateContentService,
    { provide: TEMPLATE_CONTENT_REPOSITORY, useClass: impl.TemplateContentRepository },
  ],
  exports: [TemplateContentService],
})
export class TemplateContentModule {}
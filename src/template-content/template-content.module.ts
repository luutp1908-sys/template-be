import { Module, forwardRef } from '@nestjs/common';
import { TemplateContentController } from './template-content.controller';
import { TemplateContentService } from './template-content.service';
import { UserDraftModule } from '../user-draft/user-draft.module';

const impl = process.env.MOCK_MODE === 'true' || process.env.MOCK_MODE === '1'
  ? require('./template-content.repository.mock')
  : require('./template-content.repository.prisma');
const TEMPLATE_CONTENT_REPOSITORY = 'TEMPLATE_CONTENT_REPOSITORY';

@Module({
  imports: [forwardRef(() => UserDraftModule)],
  controllers: [TemplateContentController],
  providers: [
    TemplateContentService,
    { provide: TEMPLATE_CONTENT_REPOSITORY, useClass: impl.TemplateContentRepository },
  ],
  exports: [TemplateContentService],
})
export class TemplateContentModule {}
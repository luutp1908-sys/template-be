import { Module } from '@nestjs/common';
import { TemplateController } from './template.controller';
import { TemplateService } from './template.service';

const impl = require('./template.repository');
console.log('[template.module] impl keys:', Object.keys(impl));
console.log('[template.module] TemplateRepository type:', impl.TemplateRepository && impl.TemplateRepository.name);
const TEMPLATE_REPOSITORY = 'TEMPLATE_REPOSITORY';

@Module({
  controllers: [TemplateController],
  providers: [
    TemplateService,
    { provide: TEMPLATE_REPOSITORY, useClass: impl.TemplateRepository },
  ],
  exports: [TemplateService],
})
export class TemplateModule {}

import { Module } from '@nestjs/common';
import { TemplateController } from './template.controller';
import { TemplateService } from './template.service';
import { TemplateRepository } from './template.data.repository';

@Module({
  controllers: [TemplateController],
  providers: [TemplateService, TemplateRepository],
  exports: [TemplateService],
})
export class TemplateModule {}

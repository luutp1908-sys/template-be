import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { LoggerModule } from 'nestjs-pino';
import { ExportController } from './export.controller';
import { ExportProcessor } from './export.processor';
import { ExportRepository } from './export.repository.prisma';
import { ExportService } from './export.service';
import { EXPORT_REPOSITORY } from './export.tokens';
import { WorkspaceModule } from '../workspace/workspace.module';
import { TemplateModule } from '../template/template.module';

@Module({
  imports: [
    LoggerModule.forRoot(),
    BullModule.registerQueue({ name: 'pdf-export' }),
    WorkspaceModule,
    TemplateModule,
  ],
  controllers: [ExportController],
  providers: [
    ExportService,
    ExportProcessor,
    { provide: EXPORT_REPOSITORY, useClass: ExportRepository },
  ],
  exports: [ExportService],
})
export class ExportModule {}

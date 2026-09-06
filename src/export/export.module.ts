import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ExportController } from './export.controller';
import { ExportProcessor } from './export.processor';
import { ExportService } from './export.service';
import { EXPORT_REPOSITORY } from './export.tokens';
import { WorkspaceModule } from '../workspace/workspace.module';
import { TemplateModule } from '../template/template.module';

const impl = process.env.MOCK_MODE === 'true' || process.env.MOCK_MODE === '1'
  ? require('./export.repository.mock')
  : require('./export.repository.prisma');

@Module({
  imports: [
    BullModule.registerQueue({ name: 'pdf-export' }),
    WorkspaceModule,
    TemplateModule,
  ],
  controllers: [ExportController],
  providers: [
    ExportService,
    ExportProcessor,
    { provide: EXPORT_REPOSITORY, useClass: impl.ExportRepository },
  ],
  exports: [ExportService],
})
export class ExportModule {}

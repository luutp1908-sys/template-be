import { Module } from '@nestjs/common';
import { BullModule, getQueueToken } from '@nestjs/bullmq';
import { ExportController } from './export.controller';
import { ExportProcessor } from './export.processor';
import { ExportService } from './export.service';
import { EXPORT_REPOSITORY } from './export.tokens';
import { WorkspaceModule } from '../workspace/workspace.module';
import { TemplateModule } from '../template/template.module';

const impl = process.env.MOCK_MODE === 'true' || process.env.MOCK_MODE === '1'
  ? require('./export.repository.mock')
  : require('./export.repository.prisma');
const isMock = process.env.MOCK_MODE === 'true' || process.env.MOCK_MODE === '1';

const queueImports = isMock ? [] : [BullModule.registerQueue({ name: 'pdf-export' })];
const queueProviders = isMock
  ? [{ provide: getQueueToken('pdf-export'), useValue: { add: async () => undefined } }]
  : [ExportProcessor];

@Module({
  imports: [
    ...queueImports,
    WorkspaceModule,
    TemplateModule,
  ],
  controllers: [ExportController],
  providers: [
    ExportService,
    ...queueProviders,
    { provide: EXPORT_REPOSITORY, useClass: impl.ExportRepository },
  ],
  exports: [ExportService],
})
export class ExportModule {}

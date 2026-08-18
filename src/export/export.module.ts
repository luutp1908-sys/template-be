import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ExportController } from './export.controller';
import { ExportProcessor } from './export.processor';
import { ExportService } from './export.service';

const impl = process.env.MOCK_MODE === 'true' || process.env.MOCK_MODE === '1'
  ? require('./export.repository.mock')
  : require('./export.repository.prisma');
const EXPORT_REPOSITORY = 'EXPORT_REPOSITORY';

@Module({
  imports: [BullModule.registerQueue({ name: 'pdf-export' })],
  controllers: [ExportController],
  providers: [
    ExportService,
    ExportProcessor,
    { provide: EXPORT_REPOSITORY, useClass: impl.ExportRepository },
  ],
  exports: [ExportService],
})
export class ExportModule {}

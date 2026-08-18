import { Module } from '@nestjs/common';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';

const impl = process.env.MOCK_MODE === 'true' || process.env.MOCK_MODE === '1'
  ? require('./export.repository.mock')
  : require('./export.repository.prisma');
const EXPORT_REPOSITORY = 'EXPORT_REPOSITORY';

@Module({
  controllers: [ExportController],
  providers: [
    ExportService,
    { provide: EXPORT_REPOSITORY, useClass: impl.ExportRepository },
  ],
  exports: [ExportService],
})
export class ExportModule {}

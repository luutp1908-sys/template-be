import { Module } from '@nestjs/common';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';
import { ExportRepository } from './export.repository';

@Module({
  controllers: [ExportController],
  providers: [ExportService, ExportRepository],
  exports: [ExportService],
})
export class ExportModule {}

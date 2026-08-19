import { Module } from '@nestjs/common';
import { ExportProxyController } from './export-proxy.controller';
import { ExportProxyService } from './export-proxy.service';

@Module({
  controllers: [ExportProxyController],
  providers: [ExportProxyService],
})
export class ExportProxyModule {}

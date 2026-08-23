import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MetricsService } from '../metrics/metrics.service';

@ApiTags('health')
@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  check(): { status: string } {
    return { status: 'ok' };
  }

  @Get('metrics')
  metrics() {
    return this.metricsService.snapshot();
  }
}

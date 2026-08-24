import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CacheService } from '../../cache/cache.service';
import { MetricsService } from '../metrics/metrics.service';

@ApiTags('health')
@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(
    private readonly metricsService: MetricsService,
    private readonly cacheService: CacheService,
  ) {}

  @Get()
  check(): { status: string } {
    return { status: 'ok' };
  }

  @Get('metrics')
  metrics() {
    return {
      ...this.metricsService.snapshot(),
      cache: this.cacheService.snapshot(),
    };
  }
}

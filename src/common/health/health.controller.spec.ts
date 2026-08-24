import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('exposes latency, error-rate, and saturation data through the metrics endpoint', () => {
    const controller = new HealthController(
      {
        snapshot: () => ({
          requestsTotal: 2,
          requestsByStatus: { '200': 1, '500': 1 },
          errorRate: 0.5,
          requestLatencyMs: {
            average: 250,
            p50: 200,
            p90: 300,
            p95: 400,
            max: 500,
            min: 100,
          },
          latencyBuckets: {
            '0-100': 1,
            '100-300': 0,
            '300-500': 1,
            '500-1000': 0,
            '1000+': 0,
          },
        }),
      } as any,
      {
        snapshot: () => ({
          hits: 10,
          misses: 2,
          sets: 6,
          deletes: 1,
          fallbackEvents: 1,
          backendAvailable: true,
          bypassEnabled: false,
          forceRefreshEnabled: false,
        }),
      } as any,
    );

    const result = controller.metrics();

    expect(result.errorRate).toBe(0.5);
    expect(result.requestLatencyMs.p95).toBe(400);
    expect(result.saturation).toMatchObject({
      cacheBackendAvailable: true,
      cacheFallbackEvents: 1,
      cacheBypassEnabled: false,
      cacheForceRefreshEnabled: false,
      isSaturated: true,
    });
  });
});

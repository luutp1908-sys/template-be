import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('exposes latency, error-rate, and saturation data through the metrics endpoint', async () => {
    const controller = new HealthController(
      {
        get: jest.fn(),
      } as any,
      {
        $queryRaw: jest.fn(),
      } as any,
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
      undefined,
    );

    const result = await controller.metrics();

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

  it('includes queue job counts and worker health in the metrics payload', async () => {
    const controller = new HealthController(
      { get: jest.fn() } as any,
      { $queryRaw: jest.fn() } as any,
      { snapshot: () => ({ requestsTotal: 0, requestsByStatus: {}, errorRate: 0, requestLatencyMs: { average: 0, p50: 0, p90: 0, p95: 0, max: 0, min: 0 }, latencyBuckets: { '0-100': 0, '100-300': 0, '300-500': 0, '500-1000': 0, '1000+': 0 } }) } as any,
      { snapshot: () => ({ hits: 0, misses: 0, sets: 0, deletes: 0, fallbackEvents: 0, backendAvailable: true, bypassEnabled: false, forceRefreshEnabled: false }) } as any,
      {
        checkReadiness: jest.fn().mockResolvedValue({
          required: true,
          enabled: true,
          healthy: true,
          status: 'ok',
          details: {
            queueName: 'pdf-export',
            jobCounts: { waiting: 2, active: 1, completed: 12, failed: 3, delayed: 1 },
            workers: [{ workerName: 'pdf-export', healthy: true, lastHeartbeatAt: '2026-09-12T00:00:00.000Z', ageMs: 5000 }],
            staleAfterMs: 90000,
          },
        }),
      } as any,
    );

    const result = await controller.metrics();

    expect(result.queue).toMatchObject({
      required: true,
      enabled: true,
      healthy: true,
      status: 'ok',
      details: {
        queueName: 'pdf-export',
        jobCounts: { waiting: 2, active: 1, completed: 12, failed: 3, delayed: 1 },
      },
    });
  });
});

import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  it('calculates latency buckets and error rate from recorded requests', () => {
    const service = new MetricsService();

    service.recordRequest(200, 50);
    service.recordRequest(200, 220);
    service.recordRequest(500, 600);
    service.recordRequest(503, 1200);

    const snapshot = service.snapshot();

    expect(snapshot.requestsTotal).toBe(4);
    expect(snapshot.requestsByStatus['200']).toBe(2);
    expect(snapshot.requestsByStatus['500']).toBe(1);
    expect(snapshot.requestsByStatus['503']).toBe(1);
    expect(snapshot.errorRate).toBe(0.5);
    expect(snapshot.requestLatencyMs.p50).toBeGreaterThanOrEqual(220);
    expect(snapshot.requestLatencyMs.p95).toBeGreaterThanOrEqual(600);
    expect(snapshot.latencyBuckets['0-100']).toBe(1);
    expect(snapshot.latencyBuckets['100-300']).toBe(1);
    expect(snapshot.latencyBuckets['500-1000']).toBe(1);
    expect(snapshot.latencyBuckets['1000+']).toBe(1);
  });

  it('returns zeroed metrics when no requests have been recorded yet', () => {
    const service = new MetricsService();
    const snapshot = service.snapshot();

    expect(snapshot.requestsTotal).toBe(0);
    expect(snapshot.errorRate).toBe(0);
    expect(snapshot.requestLatencyMs.average).toBe(0);
    expect(snapshot.requestLatencyMs.p95).toBe(0);
    expect(snapshot.latencyBuckets['0-100']).toBe(0);
  });
});

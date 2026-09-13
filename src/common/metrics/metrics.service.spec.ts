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

  it('tracks queue backlog and failure signals in the exported metrics', () => {
    const service = new MetricsService();

    service.recordQueueHealth({
      required: true,
      enabled: true,
      healthy: false,
      status: 'degraded',
      details: {
        queueName: 'pdf-export',
        jobCounts: {
          waiting: 30,
          active: 2,
          completed: 30,
          failed: 8,
          delayed: 12,
        },
        workers: [
          {
            workerName: 'pdf-export',
            healthy: false,
            lastHeartbeatAt: '2026-09-12T00:00:00.000Z',
            ageMs: 120000,
          },
        ],
        staleAfterMs: 90000,
      },
    } as any);

    const snapshot = service.snapshot();

    expect(snapshot.queue.backlog.waiting).toBe(30);
    expect(snapshot.queue.backlog.delayed).toBe(12);
    expect(snapshot.queue.failures.failedJobs).toBe(8);
    expect(snapshot.queue.workers.healthy).toBe(false);
    expect(snapshot.queue.workers.staleCount).toBe(1);
    expect(snapshot.queue.alerts.workerHeartbeatStale).toBe(true);
    expect(snapshot.queue.alerts.backlogGrowth).toBe(true);
    expect(snapshot.queue.alerts.repeatedQueueFailures).toBe(true);
    expect(snapshot.queue.alerts.redisConnectivityDegraded).toBe(true);
  });

  it('exposes Prometheus-compatible metrics for scraping', () => {
    const service = new MetricsService();

    service.recordRequest(200, 45);
    service.recordQueueHealth({
      healthy: true,
      status: 'ok',
      details: {
        jobCounts: {
          waiting: 3,
          active: 1,
          delayed: 0,
          failed: 2,
        },
        workers: [{ healthy: true, ageMs: 1000 }],
      },
    } as any);

    const metrics = service.getPrometheusMetrics();

    expect(metrics).toContain('# HELP');
    expect(metrics).toContain('http_requests_total');
    expect(metrics).toContain('queue_waiting_jobs');
    expect(metrics).toContain('queue_failed_jobs');
  });

  it('includes grouped exception counts for HTTP 4xx and 5xx errors', () => {
    const service = new MetricsService();

    service.recordRequest(400, 120);
    service.recordRequest(401, 180);
    service.recordRequest(500, 220);
    service.recordRequest(503, 260);

    const metrics = service.getPrometheusMetrics();

    expect(metrics).toContain('http_exceptions_total{status_class="4xx"} 2');
    expect(metrics).toContain('http_exceptions_total{status_class="5xx"} 2');
    expect(metrics).toContain('http_exceptions_total{status_code="500"} 1');
  });

  it('exposes queue depth, retry, and failure metrics for scrape consumers', () => {
    const service = new MetricsService();

    service.recordQueueHealth({
      healthy: true,
      status: 'ok',
      details: {
        jobCounts: {
          waiting: 4,
          active: 2,
          delayed: 1,
          failed: 3,
        },
        workers: [{ healthy: true, ageMs: 1000 }],
      },
    } as any);

    const metrics = service.getPrometheusMetrics();

    expect(metrics).toContain('queue_depth_total 7');
    expect(metrics).toContain('queue_failed_jobs 3');
    expect(metrics).toContain('queue_retryable_jobs 3');
    expect(metrics).toContain('queue_enqueued_jobs_total 10');
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

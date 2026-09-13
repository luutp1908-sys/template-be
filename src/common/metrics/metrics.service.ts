import { Injectable } from '@nestjs/common';

export interface QueueAlertSnapshot {
  workerHeartbeatStale: boolean;
  backlogGrowth: boolean;
  repeatedQueueFailures: boolean;
  redisConnectivityDegraded: boolean;
}

export interface RequestMetricSnapshot {
  requestsTotal: number;
  requestsByStatus: Record<string, number>;
  errorRate: number;
  requestLatencyMs: {
    average: number;
    p50: number;
    p90: number;
    p95: number;
    max: number;
    min: number;
  };
  latencyBuckets: Record<string, number>;
  queue: {
    backlog: {
      waiting: number;
      active: number;
      delayed: number;
      total: number;
    };
    failures: {
      failedJobs: number;
      retryable: number;
      terminal: number;
    };
    workers: {
      total: number;
      healthy: boolean;
      staleCount: number;
    };
    alerts: QueueAlertSnapshot;
  };
}

@Injectable()
export class MetricsService {
  private readonly latencies: number[] = [];
  private readonly statusCounts: Record<string, number> = {};
  private readonly latencyBuckets: Record<string, number> = {
    '0-100': 0,
    '100-300': 0,
    '300-500': 0,
    '500-1000': 0,
    '1000+': 0,
  };
  private readonly alertThresholds = {
    backlogGrowth: 20,
    repeatedQueueFailures: 5,
    staleAfterMs: 90_000,
  };
  private requestsTotal = 0;
  private queueSnapshot = {
    backlog: {
      waiting: 0,
      active: 0,
      delayed: 0,
      total: 0,
    },
    failures: {
      failedJobs: 0,
      retryable: 0,
      terminal: 0,
    },
    workers: {
      total: 0,
      healthy: true,
      staleCount: 0,
    },
    alerts: {
      workerHeartbeatStale: false,
      backlogGrowth: false,
      repeatedQueueFailures: false,
      redisConnectivityDegraded: false,
    },
  };

  recordRequest(statusCode: number, durationMs: number): void {
    this.requestsTotal += 1;
    this.statusCounts[String(statusCode)] = (this.statusCounts[String(statusCode)] ?? 0) + 1;
    this.latencies.push(durationMs);

    if (durationMs < 100) {
      this.latencyBuckets['0-100'] += 1;
    } else if (durationMs < 300) {
      this.latencyBuckets['100-300'] += 1;
    } else if (durationMs < 500) {
      this.latencyBuckets['300-500'] += 1;
    } else if (durationMs < 1000) {
      this.latencyBuckets['500-1000'] += 1;
    } else {
      this.latencyBuckets['1000+'] += 1;
    }
  }

  recordQueueHealth(health: {
    healthy?: boolean;
    status?: string;
    details?: {
      jobCounts?: Record<string, number>;
      workers?: Array<{ healthy?: boolean; ageMs?: number }>;
      staleAfterMs?: number;
    };
  }): void {
    const jobCounts = health.details?.jobCounts ?? {};
    const workers = health.details?.workers ?? [];
    const staleAfterMs = Number(health.details?.staleAfterMs ?? this.alertThresholds.staleAfterMs);
    const waiting = Number(jobCounts.waiting ?? 0);
    const active = Number(jobCounts.active ?? 0);
    const delayed = Number(jobCounts.delayed ?? 0);
    const failedJobs = Number(jobCounts.failed ?? 0);
    const workerHeartbeatStale = workers.some((worker) => {
      const ageMs = Number(worker.ageMs ?? 0);
      return worker.healthy === false || ageMs > staleAfterMs;
    });
    const backlogGrowth = waiting + delayed > this.alertThresholds.backlogGrowth;
    const repeatedQueueFailures = failedJobs > this.alertThresholds.repeatedQueueFailures;
    const redisConnectivityDegraded = health.status === 'degraded' || health.healthy === false;

    this.queueSnapshot = {
      backlog: {
        waiting,
        active,
        delayed,
        total: waiting + active + delayed,
      },
      failures: {
        failedJobs,
        retryable: failedJobs,
        terminal: failedJobs,
      },
      workers: {
        total: workers.length,
        healthy: health.healthy ?? workers.every((worker) => worker.healthy !== false),
        staleCount: workers.filter((worker) => worker.healthy === false || Number(worker.ageMs ?? 0) > staleAfterMs).length,
      },
      alerts: {
        workerHeartbeatStale,
        backlogGrowth,
        repeatedQueueFailures,
        redisConnectivityDegraded,
      },
    };
  }

  snapshot(): RequestMetricSnapshot {
    const latencies = [...this.latencies].sort((a, b) => a - b);
    const p50Index = Math.max(0, Math.ceil(latencies.length * 0.5) - 1);
    const p90Index = Math.max(0, Math.ceil(latencies.length * 0.9) - 1);
    const p95Index = Math.max(0, Math.ceil(latencies.length * 0.95) - 1);
    const p50 = latencies[p50Index] ?? 0;
    const p90 = latencies[p90Index] ?? 0;
    const p95 = latencies[p95Index] ?? 0;
    const average = latencies.length > 0 ? latencies.reduce((sum, value) => sum + value, 0) / latencies.length : 0;
    const min = latencies[0] ?? 0;
    const max = latencies[latencies.length - 1] ?? 0;
    const errorCount = Object.entries(this.statusCounts).reduce((total, [status, count]) => {
      const code = Number(status);
      return total + (code >= 400 ? count : 0);
    }, 0);
    const errorRate = this.requestsTotal > 0 ? errorCount / this.requestsTotal : 0;

    return {
      requestsTotal: this.requestsTotal,
      requestsByStatus: { ...this.statusCounts },
      errorRate,
      requestLatencyMs: {
        average,
        p50,
        p90,
        p95,
        max,
        min,
      },
      latencyBuckets: { ...this.latencyBuckets },
      queue: {
        backlog: { ...this.queueSnapshot.backlog },
        failures: { ...this.queueSnapshot.failures },
        workers: { ...this.queueSnapshot.workers },
        alerts: { ...this.queueSnapshot.alerts },
      },
    };
  }

  getPrometheusMetrics(): string {
    const { requestsByStatus, requestLatencyMs, queue } = this.snapshot();
    const latencyBucketLines = [
      ['0-100', this.latencyBuckets['0-100']],
      ['100-300', this.latencyBuckets['100-300']],
      ['300-500', this.latencyBuckets['300-500']],
      ['500-1000', this.latencyBuckets['500-1000']],
      ['1000+', this.latencyBuckets['1000+']],
    ];
    const latencySum = this.latencies.reduce((sum, value) => sum + value, 0);

    const lines: string[] = [
      '# HELP http_requests_total Total number of HTTP requests by status code.',
      '# TYPE http_requests_total counter',
      ...Object.entries(requestsByStatus).map(([status, count]) => `http_requests_total{status="${status}"} ${count}`),
      '',
      '# HELP http_request_duration_ms HTTP request latency in milliseconds.',
      '# TYPE http_request_duration_ms histogram',
      ...latencyBucketLines.map(([bucket, count]) => `http_request_duration_ms_bucket{le="${bucket}"} ${count}`),
      `http_request_duration_ms_sum ${latencySum}`,
      `http_request_duration_ms_count ${this.requestsTotal}`,
      '',
      '# HELP queue_waiting_jobs Current number of waiting jobs.',
      '# TYPE queue_waiting_jobs gauge',
      `queue_waiting_jobs ${queue.backlog.waiting}`,
      '',
      '# HELP queue_delayed_jobs Current number of delayed jobs.',
      '# TYPE queue_delayed_jobs gauge',
      `queue_delayed_jobs ${queue.backlog.delayed}`,
      '',
      '# HELP queue_active_jobs Current number of active jobs.',
      '# TYPE queue_active_jobs gauge',
      `queue_active_jobs ${queue.backlog.active}`,
      '',
      '# HELP queue_failed_jobs Current number of failed jobs.',
      '# TYPE queue_failed_jobs gauge',
      `queue_failed_jobs ${queue.failures.failedJobs}`,
      '',
      '# HELP queue_workers_stale_count Number of stale workers.',
      '# TYPE queue_workers_stale_count gauge',
      `queue_workers_stale_count ${queue.workers.staleCount}`,
      '',
      '# HELP queue_worker_heartbeat_stale Alert when the worker heartbeat is stale.',
      '# TYPE queue_worker_heartbeat_stale gauge',
      `queue_worker_heartbeat_stale ${Number(queue.alerts.workerHeartbeatStale)}`,
      '',
      '# HELP queue_backlog_growth_alert Alert when backlog exceeds configured threshold.',
      '# TYPE queue_backlog_growth_alert gauge',
      `queue_backlog_growth_alert ${Number(queue.alerts.backlogGrowth)}`,
      '',
      '# HELP queue_repeated_failures_alert Alert when repeated queue failures exceed threshold.',
      '# TYPE queue_repeated_failures_alert gauge',
      `queue_repeated_failures_alert ${Number(queue.alerts.repeatedQueueFailures)}`,
      '',
      '# HELP queue_redis_degraded_alert Alert when Redis connectivity is degraded.',
      '# TYPE queue_redis_degraded_alert gauge',
      `queue_redis_degraded_alert ${Number(queue.alerts.redisConnectivityDegraded)}`,
      '',
      '# HELP http_request_latency_ms Average and percentile latency values.',
      '# TYPE http_request_latency_ms gauge',
      `http_request_latency_ms_average ${requestLatencyMs.average}`,
      `http_request_latency_ms_p50 ${requestLatencyMs.p50}`,
      `http_request_latency_ms_p90 ${requestLatencyMs.p90}`,
      `http_request_latency_ms_p95 ${requestLatencyMs.p95}`,
      `http_request_latency_ms_max ${requestLatencyMs.max}`,
      `http_request_latency_ms_min ${requestLatencyMs.min}`,
    ];

    return `${lines.join('\n')}\n`;
  }
}

import { Injectable } from '@nestjs/common';

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
    details?: {
      jobCounts?: Record<string, number>;
      workers?: Array<{ healthy?: boolean }>;
    };
  }): void {
    const jobCounts = health.details?.jobCounts ?? {};
    const workers = health.details?.workers ?? [];
    const waiting = Number(jobCounts.waiting ?? 0);
    const active = Number(jobCounts.active ?? 0);
    const delayed = Number(jobCounts.delayed ?? 0);
    const failedJobs = Number(jobCounts.failed ?? 0);

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
        staleCount: workers.filter((worker) => worker.healthy === false).length,
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
      },
    };
  }
}

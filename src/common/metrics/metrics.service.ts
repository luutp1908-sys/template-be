import { Injectable } from '@nestjs/common';

export interface RequestMetricSnapshot {
  requestsTotal: number;
  requestsByStatus: Record<string, number>;
  requestLatencyMs: {
    average: number;
    p95: number;
  };
}

@Injectable()
export class MetricsService {
  private readonly latencies: number[] = [];
  private readonly statusCounts: Record<string, number> = {};
  private requestsTotal = 0;

  recordRequest(statusCode: number, durationMs: number): void {
    this.requestsTotal += 1;
    this.statusCounts[String(statusCode)] = (this.statusCounts[String(statusCode)] ?? 0) + 1;
    this.latencies.push(durationMs);
  }

  snapshot(): RequestMetricSnapshot {
    const latencies = [...this.latencies].sort((a, b) => a - b);
    const p95Index = Math.max(0, Math.ceil(latencies.length * 0.95) - 1);
    const p95 = latencies[p95Index] ?? 0;
    const average = latencies.length > 0 ? latencies.reduce((sum, value) => sum + value, 0) / latencies.length : 0;

    return {
      requestsTotal: this.requestsTotal,
      requestsByStatus: { ...this.statusCounts },
      requestLatencyMs: {
        average,
        p95,
      },
    };
  }
}

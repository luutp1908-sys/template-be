import * as otel from '@opentelemetry/api';
import { CacheService } from '../cache.service';

jest.mock('@opentelemetry/api', () => {
  const span = {
    setAttributes: jest.fn(),
    setStatus: jest.fn(),
    end: jest.fn(),
  };

  return {
    trace: {
      getTracer: jest.fn(() => ({
        startSpan: jest.fn(() => span),
      })),
    },
    SpanKind: { CLIENT: 3 },
    SpanStatusCode: { OK: 1, ERROR: 2 },
  };
});

describe('CacheService metrics', () => {
  const logger = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as any;

  it('creates Redis client spans for cache operations and records success status', async () => {
    const span = {
      setAttributes: jest.fn(),
      setStatus: jest.fn(),
      end: jest.fn(),
    };
    const tracer = { startSpan: jest.fn(() => span) };
    (otel.trace.getTracer as jest.Mock).mockReturnValue(tracer);

    const configService = {
      get: jest.fn((key: string, defaultValue: unknown) => defaultValue),
    } as any;

    const client = {
      get: jest.fn().mockResolvedValue(JSON.stringify({ id: 'abc' })),
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      scan: jest.fn(),
      isOpen: true,
    };

    const service = new CacheService(configService, logger);
    (service as any).client = client;
    (service as any).isAvailable = true;

    await service.getJson('user:1');
    await service.setJson('user:2', { id: 'def' }, 3000);

    expect(otel.trace.getTracer).toHaveBeenCalledWith('be.redis');
    expect(tracer.startSpan).toHaveBeenCalledWith(
      'redis.get',
      expect.objectContaining({
        kind: 3,
        attributes: expect.objectContaining({
          'db.system': 'redis',
          'db.operation': 'get',
        }),
      }),
    );
    expect(span.setStatus).toHaveBeenCalledWith(expect.objectContaining({ code: 1 }));
  });

  it('tracks cache hits, misses, sets, and deletes in the shared cache layer', async () => {
    const configService = {
      get: jest.fn((key: string, defaultValue: unknown) => defaultValue),
    } as any;

    const client = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      scan: jest.fn(),
      isOpen: true,
    };

    const service = new CacheService(configService, logger);
    (service as any).client = client;
    (service as any).isAvailable = true;

    client.get.mockResolvedValueOnce(JSON.stringify({ id: 'abc' }));
    await service.getJson('user:1');

    client.get.mockResolvedValueOnce(null);
    await service.getJson('user:2');

    await service.setJson('user:3', { id: 'def' }, 3000);
    await service.delete('user:3');

    const snapshot = service.snapshot();

    expect(snapshot.hits).toBe(1);
    expect(snapshot.misses).toBe(1);
    expect(snapshot.sets).toBe(1);
    expect(snapshot.deletes).toBe(1);
  });

  it('bypasses cache reads when the operator flag is enabled', async () => {
    const configService = {
      get: jest.fn((key: string, defaultValue: unknown) => {
        if (key === 'cache.bypass') return true;
        if (key === 'cache.forceRefresh') return false;
        return defaultValue;
      }),
    } as any;

    const client = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      scan: jest.fn(),
      isOpen: true,
    };

    const service = new CacheService(configService, logger);
    (service as any).client = client;
    (service as any).isAvailable = true;

    const result = await service.getJson('user:1');

    expect(result).toBeNull();
    expect(client.get).not.toHaveBeenCalled();
    expect(client.del).not.toHaveBeenCalled();
    expect(service.snapshot().bypassEnabled).toBe(true);
    expect(service.snapshot().misses).toBe(1);
  });

  it('evicts the stale key when a force refresh is requested', async () => {
    const configService = {
      get: jest.fn((key: string, defaultValue: unknown) => {
        if (key === 'cache.bypass') return false;
        if (key === 'cache.forceRefresh') return true;
        return defaultValue;
      }),
    } as any;

    const client = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn().mockResolvedValue(1),
      scan: jest.fn(),
      isOpen: true,
    };

    const service = new CacheService(configService, logger);
    (service as any).client = client;
    (service as any).isAvailable = true;

    const result = await service.getJson('user:1');

    expect(result).toBeNull();
    expect(client.del).toHaveBeenCalledWith('template-saas:user:1');
    expect(service.snapshot().forceRefreshEnabled).toBe(true);
    expect(service.snapshot().misses).toBe(1);
  });

  it('falls back gracefully when the cache backend is unavailable', async () => {
    const configService = {
      get: jest.fn((key: string, defaultValue: unknown) => defaultValue),
    } as any;

    const service = new CacheService(configService, logger);
    (service as any).client = null;
    (service as any).isAvailable = false;

    const result = await service.getJson('user:1');

    expect(result).toBeNull();
    expect(service.snapshot().fallbackEvents).toBeGreaterThan(0);
    expect(service.snapshot().misses).toBe(1);
  });
});

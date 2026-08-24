import { CacheService } from '../cache.service';

describe('CacheService metrics', () => {
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

    const service = new CacheService(configService);
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
});

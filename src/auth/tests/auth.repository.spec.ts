import { AuthRepository } from '../auth.repository.prisma';
import { CacheService } from '../../cache/cache.service';

describe('AuthRepository cache', () => {
  it('returns a cached auth user context without re-querying Prisma', async () => {
    const prisma = {
      user: {
        findFirst: jest.fn(),
      },
    };

    const configService = {
      get: jest.fn((key: string, defaultValue?: unknown) => {
        const map: Record<string, unknown> = {
          'cache.ttlMs.authUser': 60000,
        };

        return key in map ? map[key] : defaultValue;
      }),
    };

    const cacheService = {
      getJson: jest.fn().mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        displayName: 'User',
        roles: ['user'],
        permissions: ['template:read'],
      }),
      setJson: jest.fn(),
      delete: jest.fn(),
    } as unknown as CacheService;

    const repository = new AuthRepository(prisma as any, configService as any, cacheService as any);

    const result = await repository.findAuthUserById('user-1');

    expect(result).toEqual({
      id: 'user-1',
      email: 'user@example.com',
      displayName: 'User',
      roles: ['user'],
      permissions: ['template:read'],
    });
    expect(cacheService.getJson).toHaveBeenCalledWith('auth:user:user-1');
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
  });
});

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

  it('returns null when auth user is missing and cache is empty', async () => {
    const prisma = {
      user: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };

    const configService = {
      get: jest.fn((_: string, defaultValue?: unknown) => defaultValue),
    };

    const cacheService = {
      getJson: jest.fn().mockResolvedValue(null),
      setJson: jest.fn(),
      delete: jest.fn(),
    } as unknown as CacheService;

    const repository = new AuthRepository(prisma as any, configService as any, cacheService as any);

    await expect(repository.findAuthUserById('missing-user')).resolves.toBeNull();
  });

  it('returns null when user lookup by email misses', async () => {
    const prisma = {
      user: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };

    const configService = {
      get: jest.fn((_: string, defaultValue?: unknown) => defaultValue),
    };

    const repository = new AuthRepository(prisma as any, configService as any);

    await expect(repository.findUserByEmail('missing@example.com')).resolves.toBeNull();
  });

  it('returns null when user lookup by id misses', async () => {
    const prisma = {
      user: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };

    const configService = {
      get: jest.fn((_: string, defaultValue?: unknown) => defaultValue),
    };

    const repository = new AuthRepository(prisma as any, configService as any);

    await expect(repository.findUserById('missing-user')).resolves.toBeNull();
  });

  it('maps duplicate email writes to the shared conflict message', async () => {
    const error = new Error('duplicate') as Error & { code?: string };
    error.code = 'P2002';
    const prisma: any = {
      user: {
        create: jest.fn().mockRejectedValue(error),
      },
      role: {
        findFirst: jest.fn(),
      },
      userRole: {
        create: jest.fn(),
      },
    };
    prisma.$transaction = jest.fn(async (callback: any) => callback(prisma));

    const configService = {
      get: jest.fn((_: string, defaultValue?: unknown) => defaultValue),
    };

    const repository = new AuthRepository(prisma as any, configService as any);

    await expect(
      repository.createUser({ email: 'user@example.com', password: 'secret' } as any, 'hash'),
    ).rejects.toMatchObject({ message: 'Email already registered' });
  });
});

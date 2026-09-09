import { UserRepository } from '../user.repository';

describe('UserRepository', () => {
  it('returns null when user by id is missing', async () => {
    const prisma = {
      user: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };

    const repository = new UserRepository(prisma as any);

    await expect(repository.findById('missing-user')).resolves.toBeNull();
  });

  it('returns null when user by email is missing', async () => {
    const prisma = {
      user: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };

    const repository = new UserRepository(prisma as any);

    await expect(repository.findByEmail('missing@example.com')).resolves.toBeNull();
  });

  it('returns null when user credentials are missing', async () => {
    const prisma = {
      user: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };

    const repository = new UserRepository(prisma as any);

    await expect(repository.findCredentialsById('missing-user')).resolves.toBeNull();
  });

  it('returns null when user profile is missing', async () => {
    const prisma = {
      user: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };

    const repository = new UserRepository(prisma as any);

    await expect(repository.getProfile('missing-user')).resolves.toBeNull();
  });

  it('maps duplicate user writes to the shared email conflict message', async () => {
    const error = new Error('duplicate') as Error & { code?: string };
    error.code = 'P2002';
    const prisma = {
      user: {
        create: jest.fn().mockRejectedValue(error),
      },
    };

    const repository = new UserRepository(prisma as any);

    await expect(
      repository.create({ email: 'user@example.com', passwordHash: 'hash' } as any),
    ).rejects.toMatchObject({ message: 'Email already registered' });
  });
});

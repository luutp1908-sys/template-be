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

  it('returns mapped users for successful queries', async () => {
    const createdAt = new Date('2024-01-01T00:00:00.000Z');
    const updatedAt = new Date('2024-01-02T00:00:00.000Z');
    const prisma = {
      user: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'user-123',
          email: 'user@example.com',
          displayName: 'Example User',
          avatarUrl: 'https://example.com/avatar.png',
          passwordHash: 'hash-123',
          createdAt,
          updatedAt,
        }),
      },
    };

    const repository = new UserRepository(prisma as any);

    await expect(repository.findById('user-123')).resolves.toEqual({
      id: 'user-123',
      createdAt,
      updatedAt,
    });
    await expect(repository.findByEmail('USER@EXAMPLE.COM')).resolves.toMatchObject({
      id: 'user-123',
      email: 'user@example.com',
      displayName: 'Example User',
    });
    await expect(repository.findCredentialsById('user-123')).resolves.toEqual({
      id: 'user-123',
      passwordHash: 'hash-123',
    });
    await expect(repository.getProfile('user-123')).resolves.toMatchObject({
      id: 'user-123',
      email: 'user@example.com',
      avatarUrl: 'https://example.com/avatar.png',
    });
  });

  it('creates a user and returns the mapped entity', async () => {
    const createdAt = new Date('2024-03-01T00:00:00.000Z');
    const updatedAt = new Date('2024-03-02T00:00:00.000Z');
    const prisma = {
      user: {
        create: jest.fn().mockResolvedValue({
          id: 'user-456',
          createdAt,
          updatedAt,
        }),
      },
    };

    const repository = new UserRepository(prisma as any);

    await expect(
      repository.create({
        email: 'new-user@example.com',
        passwordHash: 'hash-456',
        displayName: 'New User',
      }),
    ).resolves.toEqual({
      id: 'user-456',
      createdAt,
      updatedAt,
    });
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        email: 'new-user@example.com',
        passwordHash: 'hash-456',
        displayName: 'New User',
      },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  });

  it('uses the correct Prisma arguments for queries and creation', async () => {
    const prisma = {
      user: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: 'user-789',
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      },
    };

    const repository = new UserRepository(prisma as any);

    await repository.findById('user-789');
    expect(prisma.user.findFirst).toHaveBeenLastCalledWith({
      where: { id: 'user-789', deletedAt: null },
      select: { id: true, createdAt: true, updatedAt: true },
    });

    await repository.findByEmail('User@Example.com');
    expect(prisma.user.findFirst).toHaveBeenLastCalledWith({
      where: { email: 'user@example.com', deletedAt: null },
      select: {
        id: true,
        email: true,
        displayName: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await repository.findCredentialsById('user-789');
    expect(prisma.user.findFirst).toHaveBeenLastCalledWith({
      where: { id: 'user-789', deletedAt: null },
      select: { id: true, passwordHash: true },
    });

    await repository.getProfile('user-789');
    expect(prisma.user.findFirst).toHaveBeenLastCalledWith({
      where: { id: 'user-789', deletedAt: null },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await repository.create({
      email: 'new@example.com',
      passwordHash: 'abc',
      displayName: 'Demo User',
    });
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        email: 'new@example.com',
        passwordHash: 'abc',
        displayName: 'Demo User',
      },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  });

  it('transforms repository results into the expected entity and credential shapes', async () => {
    const createdAt = new Date('2024-05-01T00:00:00.000Z');
    const updatedAt = new Date('2024-05-02T00:00:00.000Z');
    const prisma = {
      user: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({
            id: 'user-1',
            createdAt,
            updatedAt,
          })
          .mockResolvedValueOnce({
            id: 'user-2',
            email: 'USER@EXAMPLE.COM',
            displayName: 'Example',
            passwordHash: 'hash-2',
            createdAt,
            updatedAt,
          })
          .mockResolvedValueOnce({
            id: 'user-3',
            passwordHash: 'hash-3',
          })
          .mockResolvedValueOnce({
            id: 'user-4',
            email: 'profile@example.com',
            displayName: 'Profile User',
            avatarUrl: 'https://example.com/profile.png',
            createdAt,
            updatedAt,
          }),
      },
    };

    const repository = new UserRepository(prisma as any);

    await expect(repository.findById('user-1')).resolves.toEqual({
      id: 'user-1',
      createdAt,
      updatedAt,
    });
    await expect(repository.findByEmail('user@example.com')).resolves.toMatchObject({
      id: 'user-2',
      email: 'USER@EXAMPLE.COM',
      displayName: 'Example',
    });
    await expect(repository.findCredentialsById('user-3')).resolves.toEqual({
      id: 'user-3',
      passwordHash: 'hash-3',
    });
    await expect(repository.getProfile('user-4')).resolves.toMatchObject({
      id: 'user-4',
      email: 'profile@example.com',
      displayName: 'Profile User',
      avatarUrl: 'https://example.com/profile.png',
    });
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

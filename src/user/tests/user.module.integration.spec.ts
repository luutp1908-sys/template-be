import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from '../../cache/cache.service';
import { UserRepository } from '../user.repository';
import { UserService } from '../user.service';

describe('UserModule integration', () => {
  let moduleRef: TestingModule;
  let service: UserService;

  const repository = {
    create: jest.fn(),
    findById: jest.fn(),
    findByEmail: jest.fn(),
    findCredentialsById: jest.fn(),
    getProfile: jest.fn(),
    updateProfile: jest.fn(),
    updatePasswordHash: jest.fn(),
  };

  const cacheService = {
    delete: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    moduleRef = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: UserRepository, useValue: repository },
        { provide: CacheService, useValue: cacheService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, fallback?: unknown) => {
              if (key === 'security.bcryptSaltRounds') {
                return 12;
              }
              return fallback;
            }),
          },
        },
      ],
    }).compile();

    service = moduleRef.get<UserService>(UserService);
  });

  it('should resolve the UserService from the module and use the repository', async () => {
    repository.getProfile.mockResolvedValue({
      id: 'user-123',
      email: 'user@example.com',
      displayName: 'Example User',
    });

    await expect(service.getProfile('user-123')).resolves.toMatchObject({
      id: 'user-123',
      email: 'user@example.com',
    });

    expect(repository.getProfile).toHaveBeenCalledWith('user-123');
  });

  it('should update the profile through the module wiring and clear the cache', async () => {
    repository.updateProfile.mockResolvedValue({
      id: 'user-123',
      displayName: 'Updated User',
      avatarUrl: 'https://example.com/avatar.png',
    });

    await expect(
      service.updateProfile('user-123', {
        displayName: 'Updated User',
        avatarUrl: 'https://example.com/avatar.png',
      }),
    ).resolves.toMatchObject({
      id: 'user-123',
      displayName: 'Updated User',
      avatarUrl: 'https://example.com/avatar.png',
    });

    expect(repository.updateProfile).toHaveBeenCalledWith('user-123', {
      displayName: 'Updated User',
      avatarUrl: 'https://example.com/avatar.png',
    });
    expect(cacheService.delete).toHaveBeenCalledWith('auth:user:user-123');
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../../cache/cache.service';
import { UserService } from '../user.service';
import { UserRepository } from '../user.repository';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('UserService', () => {
  let service: UserService;
  let repository: {
    create: jest.Mock;
    findById: jest.Mock;
    findByEmail: jest.Mock;
    findCredentialsById: jest.Mock;
    getProfile: jest.Mock;
    updateProfile: jest.Mock;
    updatePasswordHash: jest.Mock;
  };
  const configService = {
    get: jest.fn((key: string, fallback?: unknown) => {
      if (key === 'security.bcryptSaltRounds') {
        return 12;
      }
      return fallback;
    }),
  };
  const cacheService = {
    delete: jest.fn(),
  };

  beforeEach(async () => {
    repository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findCredentialsById: jest.fn(),
      getProfile: jest.fn(),
      updateProfile: jest.fn(),
      updatePasswordHash: jest.fn(),
    };

    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-value');
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    cacheService.delete.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: UserRepository,
          useValue: repository,
        },
        { provide: ConfigService, useValue: configService },
        { provide: CacheService, useValue: cacheService },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should get a user profile', async () => {
    repository.getProfile.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      displayName: 'User',
      avatarUrl: null,
    });

    await expect(service.getProfile('user-1')).resolves.toMatchObject({
      id: 'user-1',
      displayName: 'User',
    });
  });

  it('should update profile data', async () => {
    repository.updateProfile.mockResolvedValue({
      id: 'user-1',
      displayName: 'Updated User',
      avatarUrl: 'https://cdn.example.com/avatar.png',
    });

    await expect(
      service.updateProfile('user-1', {
        displayName: 'Updated User',
        avatarUrl: 'https://cdn.example.com/avatar.png',
      }),
    ).resolves.toMatchObject({
      displayName: 'Updated User',
      avatarUrl: 'https://cdn.example.com/avatar.png',
    });

    expect(repository.updateProfile).toHaveBeenCalledWith('user-1', {
      displayName: 'Updated User',
      avatarUrl: 'https://cdn.example.com/avatar.png',
    });
  });

  it('should change a password', async () => {
    repository.findCredentialsById.mockResolvedValue({
      id: 'user-1',
      passwordHash: 'old-hash',
    });
    repository.updatePasswordHash.mockResolvedValue(undefined);

    await expect(
      service.changePassword('user-1', {
        currentPassword: 'old-password',
        newPassword: 'new-password-123',
      }),
    ).resolves.toBeUndefined();

    expect(repository.findCredentialsById).toHaveBeenCalledWith('user-1');
    expect(repository.updatePasswordHash).toHaveBeenCalledWith('user-1', 'hashed-value');
    expect(cacheService.delete).toHaveBeenCalledWith('auth:user:user-1');
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from '../user.service';
import { UserRepository } from '../user.repository';

describe('UserService', () => {
  let service: UserService;
  let repository: {
    create: jest.Mock;
    findById: jest.Mock;
    getProfile: jest.Mock;
    updateProfile: jest.Mock;
    changePassword: jest.Mock;
  };

  beforeEach(async () => {
    repository = {
      create: jest.fn(),
      findById: jest.fn(),
      getProfile: jest.fn(),
      updateProfile: jest.fn(),
      changePassword: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: UserRepository,
          useValue: repository,
        },
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
    repository.changePassword.mockResolvedValue(undefined);

    await expect(
      service.changePassword('user-1', {
        currentPassword: 'old-password',
        newPassword: 'new-password-123',
      }),
    ).resolves.toBeUndefined();

    expect(repository.changePassword).toHaveBeenCalledWith('user-1', {
      currentPassword: 'old-password',
      newPassword: 'new-password-123',
    });
  });
});

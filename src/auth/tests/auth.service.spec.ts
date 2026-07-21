import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { AuthRepository } from '../auth.repository';
import { AuthService } from '../auth.service';
import { AuthUser } from '../types/auth-user.type';

describe('AuthService', () => {
  let service: AuthService;

  const authUser: AuthUser = {
    id: 'user-1',
    email: 'user@example.com',
    displayName: 'User',
    roles: ['member'],
    permissions: ['template:read'],
  };

  const repository = {
    findUserByEmail: jest.fn(),
    findUserById: jest.fn(),
    findAuthUserById: jest.fn(),
    createUser: jest.fn(),
    updateRefreshTokenHash: jest.fn(),
    updateLastLogin: jest.fn(),
  };

  const jwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };

  const configService = {
    get: jest.fn((key: string, defaultValue?: unknown) => {
      const map: Record<string, unknown> = {
        'jwt.accessExpiresIn': '15m',
        'jwt.refreshExpiresIn': '7d',
        'jwt.accessSecret': 'access',
        'jwt.refreshSecret': 'refresh',
        'security.bcryptSaltRounds': 4,
      };

      return key in map ? map[key] : defaultValue;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: AuthRepository,
          useValue: repository,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should register and issue tokens', async () => {
    repository.findUserByEmail.mockResolvedValue(null);
    repository.createUser.mockResolvedValue({
      id: authUser.id,
      email: authUser.email,
      displayName: authUser.displayName,
      isActive: true,
      passwordHash: 'hash',
      refreshTokenHash: null,
    });
    repository.findAuthUserById.mockResolvedValue(authUser);
    jwtService.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');

    const result = await service.register({
      email: authUser.email,
      password: 'S3cureP@ssword',
      displayName: 'User',
    });

    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toBe('refresh-token');
    expect(repository.updateRefreshTokenHash).toHaveBeenCalledTimes(1);
  });

  it('should throw on duplicate registration', async () => {
    repository.findUserByEmail.mockResolvedValue({ id: authUser.id });

    await expect(
      service.register({
        email: authUser.email,
        password: 'S3cureP@ssword',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('should validate user credentials', async () => {
    const passwordHash = await bcrypt.hash('S3cureP@ssword', 4);

    repository.findUserByEmail.mockResolvedValue({
      id: authUser.id,
      email: authUser.email,
      displayName: authUser.displayName,
      isActive: true,
      passwordHash,
      refreshTokenHash: null,
    });
    repository.findAuthUserById.mockResolvedValue(authUser);

    const result = await service.validateUser({
      email: authUser.email,
      password: 'S3cureP@ssword',
    });

    expect(result.id).toBe(authUser.id);
  });

  it('should reject invalid refresh token', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('bad token'));

    await expect(
      service.refreshToken({
        refreshToken: 'invalid-token-value-invalid-token',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

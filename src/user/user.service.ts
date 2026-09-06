import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../cache/cache.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ChangePasswordDto, UpdateProfileDto } from './dto/profile.dto';
import { UserEntity } from './user.entity';
import { UserRepository } from './user.repository';

@Injectable()
export class UserService {
  private readonly saltRounds: number;

  constructor(
    private readonly repository: UserRepository,
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
  ) {
    this.saltRounds = this.configService.get<number>('security.bcryptSaltRounds', 12);
  }

  async create(payload: CreateUserDto): Promise<UserEntity> {
    const displayName = payload.name ?? null;
    const normalizedName = (payload.name ?? 'user').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const email = `${normalizedName || 'user'}@example.com`;
    const passwordHash = await bcrypt.hash('changeme123', this.saltRounds);

    return this.repository.create({
      email,
      passwordHash,
      displayName,
    });
  }

  async findById(id: string): Promise<UserEntity | null> {
    return this.repository.findById(id);
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.repository.findByEmail(email);
  }

  async getProfile(id: string): Promise<Partial<UserEntity> | null> {
    return this.repository.getProfile(id);
  }

  async updateProfile(id: string, payload: UpdateProfileDto): Promise<Partial<UserEntity> | null> {
    const updated = await this.repository.updateProfile(id, payload);
    await this.cacheService.delete(`auth:user:${id}`);
    return updated;
  }

  async changePassword(id: string, payload: ChangePasswordDto): Promise<void> {
    const user = await this.repository.findCredentialsById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const passwordMatches = await bcrypt.compare(payload.currentPassword, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(payload.newPassword, this.saltRounds);
    await this.repository.updatePasswordHash(id, passwordHash);
    await this.cacheService.delete(`auth:user:${id}`);
  }
}

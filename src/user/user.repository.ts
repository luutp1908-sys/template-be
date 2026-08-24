import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../cache/cache.service';
import { PrismaService } from '../database/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ChangePasswordDto, UpdateProfileDto } from './dto/profile.dto';
import { UserEntity } from './user.entity';
import { IUserRepository } from './interfaces/user.repository.interface';
import { UserMapper } from './user.mapper';

@Injectable()
export class UserRepository implements IUserRepository {
  private readonly saltRounds: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly cacheService?: CacheService,
  ) {
    this.saltRounds = this.configService.get<number>('security.bcryptSaltRounds', 12);
  }

  async create(payload: CreateUserDto): Promise<UserEntity> {
    const user = await this.prisma.user.create({
      data: {
        email: `${payload.name ?? 'user'}@example.com`,
        passwordHash: await bcrypt.hash('changeme123', this.saltRounds),
        displayName: payload.name ?? null,
      },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return UserMapper.toEntity(user);
  }

  async findById(id: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, createdAt: true, updatedAt: true },
    });

    return user ? UserMapper.toEntity(user) : null;
  }

  async getProfile(id: string): Promise<Partial<UserEntity> | null> {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  async updateProfile(id: string, payload: UpdateProfileDto): Promise<Partial<UserEntity> | null> {
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        displayName: payload.displayName,
        avatarUrl: payload.avatarUrl,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await this.cacheService?.delete(`auth:user:${id}`);

    return user;
  }

  async changePassword(id: string, payload: ChangePasswordDto): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, passwordHash: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const passwordMatches = await bcrypt.compare(payload.currentPassword, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(payload.newPassword, this.saltRounds);
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash },
    });
  }
}

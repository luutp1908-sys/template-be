import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { UserEntity } from './user.entity';
import {
  CreateUserRecord,
  IUserRepository,
  UpdateUserProfileRecord,
  UserCredentialsEntity,
} from './interfaces/user.repository.interface';
import { UserMapper } from './user.mapper';

@Injectable()
export class UserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(payload: CreateUserRecord): Promise<UserEntity> {
    const user = await this.prisma.user.create({
      data: {
        email: payload.email,
        passwordHash: payload.passwordHash,
        displayName: payload.displayName ?? null,
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

  async findByEmail(email: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null },
      select: {
        id: true,
        email: true,
        displayName: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user ? (user as UserEntity) : null;
  }

  async findCredentialsById(id: string): Promise<UserCredentialsEntity | null> {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, passwordHash: true },
    });

    return user ? ({ id: user.id, passwordHash: user.passwordHash } as UserCredentialsEntity) : null;
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

  async updateProfile(id: string, payload: UpdateUserProfileRecord): Promise<Partial<UserEntity> | null> {
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

    return user;
  }

  async updatePasswordHash(id: string, passwordHash: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash },
    });
  }
}

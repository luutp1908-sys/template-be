import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { ChangePasswordDto, UpdateProfileDto } from './dto/profile.dto';
import { UserEntity } from './user.entity';
import { UserRepository } from './user.repository';

@Injectable()
export class UserService {
  constructor(private readonly repository: UserRepository) {}

  async create(payload: CreateUserDto): Promise<UserEntity> {
    return this.repository.create(payload);
  }

  async findById(id: string): Promise<UserEntity | null> {
    return this.repository.findById(id);
  }

  async getProfile(id: string): Promise<Partial<UserEntity> | null> {
    return this.repository.getProfile(id);
  }

  async updateProfile(id: string, payload: UpdateProfileDto): Promise<Partial<UserEntity> | null> {
    return this.repository.updateProfile(id, payload);
  }

  async changePassword(id: string, payload: ChangePasswordDto): Promise<void> {
    await this.repository.changePassword(id, payload);
  }
}

import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
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
}

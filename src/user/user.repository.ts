import { Injectable } from '@nestjs/common';
import { InMemoryStore } from '../common/testing/in-memory-store';
import { CreateUserDto } from './dto/create-user.dto';
import { UserEntity } from './user.entity';
import { IUserRepository } from './interfaces/user.repository.interface';
import { UserMapper } from './user.mapper';

@Injectable()
export class UserRepository implements IUserRepository {
  private readonly store = new InMemoryStore<UserEntity>();

  async create(payload: CreateUserDto): Promise<UserEntity> {
    return this.store.create((base) =>
      UserMapper.toEntity({
        ...base,
        ...payload,
      }),
    );
  }

  async findById(id: string): Promise<UserEntity | null> {
    return this.store.findById(id);
  }
}

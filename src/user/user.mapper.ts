import { UserEntity } from './user.entity';

export class UserMapper {
  static toEntity(partial: Partial<UserEntity>): UserEntity {
    return {
      id: partial.id ?? '',
      createdAt: partial.createdAt ?? new Date(),
      updatedAt: partial.updatedAt ?? new Date(),
    };
  }
}

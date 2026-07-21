import { CreateUserDto } from '../dto/create-user.dto';
import { UserEntity } from '../user.entity';

export interface IUserRepository {
  create(_payload: CreateUserDto): Promise<UserEntity>;
  findById(_id: string): Promise<UserEntity | null>;
}

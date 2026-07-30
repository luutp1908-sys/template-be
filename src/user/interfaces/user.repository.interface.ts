import { CreateUserDto } from '../dto/create-user.dto';
import { ChangePasswordDto, UpdateProfileDto } from '../dto/profile.dto';
import { UserEntity } from '../user.entity';

export interface IUserRepository {
  create(_payload: CreateUserDto): Promise<UserEntity>;
  findById(_id: string): Promise<UserEntity | null>;
  getProfile(_id: string): Promise<Partial<UserEntity> | null>;
  updateProfile(_id: string, _payload: UpdateProfileDto): Promise<Partial<UserEntity> | null>;
  changePassword(_id: string, _payload: ChangePasswordDto): Promise<void>;
}

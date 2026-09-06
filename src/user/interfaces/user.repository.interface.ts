import { UserEntity } from '../user.entity';

export interface UserCredentialsEntity {
  id: string;
  passwordHash: string;
}

export interface CreateUserRecord {
  email: string;
  passwordHash: string;
  displayName?: string | null;
}

export interface UpdateUserProfileRecord {
  displayName?: string | null;
  avatarUrl?: string | null;
}

export interface IUserRepository {
  create(_payload: CreateUserRecord): Promise<UserEntity>;
  findById(_id: string): Promise<UserEntity | null>;
  findByEmail(_email: string): Promise<UserEntity | null>;
  findCredentialsById(_id: string): Promise<UserCredentialsEntity | null>;
  getProfile(_id: string): Promise<Partial<UserEntity> | null>;
  updateProfile(_id: string, _payload: UpdateUserProfileRecord): Promise<Partial<UserEntity> | null>;
  updatePasswordHash(_id: string, _passwordHash: string): Promise<void>;
}

import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { AuthEntity } from '../auth.entity';

export interface IAuthRepository {
  login(_payload: LoginDto): Promise<AuthEntity>;
  register(_payload: RegisterDto): Promise<AuthEntity>;
}

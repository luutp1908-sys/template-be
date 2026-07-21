import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthEntity } from './auth.entity';
import { AuthRepository } from './auth.repository';

@Injectable()
export class AuthService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly jwtService: JwtService,
  ) {
    void this.jwtService;
  }

  async login(payload: LoginDto): Promise<AuthEntity> {
    return this.repository.login(payload);
  }

  async register(payload: RegisterDto): Promise<AuthEntity> {
    return this.repository.register(payload);
  }
}

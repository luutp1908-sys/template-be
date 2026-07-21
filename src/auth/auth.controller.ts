import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthEntity } from './auth.entity';
import { AuthService } from './auth.service';

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly service: AuthService) {}

  @Post('login')
  login(@Body() payload: LoginDto): Promise<AuthEntity> {
    return this.service.login(payload);
  }

  @Post('register')
  register(@Body() payload: RegisterDto): Promise<AuthEntity> {
    return this.service.register(payload);
  }
}

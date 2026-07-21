import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthRepository } from './auth.repository';
import { AuthUser, JwtClaims } from './types/auth-user.type';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly authRepository: AuthRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.accessSecret', 'change_me_access'),
    });
  }

  async validate(payload: JwtClaims): Promise<AuthUser> {
    const user = await this.authRepository.findAuthUserById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('Invalid access token');
    }

    return user;
  }
}

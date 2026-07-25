import { ConflictException, Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthEntity } from './auth.entity';
import { AuthMapper } from './auth.mapper';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthRepository } from './auth.repository';
import { AuthUser, JwtClaims } from './types/auth-user.type';

@Injectable()
export class AuthService {
  private readonly accessTokenExpiresIn: string;
  private readonly refreshTokenExpiresIn: string;
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly saltRounds: number;

  constructor(
    @Inject('AUTH_REPOSITORY') private readonly repository: any,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.accessTokenExpiresIn = this.configService.get<string>('jwt.accessExpiresIn', '15m');
    this.refreshTokenExpiresIn = this.configService.get<string>('jwt.refreshExpiresIn', '7d');
    this.accessSecret = this.configService.get<string>('jwt.accessSecret', 'change_me_access');
    this.refreshSecret = this.configService.get<string>('jwt.refreshSecret', 'change_me_refresh');
    this.saltRounds = this.configService.get<number>('security.bcryptSaltRounds', 12);
  }

  async register(payload: RegisterDto): Promise<AuthEntity> {
    const existing = await this.repository.findUserByEmail(payload.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(payload.password, this.saltRounds);
    const user = await this.repository.createUser(payload, passwordHash);
    const authUser = await this.repository.findAuthUserById(user.id);

    if (!authUser) {
      throw new UnauthorizedException('Could not load user context');
    }

    return this.issueTokens(authUser);
  }

  async validateUser(payload: LoginDto): Promise<AuthUser> {
    const user = await this.repository.findUserByEmail(payload.email);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(payload.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const authUser = await this.repository.findAuthUserById(user.id);
    if (!authUser) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return authUser;
  }

  async login(user: AuthUser): Promise<AuthEntity> {
    await this.repository.updateLastLogin(user.id);
    return this.issueTokens(user);
  }

  async refreshToken(payload: RefreshTokenDto): Promise<AuthEntity> {
    const token = payload?.refreshToken;
    if (!token) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    let claims: JwtClaims;

    try {
      claims = await this.jwtService.verifyAsync<JwtClaims>(token, {
        secret: this.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.repository.findUserById(claims.sub);
    if (!user || !user.refreshTokenHash || !user.isActive) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokenMatches = await bcrypt.compare(token, user.refreshTokenHash);
    if (!tokenMatches) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const authUser = await this.repository.findAuthUserById(user.id);
    if (!authUser) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return this.issueTokens(authUser);
  }

  async logout(userId: string): Promise<void> {
    await this.repository.updateRefreshTokenHash(userId, null);
  }

  private async issueTokens(user: AuthUser): Promise<AuthEntity> {
    const claims: JwtClaims = {
      sub: user.id,
      email: user.email,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(claims, {
        secret: this.accessSecret,
        expiresIn: this.accessTokenExpiresIn,
      }),
      this.jwtService.signAsync(claims, {
        secret: this.refreshSecret,
        expiresIn: this.refreshTokenExpiresIn,
      }),
    ]);

    const refreshTokenHash = await bcrypt.hash(refreshToken, this.saltRounds);
    await this.repository.updateRefreshTokenHash(user.id, refreshTokenHash);

    return AuthMapper.toEntity({
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      accessTokenExpiresIn: this.accessTokenExpiresIn,
      user,
    });
  }
}

import { Body, Controller, Get, HttpCode, HttpStatus, Logger, Post, UseGuards, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthEntity } from './auth.entity';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Permissions } from './decorators/permissions.decorator';
import { Public } from './decorators/public.decorator';
import { Roles } from './decorators/roles.decorator';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { RolesGuard } from './guards/roles.guard';
import { AuthUser } from './types/auth-user.type';

function parseDurationToMs(value: string | undefined): number {
  if (!value) return 0
  const v = String(value).trim()
  const match = v.match(/^(\d+)([smhd])$/)
  if (!match) {
    // fallback to days if plain number
    const num = Number(v)
    if (Number.isFinite(num)) return num
    return 0
  }
  const num = Number(match[1])
  const unit = match[2]
  switch (unit) {
    case 's':
      return num * 1000
    case 'm':
      return num * 60 * 1000
    case 'h':
      return num * 60 * 60 * 1000
    case 'd':
      return num * 24 * 60 * 60 * 1000
    default:
      return 0
  }
}

function parseEnvInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

const authRegisterThrottle = {
  default: {
    limit: parseEnvInt('THROTTLE_AUTH_REGISTER_LIMIT', 5),
    ttl: parseEnvInt('THROTTLE_AUTH_REGISTER_TTL_MS', 60000),
    blockDuration: parseEnvInt('THROTTLE_AUTH_REGISTER_BLOCK_DURATION_MS', 600000),
  },
};

const authLoginThrottle = {
  default: {
    limit: parseEnvInt('THROTTLE_AUTH_LOGIN_LIMIT', 10),
    ttl: parseEnvInt('THROTTLE_AUTH_LOGIN_TTL_MS', 60000),
    blockDuration: parseEnvInt('THROTTLE_AUTH_LOGIN_BLOCK_DURATION_MS', 300000),
  },
};

const authRefreshThrottle = {
  default: {
    limit: parseEnvInt('THROTTLE_AUTH_REFRESH_LIMIT', 20),
    ttl: parseEnvInt('THROTTLE_AUTH_REFRESH_TTL_MS', 60000),
    blockDuration: parseEnvInt('THROTTLE_AUTH_REFRESH_BLOCK_DURATION_MS', 300000),
  },
};

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly service: AuthService, private readonly configService: ConfigService) {}

  @Public()
  @Post('register')
  @Throttle(authRegisterThrottle)
  @ApiOperation({ summary: 'Register with email and password' })
  @ApiOkResponse({ type: AuthEntity })
  register(@Body() payload: RegisterDto, @Res({ passthrough: true }) res: Response): Promise<AuthEntity> {
    return this.service.register(payload).then((auth) => {
      // set refresh token as httpOnly cookie and remove it from response body
      try {
        const refreshToken = (auth as any).refreshToken
        if (refreshToken) {
          const expires = this.configService.get<string>('jwt.refreshExpiresIn', '7d')
          const maxAge = parseDurationToMs(expires)
          res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: this.configService.get('app.nodeEnv') === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge,
          })
        }
      } catch (error) {
        this.logger.warn({ err: error }, 'Failed to write refresh token cookie during registration')
      }
      delete (auth as any).refreshToken
      return auth
    })
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(LocalAuthGuard)
  @Throttle(authLoginThrottle)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ type: AuthEntity })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  login(@CurrentUser() user: AuthUser, @Res({ passthrough: true }) res: Response): Promise<AuthEntity> {
    return this.service.login(user).then((auth) => {
      try {
        const refreshToken = (auth as any).refreshToken
        if (refreshToken) {
          const expires = this.configService.get<string>('jwt.refreshExpiresIn', '7d')
          const maxAge = parseDurationToMs(expires)
          res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: this.configService.get('app.nodeEnv') === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge,
          })
        }
      } catch (error) {
        this.logger.warn({ err: error }, 'Failed to write refresh token cookie during login')
      }
      delete (auth as any).refreshToken
      return auth
    })
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle(authRefreshThrottle)
  @ApiOperation({ summary: 'Refresh access and refresh tokens' })
  @ApiOkResponse({ type: AuthEntity })
  refresh(@Body() payload: RefreshTokenDto, @Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<AuthEntity> {
    const cookieToken = (req as any).cookies?.refreshToken
    const token = payload?.refreshToken || cookieToken
    return this.service.refreshToken({ refreshToken: token }).then((auth) => {
      try {
        const refreshToken = (auth as any).refreshToken
        if (refreshToken) {
          const expires = this.configService.get<string>('jwt.refreshExpiresIn', '7d')
          const maxAge = parseDurationToMs(expires)
          res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: this.configService.get('app.nodeEnv') === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge,
          })
        }
      } catch (error) {
        this.logger.warn({ err: error }, 'Failed to write refresh token cookie during refresh')
      }
      delete (auth as any).refreshToken
      return auth
    })
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Invalidate current refresh token hash' })
  async logout(@CurrentUser() user: AuthUser, @Res({ passthrough: true }) res: Response): Promise<void> {
    await this.service.logout(user.id);
    try {
      res.clearCookie('refreshToken', { path: '/', sameSite: 'lax', secure: this.configService.get('app.nodeEnv') === 'production' })
    } catch (error) {
      this.logger.warn({ err: error }, 'Failed to clear refresh token cookie during logout')
    }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        email: { type: 'string' },
        displayName: { type: 'string', nullable: true },
        roles: { type: 'array', items: { type: 'string' } },
        permissions: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  me(@CurrentUser() user: AuthUser): AuthUser {
    return user;
  }

  @Get('access-check')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @ApiBearerAuth()
  @Roles('admin')
  @Permissions('template:write')
  @ApiOperation({ summary: 'Sample role and permission protected endpoint' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        allowed: { type: 'boolean' },
      },
    },
  })
  accessCheck(): { allowed: boolean } {
    return { allowed: true };
  }
}

import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
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

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly service: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register with email and password' })
  @ApiOkResponse({ type: AuthEntity })
  register(@Body() payload: RegisterDto): Promise<AuthEntity> {
    return this.service.register(payload);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(LocalAuthGuard)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ type: AuthEntity })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  login(@CurrentUser() user: AuthUser): Promise<AuthEntity> {
    return this.service.login(user);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access and refresh tokens' })
  @ApiOkResponse({ type: AuthEntity })
  refresh(@Body() payload: RefreshTokenDto): Promise<AuthEntity> {
    return this.service.refreshToken(payload);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Invalidate current refresh token hash' })
  async logout(@CurrentUser() user: AuthUser): Promise<void> {
    await this.service.logout(user.id);
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

import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ROLE_KEYS } from '../common/constants/roles.constant';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthUser } from '../auth/types/auth-user.type';
import { CreateUserDto } from './dto/create-user.dto';
import { ChangePasswordDto, UpdateProfileDto } from './dto/profile.dto';
import { UserEntity } from './user.entity';
import { UserProfileResponseDto, UserResponseDto } from './dto/user-response.dto';
import { UserService } from './user.service';

@ApiTags('user')
@ApiBearerAuth()
@Controller({ path: 'user', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserController {
  constructor(private readonly service: UserService) {}

  private toUserResponse(entity: UserEntity): UserResponseDto {
    return {
      id: entity.id,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  private toUserProfileResponse(entity: Partial<UserEntity> | null): UserProfileResponseDto | null {
    if (!entity) {
      return null;
    }

    return {
      id: entity.id ?? '',
      email: (entity as any).email ?? '',
      displayName: (entity as any).displayName ?? null,
      avatarUrl: (entity as any).avatarUrl ?? null,
      createdAt: entity.createdAt ?? new Date(0),
      updatedAt: entity.updatedAt ?? new Date(0),
    };
  }

  @Post()
  @Roles(ROLE_KEYS.admin)
  async create(@Body() payload: CreateUserDto): Promise<UserResponseDto> {
    const entity = await this.service.create(payload);
    return this.toUserResponse(entity);
  }

  @Get('me')
  async getMe(@CurrentUser() user: AuthUser): Promise<UserProfileResponseDto | null> {
    const entity = await this.service.getProfile(user.id);
    return this.toUserProfileResponse(entity);
  }

  @Patch('me')
  async updateMe(
    @CurrentUser() user: AuthUser,
    @Body() payload: UpdateProfileDto,
  ): Promise<UserProfileResponseDto | null> {
    const entity = await this.service.updateProfile(user.id, payload);
    return this.toUserProfileResponse(entity);
  }

  @Patch('me/password')
  changePassword(@CurrentUser() user: AuthUser, @Body() payload: ChangePasswordDto): Promise<void> {
    return this.service.changePassword(user.id, payload);
  }

  @Get(':id')
  @Roles(ROLE_KEYS.admin)
  async findById(@Param('id') id: string): Promise<UserResponseDto | null> {
    const entity = await this.service.findById(id);
    return entity ? this.toUserResponse(entity) : null;
  }
}

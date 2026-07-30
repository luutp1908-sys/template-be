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
import { UserService } from './user.service';

@ApiTags('user')
@ApiBearerAuth()
@Controller({ path: 'user', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserController {
  constructor(private readonly service: UserService) {}

  @Post()
  @Roles(ROLE_KEYS.admin)
  create(@Body() payload: CreateUserDto): Promise<UserEntity> {
    return this.service.create(payload);
  }

  @Get('me')
  getMe(@CurrentUser() user: AuthUser): Promise<Partial<UserEntity> | null> {
    return this.service.getProfile(user.id);
  }

  @Patch('me')
  updateMe(@CurrentUser() user: AuthUser, @Body() payload: UpdateProfileDto): Promise<Partial<UserEntity> | null> {
    return this.service.updateProfile(user.id, payload);
  }

  @Patch('me/password')
  changePassword(@CurrentUser() user: AuthUser, @Body() payload: ChangePasswordDto): Promise<void> {
    return this.service.changePassword(user.id, payload);
  }

  @Get(':id')
  @Roles(ROLE_KEYS.admin)
  findById(@Param('id') id: string): Promise<UserEntity | null> {
    return this.service.findById(id);
  }
}

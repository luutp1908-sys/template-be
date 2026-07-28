import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ROLE_KEYS } from '../common/constants/roles.constant';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UserEntity } from './user.entity';
import { UserService } from './user.service';

@ApiTags('user')
@ApiBearerAuth()
@Controller({ path: 'user', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLE_KEYS.admin)
export class UserController {
  constructor(private readonly service: UserService) {}

  @Post()
  create(@Body() payload: CreateUserDto): Promise<UserEntity> {
    return this.service.create(payload);
  }

  @Get(':id')
  findById(@Param('id') id: string): Promise<UserEntity | null> {
    return this.service.findById(id);
  }
}

import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/types/auth-user.type';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { WorkspaceEntity } from './workspace.entity';
import { WorkspaceService } from './workspace.service';

@ApiTags('workspace')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'workspace', version: '1' })
export class WorkspaceController {
  constructor(private readonly service: WorkspaceService) {}

  @Post()
  create(@Body() payload: CreateWorkspaceDto, @CurrentUser() user: AuthUser): Promise<WorkspaceEntity> {
    return this.service.create(payload, user.id);
  }

  @Get()
  findMany(): Promise<WorkspaceEntity[]> {
    return this.service.findMany();
  }

  @Get(':id')
  findById(@Param('id') id: string): Promise<WorkspaceEntity | null> {
    return this.service.findById(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() payload: UpdateWorkspaceDto): Promise<WorkspaceEntity> {
    return this.service.update(id, payload);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<WorkspaceEntity> {
    return this.service.remove(id);
  }
}

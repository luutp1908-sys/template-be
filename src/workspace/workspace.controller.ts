import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { WorkspaceEntity } from './workspace.entity';
import { WorkspaceService } from './workspace.service';

@ApiTags('workspace')
@ApiBearerAuth()
@Controller({ path: 'workspace', version: '1' })
export class WorkspaceController {
  constructor(private readonly service: WorkspaceService) {}

  @Post()
  create(@Body() payload: CreateWorkspaceDto): Promise<WorkspaceEntity> {
    return this.service.create(payload);
  }

  @Get(':id')
  findById(@Param('id') id: string): Promise<WorkspaceEntity | null> {
    return this.service.findById(id);
  }
}

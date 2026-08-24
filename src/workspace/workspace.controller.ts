import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/types/auth-user.type';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { InviteWorkspaceMemberDto } from './dto/invite-workspace-member.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { WorkspaceMembership } from './decorators/workspace-membership.decorator';
import { WorkspaceMembershipGuard } from './guards/workspace-membership.guard';
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
  findMany(@CurrentUser() user: AuthUser): Promise<WorkspaceEntity[]> {
    return this.service.findMany(user);
  }

  @UseGuards(WorkspaceMembershipGuard)
  @WorkspaceMembership('OWNER', 'ADMIN', 'MEMBER')
  @Get(':id')
  findById(@Param('id') id: string): Promise<WorkspaceEntity | null> {
    return this.service.findById(id);
  }

  @UseGuards(WorkspaceMembershipGuard)
  @WorkspaceMembership('OWNER', 'ADMIN', 'MEMBER')
  @Get(':id/members')
  findMembers(@Param('id') id: string): Promise<unknown[]> {
    return this.service.findMembers(id);
  }

  @UseGuards(WorkspaceMembershipGuard)
  @WorkspaceMembership('OWNER', 'ADMIN')
  @Patch(':id')
  update(@Param('id') id: string, @Body() payload: UpdateWorkspaceDto): Promise<WorkspaceEntity> {
    return this.service.update(id, payload);
  }

  @UseGuards(WorkspaceMembershipGuard)
  @WorkspaceMembership('OWNER', 'ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string): Promise<WorkspaceEntity> {
    return this.service.remove(id);
  }

  @UseGuards(WorkspaceMembershipGuard)
  @WorkspaceMembership('OWNER', 'ADMIN')
  @Post(':id/invite-member')
  inviteMember(
    @Param('id') id: string,
    @Body() payload: InviteWorkspaceMemberDto,
    @CurrentUser() user: AuthUser,
  ): Promise<unknown> {
    return this.service.inviteMember(id, payload, user);
  }

  @UseGuards(WorkspaceMembershipGuard)
  @WorkspaceMembership('OWNER', 'ADMIN')
  @Patch(':id/members/:memberId')
  updateMemberRole(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body('role') role: string,
    @CurrentUser() user: AuthUser,
  ): Promise<unknown> {
    return this.service.updateMemberRole(id, memberId, role, user.id);
  }

  @UseGuards(WorkspaceMembershipGuard)
  @WorkspaceMembership('OWNER', 'ADMIN')
  @Delete(':id/members/:memberId')
  removeMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<boolean> {
    return this.service.removeMember(id, memberId, user.id);
  }
}

import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/types/auth-user.type';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { InviteWorkspaceMemberDto } from './dto/invite-workspace-member.dto';
import { UpdateWorkspaceMemberRoleDto } from './dto/update-workspace-member-role.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { WorkspaceMembership } from './decorators/workspace-membership.decorator';
import { WorkspaceMembershipGuard } from './guards/workspace-membership.guard';
import { WorkspaceEntity } from './workspace.entity';
import { WorkspaceMemberResponseDto, WorkspaceResponseDto } from './dto/workspace-response.dto';
import { WorkspaceService } from './workspace.service';

@ApiTags('workspace')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'workspace', version: '1' })
export class WorkspaceController {
  constructor(private readonly service: WorkspaceService) {}

  private toWorkspaceResponse(entity: WorkspaceEntity): WorkspaceResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      slug: entity.slug,
      type: entity.type,
      description: entity.description,
      avatarUrl: entity.avatarUrl,
      isArchived: entity.isArchived,
      deletedAt: entity.deletedAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  private toWorkspaceMemberResponse(entity: any): WorkspaceMemberResponseDto {
    return {
      id: entity.id,
      userId: entity.userId,
      role: entity.role,
      workspaceId: entity.workspaceId,
      invitedBy: entity.invitedBy ?? null,
      joinedAt: entity.joinedAt ?? null,
      user: entity.user
        ? {
            id: entity.user.id,
            email: entity.user.email,
            displayName: entity.user.displayName ?? null,
          }
        : undefined,
    };
  }

  @Post()
  async create(@Body() payload: CreateWorkspaceDto, @CurrentUser() user: AuthUser): Promise<WorkspaceResponseDto> {
    const entity = await this.service.create(payload, user.id);
    return this.toWorkspaceResponse(entity);
  }

  @Get()
  async findMany(@CurrentUser() user: AuthUser): Promise<WorkspaceResponseDto[]> {
    const entities = await this.service.findMany(user);
    return entities.map((entity) => this.toWorkspaceResponse(entity));
  }

  @UseGuards(WorkspaceMembershipGuard)
  @WorkspaceMembership('OWNER', 'ADMIN', 'MEMBER')
  @Get(':id')
  async findById(@Param('id', new ParseUUIDPipe()) id: string): Promise<WorkspaceResponseDto | null> {
    const entity = await this.service.findById(id);
    return entity ? this.toWorkspaceResponse(entity) : null;
  }

  @UseGuards(WorkspaceMembershipGuard)
  @WorkspaceMembership('OWNER', 'ADMIN', 'MEMBER')
  @Get(':id/members')
  async findMembers(@Param('id', new ParseUUIDPipe()) id: string): Promise<WorkspaceMemberResponseDto[]> {
    const members = await this.service.findMembers(id);
    return members.map((member) => this.toWorkspaceMemberResponse(member));
  }

  @UseGuards(WorkspaceMembershipGuard)
  @WorkspaceMembership('OWNER', 'ADMIN')
  @Patch(':id')
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() payload: UpdateWorkspaceDto,
  ): Promise<WorkspaceResponseDto> {
    const entity = await this.service.update(id, payload);
    return this.toWorkspaceResponse(entity);
  }

  @UseGuards(WorkspaceMembershipGuard)
  @WorkspaceMembership('OWNER', 'ADMIN')
  @Delete(':id')
  async remove(@Param('id', new ParseUUIDPipe()) id: string): Promise<WorkspaceResponseDto> {
    const entity = await this.service.remove(id);
    return this.toWorkspaceResponse(entity);
  }

  @UseGuards(WorkspaceMembershipGuard)
  @WorkspaceMembership('OWNER', 'ADMIN')
  @Post(':id/invite-member')
  inviteMember(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() payload: InviteWorkspaceMemberDto,
    @CurrentUser() user: AuthUser,
  ): Promise<unknown> {
    return this.service.inviteMember(id, payload, user);
  }

  @UseGuards(WorkspaceMembershipGuard)
  @WorkspaceMembership('OWNER', 'ADMIN')
  @Patch(':id/members/:memberId')
  updateMemberRole(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('memberId', new ParseUUIDPipe()) memberId: string,
    @Body() payload: UpdateWorkspaceMemberRoleDto,
    @CurrentUser() user: AuthUser,
  ): Promise<unknown> {
    return this.service.updateMemberRole(id, memberId, payload.role, user.id);
  }

  @UseGuards(WorkspaceMembershipGuard)
  @WorkspaceMembership('OWNER', 'ADMIN')
  @Delete(':id/members/:memberId')
  removeMember(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('memberId', new ParseUUIDPipe()) memberId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<boolean> {
    return this.service.removeMember(id, memberId, user.id);
  }
}

import { Module } from '@nestjs/common';
import { WorkspaceController } from './workspace.controller';
import { WorkspaceService } from './workspace.service';
import { WorkspaceRepository } from './workspace.repository';
import { WorkspaceMembershipGuard } from './guards/workspace-membership.guard';

@Module({
  controllers: [WorkspaceController],
  providers: [WorkspaceService, WorkspaceRepository, WorkspaceMembershipGuard],
  exports: [WorkspaceService],
})
export class WorkspaceModule {}

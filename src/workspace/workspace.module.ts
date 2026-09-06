import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { WorkspaceController } from './workspace.controller';
import { WorkspaceService } from './workspace.service';
import { WorkspaceRepository } from './workspace.repository';
import { WorkspaceMembershipGuard } from './guards/workspace-membership.guard';
import { WorkspaceAccessPolicy } from './policies/workspace-access.policy';

@Module({
  imports: [UserModule],
  controllers: [WorkspaceController],
  providers: [WorkspaceService, WorkspaceRepository, WorkspaceAccessPolicy, WorkspaceMembershipGuard],
  exports: [WorkspaceService],
})
export class WorkspaceModule {}

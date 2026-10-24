import { Module } from '@nestjs/common';
import { UserDraftController } from './user-draft.controller';
import { UserDraftRepository } from './user-draft.repository.prisma';
import { UserDraftService } from './user-draft.service';
import { WorkspaceModule } from '../workspace/workspace.module';
const USER_DRAFT_REPOSITORY = 'USER_DRAFT_REPOSITORY';

@Module({
  imports: [WorkspaceModule],
  controllers: [UserDraftController],
  providers: [
    UserDraftService,
    { provide: USER_DRAFT_REPOSITORY, useClass: UserDraftRepository },
  ],
  exports: [UserDraftService],
})
export class UserDraftModule {}
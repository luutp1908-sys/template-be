import { Module } from '@nestjs/common';
import { UserDraftController } from './user-draft.controller';
import { UserDraftRepository } from './user-draft.repository';
import { UserDraftService } from './user-draft.service';

@Module({
  controllers: [UserDraftController],
  providers: [UserDraftService, UserDraftRepository],
  exports: [UserDraftService],
})
export class UserDraftModule {}
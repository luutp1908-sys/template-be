import { Module } from '@nestjs/common';
import { UserDraftController } from './user-draft.controller';
import { UserDraftService } from './user-draft.service';

const impl = process.env.MOCK_MODE === 'true' || process.env.MOCK_MODE === '1'
  ? require('./user-draft.repository.mock')
  : require('./user-draft.repository.prisma');
const USER_DRAFT_REPOSITORY = 'USER_DRAFT_REPOSITORY';

@Module({
  controllers: [UserDraftController],
  providers: [
    UserDraftService,
    { provide: USER_DRAFT_REPOSITORY, useClass: impl.UserDraftRepository },
  ],
  exports: [UserDraftService],
})
export class UserDraftModule {}
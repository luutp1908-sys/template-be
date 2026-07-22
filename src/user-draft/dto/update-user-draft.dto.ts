import { PartialType } from '@nestjs/swagger';
import { CreateUserDraftDto } from './create-user-draft.dto';

export class UpdateUserDraftDto extends PartialType(CreateUserDraftDto) {}
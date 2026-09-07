import { Prisma } from '@prisma/client';
import { UserDraftResponseDto } from '../../user-draft/dto/user-draft-response.dto';

export class TemplateContentResponseDto {
  templateId!: string;
  content!: Prisma.JsonValue;
}

export class TemplateContentFromDraftResponseDto {
  templateContent!: TemplateContentResponseDto | null;
  draft!: UserDraftResponseDto;
}

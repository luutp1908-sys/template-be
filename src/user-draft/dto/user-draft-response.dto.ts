import { Prisma } from '@prisma/client';

export class UserDraftResponseDto {
  id!: string;
  userId!: string;
  workspaceId!: string | null;
  templateId!: string | null;
  name!: string;
  thumbnail!: string | null;
  content!: Prisma.JsonValue;
  createdAt!: Date;
  updatedAt!: Date;
  lastOpenedAt!: Date | null;
}

export class UserDraftListResponseDto {
  items!: UserDraftResponseDto[];
  total!: number;
  page!: number;
  pageSize!: number;
}

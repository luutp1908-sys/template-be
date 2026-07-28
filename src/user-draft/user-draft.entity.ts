import { Prisma } from '@prisma/client';

export class UserDraftEntity {
  id!: string;
  userId!: string;
  templateId!: string | null;
  name!: string;
  thumbnail!: string | null;
  content!: Prisma.JsonValue;
  createdAt!: Date;
  updatedAt!: Date;
  lastOpenedAt!: Date | null;
}

export class UserDraftListEntity {
  items!: UserDraftEntity[];
  total!: number;
  page!: number;
  pageSize!: number;
}
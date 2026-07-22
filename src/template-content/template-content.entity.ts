import { Prisma } from '@prisma/client';

export class TemplateContentEntity {
  templateId!: string;
  content!: Prisma.JsonValue;
}
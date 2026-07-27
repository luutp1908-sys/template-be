export class CategoryEntity {
  id!: string;
  workspaceId?: string;
  editorTypeId?: number;
  parentId?: string | null;
  name!: string;
  slug!: string;
  deletedAt?: Date | null;
  createdAt!: Date;
  updatedAt!: Date;
}

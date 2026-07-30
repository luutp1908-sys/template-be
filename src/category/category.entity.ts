export type CategorySeoEntity = {
  metaTitle?: string | null;
  metaDescription?: string | null;
  metaKeywords?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImage?: string | null;
  canonicalUrl?: string | null;
  robotsMeta?: string | null;
};

export class CategoryEntity {
  id!: string;
  editorTypeId?: number;
  parentId?: string | null;
  name!: string;
  slug!: string;
  seo?: CategorySeoEntity | null;
  deletedAt?: Date | null;
  createdAt!: Date;
  updatedAt!: Date;
}

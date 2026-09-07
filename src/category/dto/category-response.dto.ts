export class CategorySeoResponseDto {
  metaTitle?: string | null;
  metaDescription?: string | null;
  metaKeywords?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImage?: string | null;
  canonicalUrl?: string | null;
  robotsMeta?: string | null;
}

export class CategoryResponseDto {
  id!: string;
  editorTypeId?: number;
  parentId?: string | null;
  name!: string;
  slug!: string;
  templateCount?: number;
  seo?: CategorySeoResponseDto | null;
  deletedAt?: Date | null;
  createdAt!: Date;
  updatedAt!: Date;
}

export class CategoryTreeNodeResponseDto extends CategoryResponseDto {
  children!: CategoryTreeNodeResponseDto[];
}

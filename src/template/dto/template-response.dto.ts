export class TemplateAuthorResponseDto {
  id!: string;
  email!: string;
  displayName!: string | null;
}

export class TemplateCategoryResponseDto {
  id!: string;
  name!: string;
  slug!: string;
}

export class TemplateEditorTypeResponseDto {
  id!: number;
  type!: 'graphic' | 'document' | 'whiteboard' | 'form';
}

export class TemplateResponseDto {
  id!: string;
  title!: string;
  slug!: string;
  thumbnail!: string | null;
  author!: TemplateAuthorResponseDto | null;
  category!: TemplateCategoryResponseDto;
  editorType!: TemplateEditorTypeResponseDto;
  status!: 'draft' | 'published' | 'archived';
  createdAt!: Date;
  updatedAt!: Date;
}

export class TemplateListResponseDto {
  items!: TemplateResponseDto[];
  total!: number;
  page!: number;
  pageSize!: number;
}

export class TemplatePopularityStatsResponseDto {
  editorType!: {
    id: number;
    type: 'graphic' | 'document' | 'whiteboard' | 'form';
    name: string;
  };
  templateCount!: number;
  publishedCount!: number;
  draftCount!: number;
}

export class TemplateCategoryStatsResponseDto {
  categoryId!: string;
  categoryName!: string;
  editorTypeId!: number;
  templateCount!: number;
  publishedCount!: number;
}

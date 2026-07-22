export class TemplateEntity {
  id!: string;
  title!: string;
  slug!: string;
  thumbnail!: string | null;
  author!: {
    id: string;
    email: string;
    displayName: string | null;
  } | null;
  category!: {
    id: string;
    name: string;
    slug: string;
  };
  editorType!: {
    id: string;
    key: string;
    name: string;
  };
  status!: 'draft' | 'published' | 'archived';
  createdAt!: Date;
  updatedAt!: Date;
}

export class TemplateListEntity {
  items!: TemplateEntity[];
  total!: number;
  page!: number;
  pageSize!: number;
}

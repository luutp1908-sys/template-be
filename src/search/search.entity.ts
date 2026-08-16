export class SearchEntity {
  id!: string;
  title!: string;
  kind!: 'template' | 'category';
  slug?: string;
  description?: string | null;
  editorTypeId?: number | null;
  createdAt!: Date;
  updatedAt!: Date;
}

export class SearchListEntity {
  items!: SearchEntity[];
  total!: number;
  page!: number;
  pageSize!: number;
}

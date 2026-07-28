import { TemplateEntity } from './template.entity';

interface TemplateData {
  id: string;
  title: string;
  slug: string;
  thumbnail: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  author?: {
    id: string;
    email: string;
    displayName: string | null;
  } | null;
  category?: {
    id: string;
    name: string;
    slug: string;
  };
  editorType?: {
    id: number;
    type: 'graphic' | 'document' | 'whiteboard' | 'form';
  };
}

export class TemplateMapper {
  static toEntity(partial: Partial<TemplateData>): TemplateEntity {
    return {
      id: partial.id ?? '',
      title: partial.title ?? '',
      slug: partial.slug ?? '',
      thumbnail: partial.thumbnail ?? null,
      author: partial.author
        ? {
            id: partial.author.id,
            email: partial.author.email,
            displayName: partial.author.displayName,
          }
        : null,
      category: partial.category ?? {
        id: '',
        name: '',
        slug: '',
      },
      editorType: partial.editorType ?? {
        id: 0,
        type: 'graphic',
      },
      status: (partial.status as TemplateEntity['status']) ?? 'draft',
      createdAt: partial.createdAt ?? new Date(),
      updatedAt: partial.updatedAt ?? new Date(),
    };
  }
}

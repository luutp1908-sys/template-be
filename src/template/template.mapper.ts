import { TemplateEntity } from './template.entity';

interface TemplateData {
  id: string;
  title: string;
  slug: string;
  status: string;
  publishedAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  author?: {
    id: string;
    email: string;
    displayName: string | null;
  } | null;
  workspace?: {
    id: string;
    name: string;
    slug: string;
  };
  editorType?: {
    id: string;
    key: string;
    name: string;
  };
  thumbnailAsset?: {
    publicUrl: string | null;
  } | null;
  thumbnail?: string | null;
}

export class TemplateMapper {
  static toEntity(partial: Partial<TemplateData>): TemplateEntity {
    return {
      id: partial.id ?? '',
      title: partial.title ?? '',
      slug: partial.slug ?? '',
      thumbnail: partial.thumbnailAsset?.publicUrl ?? partial.thumbnail ?? null,
      author: partial.author
        ? {
            id: partial.author.id,
            email: partial.author.email,
            displayName: partial.author.displayName,
          }
        : null,
      workspace: partial.workspace ?? {
        id: '',
        name: '',
        slug: '',
      },
      editorType: partial.editorType ?? {
        id: '',
        key: '',
        name: '',
      },
      status: (partial.status as TemplateEntity['status']) ?? 'draft',
      publishedAt: partial.publishedAt ?? null,
      deletedAt: partial.deletedAt ?? null,
      createdAt: partial.createdAt ?? new Date(),
      updatedAt: partial.updatedAt ?? new Date(),
    };
  }
}

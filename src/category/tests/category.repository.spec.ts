import { CategoryRepository } from '../category.repository.prisma';

describe('CategoryRepository', () => {
  let prisma: any;
  let editorTypeService: any;
  let repository: CategoryRepository;

  beforeEach(() => {
    prisma = {
      category: {
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    editorTypeService = {
      ensureEditorTypeByNumericId: jest.fn().mockResolvedValue('editor-type-db-id'),
    };

    repository = new CategoryRepository(prisma as any, editorTypeService as any);
  });

  it('maps duplicate category slug writes to the shared conflict message', async () => {
    const error = new Error('duplicate') as Error & { code?: string };
    error.code = 'P2002';
    prisma.category.create.mockRejectedValue(error);

    await expect(
      repository.create({ name: 'Category Name', slug: 'category-name', editorTypeId: 1 } as any),
    ).rejects.toMatchObject({ message: 'Category slug already exists' });
  });

  it('maps category update misses to not found', async () => {
    const error = new Error('missing') as Error & { code?: string };
    error.code = 'P2025';
    prisma.category.update.mockRejectedValue(error);

    await expect(repository.update('category-1', { name: 'Updated' } as any)).rejects.toMatchObject({
      message: 'Category not found',
    });
  });
});
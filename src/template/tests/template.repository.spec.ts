import { TemplateRepository } from '../template.repository.prisma';

describe('TemplateRepository', () => {
  let prisma: any;
  let editorTypeService: any;
  let repository: TemplateRepository;

  beforeEach(() => {
    prisma = {
      template: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
        groupBy: jest.fn(),
      },
      category: {
        findMany: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    editorTypeService = {
      ensureEditorTypeByNumericId: jest.fn().mockResolvedValue('editor-type-db-id'),
    };

    repository = new TemplateRepository(prisma as any, editorTypeService as any);
  });

  it('maps duplicate template slug writes to the shared conflict message', async () => {
    const error = new Error('duplicate') as Error & { code?: string };
    error.code = 'P2002';
    prisma.template.create.mockRejectedValue(error);

    await expect(
      repository.create(
        { title: 'Template', slug: 'template', editorTypeId: 1, categoryId: 'category-1' } as any,
        'author-1',
      ),
    ).rejects.toMatchObject({ message: 'Template slug already exists' });
  });

  it('maps template update misses to not found', async () => {
    prisma.template.findUnique.mockResolvedValue({ id: 'template-1' });
    const error = new Error('missing') as Error & { code?: string };
    error.code = 'P2025';
    prisma.template.update.mockRejectedValue(error);

    await expect(repository.update('template-1', { title: 'Updated' } as any)).rejects.toMatchObject({
      message: 'Template not found',
    });
  });
});
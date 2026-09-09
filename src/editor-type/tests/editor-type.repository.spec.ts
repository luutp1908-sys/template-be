import { EditorTypeRepository } from '../editor-type.repository.prisma';

describe('EditorTypeRepository', () => {
  it('maps duplicate editor type writes to the shared conflict message', async () => {
    const error = new Error('duplicate') as Error & { code?: string };
    error.code = 'P2002';
    const prisma = {
      editorType: {
        create: jest.fn().mockRejectedValue(error),
      },
    };

    const repository = new EditorTypeRepository(prisma as any);

    await expect(repository.create({ name: 'Graphic' } as any)).rejects.toMatchObject({
      message: 'Editor type key already exists',
    });
  });
});
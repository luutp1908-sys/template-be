import { ExportRepository } from '../export.repository.prisma';

describe('ExportRepository', () => {
  it('creates export job record', async () => {
    const prisma = {
      export: {
        create: jest.fn().mockResolvedValue({ id: 'export-1' }),
      },
    };

    const repository = new ExportRepository(prisma as any);

    const result = await repository.create(
      {
        format: 'pdf' as any,
        content: { pages: [] },
        workspaceId: 'workspace-1',
        templateName: 'template',
      },
      'user-123',
    );

    expect(result).toEqual(expect.objectContaining({ id: 'export-1' }));
    expect(prisma.export.create).toHaveBeenCalledTimes(1);
  });

  it('returns null when export job is missing', async () => {
    const prisma = {
      export: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };

    const repository = new ExportRepository(prisma as any);

    await expect(repository.findById('missing-export')).resolves.toBeNull();
  });

  it('returns null when export exists but is outside requester scope', async () => {
    const prisma = {
      export: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };

    const repository = new ExportRepository(prisma as any);

    await expect(repository.findById('export-1', 'different-user')).resolves.toBeNull();
  });
});

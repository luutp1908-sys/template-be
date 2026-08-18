import { BadRequestException } from '@nestjs/common';
import { ExportFormat } from '../dto/create-export.dto';
import { ExportRepository } from '../export.repository.prisma';

describe('ExportRepository', () => {
  it('throws BadRequestException when workspaceId does not exist', async () => {
    const prisma = {
      workspace: { findUnique: jest.fn().mockResolvedValue(null) },
      template: { findUnique: jest.fn() },
      export: { create: jest.fn() },
    };

    const repository = new ExportRepository(prisma as any);

    await expect(
      repository.create(
        {
          format: ExportFormat.PDF,
          content: { pages: [] },
          workspaceId: 'invalid-workspace-id',
          templateName: 'template',
        },
        'user-123',
      ),
    ).rejects.toThrow(BadRequestException);

    expect(prisma.workspace.findUnique).toHaveBeenCalledWith({
      where: { id: 'invalid-workspace-id' },
    });
    expect(prisma.export.create).not.toHaveBeenCalled();
  });
});

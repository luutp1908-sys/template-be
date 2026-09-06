import { BadRequestException } from '@nestjs/common';
import { ExportFormat } from '../dto/create-export.dto';
import { ExportRepository } from '../export.repository.prisma';

describe('ExportRepository', () => {
  it('throws BadRequestException when workspaceId does not exist', async () => {
    const prisma = {
      export: { create: jest.fn() },
    };

    const workspaceService = {
      findById: jest.fn().mockResolvedValue(null),
    };

    const templateService = {
      findById: jest.fn(),
    };

    const repository = new ExportRepository(
      prisma as any,
      workspaceService as any,
      templateService as any,
    );

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

    expect(workspaceService.findById).toHaveBeenCalledWith('invalid-workspace-id');
    expect(prisma.export.create).not.toHaveBeenCalled();
  });
});

import { TemplateContentRepository } from '../template-content.repository.prisma';

describe('TemplateContentRepository', () => {
  it('returns null when template content is missing', async () => {
    const prisma = {
      templateContent: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };

    const configService = {
      get: jest.fn((_: string, defaultValue?: unknown) => defaultValue),
    };

    const repository = new TemplateContentRepository(prisma as any, configService as any);

    await expect(repository.findByTemplateId('missing-template')).resolves.toBeNull();
  });
});

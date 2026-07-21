import { Test, TestingModule } from '@nestjs/testing';
import { TemplateService } from '../template.service';
import { TemplateRepository } from '../template.repository';

describe('TemplateService', () => {
  let service: TemplateService;
  let repository: {
    create: jest.Mock;
    findById: jest.Mock;
    findMany: jest.Mock;
    update: jest.Mock;
    softDelete: jest.Mock;
    publish: jest.Mock;
    archive: jest.Mock;
    restore: jest.Mock;
  };

  beforeEach(async () => {
    repository = {
      create: jest.fn(),
      findById: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      publish: jest.fn(),
      archive: jest.fn(),
      restore: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplateService,
        {
          provide: TemplateRepository,
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get<TemplateService>(TemplateService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create template metadata', async () => {
    repository.create.mockResolvedValue({ id: 'template-1' });

    const result = await service.create(
      {
        title: 'Template 1',
        slug: 'template-1',
        workspaceId: 'f06a4f54-13d0-4d20-a530-8ed6cf6ac77f',
        editorTypeId: '9118e74b-9bd4-40ae-9609-7969f20d1de5',
      },
      'user-1',
    );

    expect(result.id).toBe('template-1');
    expect(repository.create).toHaveBeenCalledTimes(1);
  });

  it('should list templates with pagination', async () => {
    repository.findMany.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 10 });

    const result = await service.findMany({ page: 1, pageSize: 10 });

    expect(result.total).toBe(0);
    expect(repository.findMany).toHaveBeenCalledTimes(1);
  });
});

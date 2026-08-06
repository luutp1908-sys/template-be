import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../../cache/cache.service';
import { TemplateService } from '../template.service';
import { TemplateRepository } from '../template.data.repository';

describe('TemplateService', () => {
  let service: TemplateService;
  let repository: {
    create: jest.Mock;
    findById: jest.Mock;
    findMany: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
    publish: jest.Mock;
    archive: jest.Mock;
  };
  const cacheService = {
    getJson: jest.fn(),
    setJson: jest.fn(),
    deleteByPattern: jest.fn(),
  };
  const configService = {
    get: jest.fn((key: string, fallback?: unknown) => {
      if (key === 'cache.ttlMs.templateList') {
        return 300000;
      }
      return fallback;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    repository = {
      create: jest.fn(),
      findById: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      publish: jest.fn(),
      archive: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplateService,
        {
          provide: 'TEMPLATE_REPOSITORY',
          useValue: repository,
        },
        {
          provide: TemplateRepository,
          useValue: repository,
        },
        { provide: CacheService, useValue: cacheService },
        { provide: ConfigService, useValue: configService },
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
        editorTypeId: 0,
        categoryId: '0bbf1bb8-7eb2-4f16-bd2d-bd9b27df3e32',
      },
      'user-1',
    );

    expect(result.id).toBe('template-1');
    expect(repository.create).toHaveBeenCalledTimes(1);
  });

  it('should list templates with pagination', async () => {
    cacheService.getJson.mockResolvedValue(null);
    repository.findMany.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 10 });

    const result = await service.findMany({ page: 1, pageSize: 10 });

    expect(result.total).toBe(0);
    expect(repository.findMany).toHaveBeenCalledTimes(1);
  });

  it('should return cached template list when available', async () => {
    const cached = { items: [{ id: 't1' }], total: 1, page: 1, pageSize: 10 };
    cacheService.getJson.mockResolvedValue(cached);

    const result = await service.findMany({ page: 1, pageSize: 10 });

    expect(result).toBe(cached);
    expect(repository.findMany).not.toHaveBeenCalled();
    expect(cacheService.setJson).not.toHaveBeenCalled();
  });

  it('should cache template list on cache miss', async () => {
    cacheService.getJson.mockResolvedValue(null);
    repository.findMany.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 10 });

    await service.findMany({ page: 1, pageSize: 10 });

    expect(cacheService.setJson).toHaveBeenCalledTimes(1);
    expect(cacheService.setJson.mock.calls[0][2]).toBe(300000);
  });

  it('should normalize equivalent queries to the same cache key', async () => {
    cacheService.getJson.mockResolvedValue(null);
    repository.findMany.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 10 });

    await service.findMany({ page: 1, pageSize: 10, search: ' Hero ' });
    await service.findMany({ page: 1, pageSize: 10, search: 'hero', sortOrder: 'desc' });

    const firstKey = cacheService.setJson.mock.calls[0][0];
    const secondKey = cacheService.setJson.mock.calls[1][0];
    expect(firstKey).toBe(secondKey);
  });

  it('should invalidate template list cache after publish', async () => {
    repository.publish.mockResolvedValue({ id: 'template-1' });

    await service.publish('template-1');

    expect(cacheService.deleteByPattern).toHaveBeenCalledWith('template:list:*');
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import { CacheService } from '../../cache/cache.service';
import { TemplateService } from '../../template/template.service';
import { ConflictException } from '@nestjs/common';
import { CategoryService } from '../category.service';
import { CategoryRepository } from '../category.repository';

describe('CategoryService', () => {
  let service: CategoryService;
  const repository = {
    create: jest.fn(),
    findById: jest.fn(),
    getTree: jest.fn(),
    update: jest.fn(),
    softDeleteSafe: jest.fn(),
    findChildren: jest.fn(),
    move: jest.fn(),
    findAncestors: jest.fn(),
    findDescendants: jest.fn(),
    getTemplatesRecursive: jest.fn(),
    getHierarchyStats: jest.fn(),
    getOrphanedCategories: jest.fn(),
  };
  const cacheService = {
    getJson: jest.fn(),
    setJson: jest.fn(),
    delete: jest.fn(),
  };
  const configService = {
    get: jest.fn((key: string, fallback?: unknown) => {
      if (key === 'cache.ttlMs.categoryTree') {
        return 3600000;
      }
      return fallback;
    }),
  };
  const templateService = {
    hasTemplatesInCategory: jest.fn(),
    findByCategoryIds: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryService,
        {
          provide: 'CATEGORY_REPOSITORY',
          useValue: repository,
        },
        {
          provide: CategoryRepository,
          useValue: repository,
        },
        { provide: CacheService, useValue: cacheService },
        { provide: ConfigService, useValue: configService },
        { provide: TemplateService, useValue: templateService },
        {
          provide: Logger,
          useValue: {
            log: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn(),
            trace: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CategoryService>(CategoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return cached category tree when available', async () => {
    const cachedTree = [{ id: 'root', children: [] }];
    cacheService.getJson.mockResolvedValue(cachedTree);

    const result = await service.getTree();

    expect(result).toBe(cachedTree);
    expect(repository.getTree).not.toHaveBeenCalled();
    expect(cacheService.setJson).not.toHaveBeenCalled();
  });

  it('should build and cache category tree on cache miss', async () => {
    cacheService.getJson.mockResolvedValue(null);
    repository.getTree.mockResolvedValue([
      { id: '1', parentId: null, name: 'Root' },
      { id: '2', parentId: '1', name: 'Child' },
    ]);

    const result = await service.getTree();

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
    expect(result[0].children).toHaveLength(1);
    expect(cacheService.setJson).toHaveBeenCalledWith('category:tree', result, 3600000);
  });

  it('should invalidate category tree cache after create', async () => {
    repository.create.mockResolvedValue({ id: 'created' });

    await service.create({ name: 'New Category', slug: 'new-category', editorTypeId: 0 });

    expect(cacheService.delete).toHaveBeenCalledWith('category:tree');
  });

  it('should return hierarchy stats for a category', async () => {
    const stats = {
      id: 'cat-1',
      name: 'Root',
      slug: 'root',
      parentId: null,
      depth: 0,
      directChildCount: 2,
      descendantCount: 3,
      templateCount: 4,
      descendantTemplateCount: 12,
    };
    repository.findById.mockResolvedValue({ id: 'cat-1', name: 'Root', slug: 'root' });
    repository.getHierarchyStats.mockResolvedValue(stats);

    const result = await service.getHierarchyStats('cat-1');

    expect(result).toEqual(stats);
    expect(repository.getHierarchyStats).toHaveBeenCalledWith('cat-1');
  });

  it('should return orphaned categories', async () => {
    const stats = [
      {
        id: 'cat-2',
        name: 'Broken Child',
        slug: 'broken-child',
        parentId: 'missing-parent',
        depth: 1,
        directChildCount: 0,
        descendantCount: 0,
        templateCount: 0,
        descendantTemplateCount: 0,
      },
    ];
    repository.getOrphanedCategories.mockResolvedValue(stats);

    const result = await service.getOrphanedCategories();

    expect(result).toEqual(stats);
    expect(repository.getOrphanedCategories).toHaveBeenCalled();
  });

  it('should return null for missing category in findById', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.findById('missing-category-id')).resolves.toBeNull();
  });

  it('should throw conflict when deleting a category with child categories', async () => {
    repository.findById.mockResolvedValue({ id: 'cat-1', name: 'Root' });
    repository.findChildren.mockResolvedValue([{ id: 'cat-2', parentId: 'cat-1' }]);

    await expect(service.delete('cat-1')).rejects.toThrow(ConflictException);
    await expect(service.delete('cat-1')).rejects.toThrow(
      'Cannot delete category: has child categories',
    );

    expect(templateService.hasTemplatesInCategory).not.toHaveBeenCalled();
    expect(repository.softDeleteSafe).not.toHaveBeenCalled();
  });

  it('should throw conflict when deleting a category with templates', async () => {
    repository.findById.mockResolvedValue({ id: 'cat-1', name: 'Root' });
    repository.findChildren.mockResolvedValue([]);
    templateService.hasTemplatesInCategory.mockResolvedValue(true);

    await expect(service.delete('cat-1')).rejects.toThrow(ConflictException);
    await expect(service.delete('cat-1')).rejects.toThrow(
      'Cannot delete category: has templates',
    );

    expect(repository.softDeleteSafe).not.toHaveBeenCalled();
  });

  it('should throw conflict when moving category under itself', async () => {
    repository.findById.mockResolvedValue({ id: 'cat-1', name: 'Root' });

    await expect(service.move('cat-1', 'cat-1')).rejects.toThrow(ConflictException);
    await expect(service.move('cat-1', 'cat-1')).rejects.toThrow(
      'Cannot move category: cannot set parent to self',
    );

    expect(repository.move).not.toHaveBeenCalled();
  });

  it('should throw conflict when moving category into its own descendant', async () => {
    repository.findById.mockResolvedValue({ id: 'cat-1', name: 'Root' });
    repository.findDescendants.mockResolvedValue([{ id: 'cat-2' }, { id: 'cat-3' }]);

    await expect(service.move('cat-1', 'cat-3')).rejects.toThrow(ConflictException);
    await expect(service.move('cat-1', 'cat-3')).rejects.toThrow(
      'Cannot move category: target parent is a descendant',
    );

    expect(repository.move).not.toHaveBeenCalled();
  });
});

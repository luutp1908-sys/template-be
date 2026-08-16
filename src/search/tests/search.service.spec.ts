import { Test, TestingModule } from '@nestjs/testing';
import { SearchService } from '../search.service';
import { SearchRepository } from '../search.repository';

describe('SearchService', () => {
  let service: SearchService;
  let repository: { search: jest.Mock; create: jest.Mock; findById: jest.Mock };

  beforeEach(async () => {
    repository = {
      search: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        {
          provide: SearchRepository,
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should delegate template search to the repository', async () => {
    const result = {
      items: [{ id: 'template-1', title: 'Landing page', kind: 'template' }],
      total: 1,
      page: 1,
      pageSize: 10,
    };

    repository.search.mockResolvedValue(result);

    await expect(service.search({ q: 'landing', page: 1, pageSize: 10 })).resolves.toEqual(result);
    expect(repository.search).toHaveBeenCalledWith({ q: 'landing', page: 1, pageSize: 10 });
  });

  it('should normalize empty search queries', async () => {
    const result = { items: [], total: 0, page: 1, pageSize: 10 };
    repository.search.mockResolvedValue(result);

    await expect(service.search({ q: '', page: 1, pageSize: 10 })).resolves.toEqual(result);
    expect(repository.search).toHaveBeenCalledWith({ q: '', page: 1, pageSize: 10 });
  });
});

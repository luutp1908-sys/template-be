import { Test, TestingModule } from '@nestjs/testing';
import { WorkspaceService } from '../workspace.service';
import { WorkspaceRepository } from '../workspace.repository';
import { WorkspaceTypeDto } from '../dto/update-workspace.dto';

describe('WorkspaceService', () => {
  let service: WorkspaceService;
  let repository: {
    create: jest.Mock;
    findMany: jest.Mock;
    findById: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  beforeEach(async () => {
    repository = {
      create: jest.fn(),
      findMany: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkspaceService,
        {
          provide: WorkspaceRepository,
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get<WorkspaceService>(WorkspaceService);
  });

  it('should create a workspace for the current user', async () => {
    const payload = { name: 'My Workspace' };
    const expected = {
      id: 'workspace-1',
      name: 'My Workspace',
      slug: 'my-workspace',
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    repository.create.mockResolvedValue(expected);

    await expect(service.create(payload, 'user-1')).resolves.toEqual(expected);
    expect(repository.create).toHaveBeenCalledWith(payload, 'user-1');
  });

  it('should delegate lookup to the repository', async () => {
    const expected = {
      id: 'workspace-1',
      name: 'My Workspace',
      slug: 'my-workspace',
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    repository.findById.mockResolvedValue(expected);

    await expect(service.findById('workspace-1')).resolves.toEqual(expected);
    expect(repository.findById).toHaveBeenCalledWith('workspace-1');
  });

  it('should update a workspace and return the updated entity', async () => {
    const expected = {
      id: 'workspace-1',
      name: 'Updated',
      slug: 'updated',
      type: WorkspaceTypeDto.TEAM,
      description: 'd',
      avatarUrl: null,
      isArchived: false,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    repository.update.mockResolvedValue(expected);

    await expect(service.update('workspace-1', { name: 'Updated' })).resolves.toEqual(expected);
    expect(repository.update).toHaveBeenCalledWith('workspace-1', { name: 'Updated' });
  });
});

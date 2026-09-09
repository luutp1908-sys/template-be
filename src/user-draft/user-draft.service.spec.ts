import { AccessDeniedError } from '../common/errors/authorization-error';
import { UserDraftService } from './user-draft.service';

describe('UserDraftService', () => {
  let repository: {
    findMany: jest.Mock;
  };
  let workspaceService: {
    findMemberWorkspaceId: jest.Mock;
    findFirstWorkspaceIdByUserId: jest.Mock;
    findWorkspaceIdsByUserId: jest.Mock;
  };
  let service: UserDraftService;

  beforeEach(() => {
    repository = {
      findMany: jest.fn(),
    };

    workspaceService = {
      findMemberWorkspaceId: jest.fn(),
      findFirstWorkspaceIdByUserId: jest.fn(),
      findWorkspaceIdsByUserId: jest.fn(),
    };

    service = new UserDraftService(repository as any, workspaceService as any);
  });

  it('throws a domain authorization error when filtering by an inaccessible workspace', async () => {
    workspaceService.findWorkspaceIdsByUserId.mockResolvedValue(['workspace-1']);

    await expect(
      service.findMany(
        {
          workspaceId: 'workspace-2',
          page: 1,
          pageSize: 12,
        } as any,
        'user-1',
      ),
    ).rejects.toThrow(AccessDeniedError);

    expect(repository.findMany).not.toHaveBeenCalled();
  });

  it('delegates to the repository when the requested workspace is accessible', async () => {
    workspaceService.findWorkspaceIdsByUserId.mockResolvedValue(['workspace-1']);
    repository.findMany.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 12,
    });

    await expect(
      service.findMany(
        {
          workspaceId: 'workspace-1',
          page: 1,
          pageSize: 12,
        } as any,
        'user-1',
      ),
    ).resolves.toEqual({
      items: [],
      total: 0,
      page: 1,
      pageSize: 12,
    });

    expect(repository.findMany).toHaveBeenCalled();
  });
});
import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { AccessDeniedError } from '../../common/errors/authorization-error';
import { WorkspaceService } from '../workspace.service';
import { WorkspaceRepository } from '../workspace.repository';
import { WorkspaceTypeDto } from '../dto/update-workspace.dto';
import { UserService } from '../../user/user.service';

describe('WorkspaceService', () => {
  let service: WorkspaceService;
  let repository: {
    create: jest.Mock;
    findMany: jest.Mock;
    findById: jest.Mock;
    findMemberRole: jest.Mock;
    findMemberWorkspaceId: jest.Mock;
    findMembershipById: jest.Mock;
    createMember: jest.Mock;
    updateMemberRoleById: jest.Mock;
    removeMemberById: jest.Mock;
    findMembers: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };
  const userService = {
    findByEmail: jest.fn(),
  };

  beforeEach(async () => {
    repository = {
      create: jest.fn(),
      findMany: jest.fn(),
      findById: jest.fn(),
      findMemberRole: jest.fn(),
      findMemberWorkspaceId: jest.fn(),
      findMembershipById: jest.fn(),
      createMember: jest.fn(),
      updateMemberRoleById: jest.fn(),
      removeMemberById: jest.fn(),
      findMembers: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    userService.findByEmail.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkspaceService,
        {
          provide: WorkspaceRepository,
          useValue: repository,
        },
        {
          provide: UserService,
          useValue: userService,
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

  it('should surface repository not found during workspace update', async () => {
    repository.update.mockRejectedValue(new NotFoundException('Workspace workspace-1 not found'));

    await expect(service.update('workspace-1', { name: 'Updated' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('invites member when requester is workspace admin', async () => {
    repository.findById.mockResolvedValue({ id: 'workspace-1', type: WorkspaceTypeDto.TEAM });
    repository.findMemberRole.mockResolvedValue('ADMIN');
    repository.findMemberWorkspaceId.mockResolvedValue(null);
    userService.findByEmail.mockResolvedValue({ id: 'user-2' });
    repository.createMember.mockResolvedValue({ id: 'membership-1' });

    const result = await service.inviteMember(
      'workspace-1',
      { email: 'invitee@example.com' },
      { id: 'user-1', email: 'owner@example.com', role: 'ADMIN' } as any,
    );

    expect(result).toEqual({ id: 'membership-1' });
    expect(repository.createMember).toHaveBeenCalledWith('workspace-1', 'user-2', 'MEMBER', 'user-1');
  });

  it('rejects invite when actor has insufficient role', async () => {
    repository.findById.mockResolvedValue({ id: 'workspace-1', type: WorkspaceTypeDto.TEAM });
    repository.findMemberRole.mockResolvedValue('MEMBER');

    await expect(
      service.inviteMember(
        'workspace-1',
        { email: 'invitee@example.com' },
        { id: 'user-1', email: 'member@example.com', role: 'MEMBER' } as any,
      ),
    ).rejects.toThrow(AccessDeniedError);
  });

  it('updates member role after permission checks', async () => {
    repository.findMemberRole.mockResolvedValue('OWNER');
    repository.findMembershipById.mockResolvedValue({ id: 'membership-1', role: 'MEMBER' });
    repository.updateMemberRoleById.mockResolvedValue({ id: 'membership-1', role: 'ADMIN' });

    const result = await service.updateMemberRole('workspace-1', 'membership-1', 'ADMIN', 'owner-1');

    expect(result).toEqual({ id: 'membership-1', role: 'ADMIN' });
    expect(repository.updateMemberRoleById).toHaveBeenCalledWith('membership-1', 'ADMIN');
  });

  it('prevents removing workspace owner', async () => {
    repository.findMemberRole.mockResolvedValue('OWNER');
    repository.findMembershipById.mockResolvedValue({ id: 'membership-1', role: 'OWNER' });

    await expect(service.removeMember('workspace-1', 'membership-1', 'owner-1')).rejects.toThrow(
      AccessDeniedError,
    );
  });

  it('rejects invites for personal workspaces with a domain authorization error', async () => {
    repository.findById.mockResolvedValue({ id: 'workspace-1', type: 'PERSONAL' });

    await expect(
      service.inviteMember(
        'workspace-1',
        { email: 'invitee@example.com' },
        { id: 'user-1', email: 'owner@example.com', role: 'OWNER' } as any,
      ),
    ).rejects.toThrow(AccessDeniedError);
  });

  it('rejects member role changes when actor lacks permission', async () => {
    repository.findMemberRole.mockResolvedValue('MEMBER');

    await expect(service.updateMemberRole('workspace-1', 'membership-1', 'ADMIN', 'user-1')).rejects.toThrow(
      AccessDeniedError,
    );
  });

  it('rejects changing the owner role with a domain authorization error', async () => {
    repository.findMemberRole.mockResolvedValue('OWNER');
    repository.findMembershipById.mockResolvedValue({ id: 'membership-1', role: 'OWNER' });

    await expect(service.updateMemberRole('workspace-1', 'membership-1', 'ADMIN', 'owner-1')).rejects.toThrow(
      AccessDeniedError,
    );
  });

  it('should surface repository not found during workspace removal', async () => {
    repository.remove.mockRejectedValue(new NotFoundException('Workspace workspace-1 not found'));

    await expect(service.remove('workspace-1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws when listing members for unknown workspace', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.findMembers('workspace-1')).rejects.toThrow(NotFoundException);
  });

  it('rejects self invite', async () => {
    repository.findById.mockResolvedValue({ id: 'workspace-1', type: WorkspaceTypeDto.TEAM });
    repository.findMemberRole.mockResolvedValue('OWNER');
    userService.findByEmail.mockResolvedValue({ id: 'user-1' });

    await expect(
      service.inviteMember(
        'workspace-1',
        { email: 'owner@example.com' },
        { id: 'user-1', email: 'owner@example.com', role: 'OWNER' } as any,
      ),
    ).rejects.toThrow(ConflictException);
  });
});

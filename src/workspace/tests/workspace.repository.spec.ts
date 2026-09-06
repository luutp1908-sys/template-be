import { WorkspaceRepository } from '../workspace.repository';
import { WorkspaceTypeDto } from '../dto/update-workspace.dto';

describe('WorkspaceRepository', () => {
  let repository: WorkspaceRepository;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn(),
      workspace: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      workspaceMember: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    repository = new WorkspaceRepository(prisma as any);
  });

  it('assigns the creator as workspace owner when creating a workspace', async () => {
    prisma.$transaction.mockImplementation(async (callback: any) => callback(prisma));
    prisma.workspace.create.mockResolvedValue({
      id: 'workspace-1',
      name: 'My Workspace',
      slug: 'my-workspace',
      type: WorkspaceTypeDto.PERSONAL,
      description: null,
      avatarUrl: null,
      isArchived: false,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await repository.create({ name: 'My Workspace' }, 'user-1');

    expect(prisma.workspaceMember.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          workspaceId: 'workspace-1',
          userId: 'user-1',
          role: 'OWNER',
          invitedBy: 'user-1',
        }),
      }),
    );
  });

  it('creates a workspace membership record', async () => {
    prisma.workspaceMember.create.mockResolvedValue({
      id: 'membership-1',
      workspaceId: 'workspace-1',
      userId: 'user-2',
      role: 'MEMBER',
      invitedBy: 'user-1',
    });

    const result = await repository.createMember('workspace-1', 'user-2', 'MEMBER', 'user-1');

    expect(result).toEqual(
      expect.objectContaining({
        workspaceId: 'workspace-1',
        userId: 'user-2',
        role: 'MEMBER',
        invitedBy: 'user-1',
      }),
    );
    expect(prisma.workspaceMember.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          workspaceId: 'workspace-1',
          userId: 'user-2',
          role: 'MEMBER',
          invitedBy: 'user-1',
        }),
      }),
    );
  });

  it('updates a member role by member id', async () => {
    prisma.workspaceMember.update.mockResolvedValue({
      id: 'membership-2',
      workspaceId: 'workspace-1',
      userId: 'user-2',
      role: 'ADMIN',
    });

    const result = await repository.updateMemberRoleById('membership-2', 'ADMIN');

    expect(result).toEqual(
      expect.objectContaining({
        id: 'membership-2',
        role: 'ADMIN',
      }),
    );
    expect(prisma.workspaceMember.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'membership-2' },
        data: { role: 'ADMIN' },
      }),
    );
  });

  it('removes a member by member id', async () => {
    prisma.workspaceMember.deleteMany.mockResolvedValue({ count: 1 });

    const result = await repository.removeMemberById('membership-2');

    expect(result).toBe(true);
    expect(prisma.workspaceMember.deleteMany).toHaveBeenCalledWith({ where: { id: 'membership-2' } });
  });

  it('returns member role for a workspace membership', async () => {
    prisma.workspaceMember.findFirst.mockResolvedValue({ role: 'ADMIN' });

    const role = await repository.findMemberRole('workspace-1', 'user-1');

    expect(role).toBe('ADMIN');
    expect(prisma.workspaceMember.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { workspaceId: 'workspace-1', userId: 'user-1' },
      }),
    );
  });

  it('returns membership by id within workspace', async () => {
    prisma.workspaceMember.findFirst.mockResolvedValue({
      id: 'membership-2',
      role: 'MEMBER',
      userId: 'user-2',
      workspaceId: 'workspace-1',
    });

    const membership = await repository.findMembershipById('workspace-1', 'membership-2');

    expect(membership).toEqual(
      expect.objectContaining({
        id: 'membership-2',
        role: 'MEMBER',
      }),
    );
  });

  it('updates workspace fields when provided', async () => {
    const updated = {
      id: 'workspace-1',
      name: 'New Name',
      slug: 'new-name',
      type: 'TEAM',
      description: 'desc',
      avatarUrl: 'http://example.com/a.png',
      isArchived: true,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prisma.workspace.update.mockResolvedValue(updated);

    const result = await repository.update('workspace-1', {
      name: 'New Name',
      type: WorkspaceTypeDto.TEAM,
      description: 'desc',
      avatarUrl: 'http://example.com/a.png',
      isArchived: true,
    });

    expect(prisma.workspace.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'workspace-1' },
        data: expect.objectContaining({
          name: 'New Name',
          type: 'TEAM',
          description: 'desc',
          avatarUrl: 'http://example.com/a.png',
          isArchived: true,
        }),
      }),
    );

    expect(result).toEqual(expect.objectContaining({ id: 'workspace-1', name: 'New Name', type: 'TEAM', description: 'desc', avatarUrl: 'http://example.com/a.png', isArchived: true }));
  });

  it('returns findById result when no supported fields provided', async () => {
    prisma.workspace.findFirst.mockResolvedValue({ id: 'workspace-1', name: 'Old', slug: 'old', type: WorkspaceTypeDto.PERSONAL, description: null, avatarUrl: null, isArchived: false, deletedAt: null, createdAt: new Date(), updatedAt: new Date() });

    const result = await repository.update('workspace-1', {} as any);

    expect(prisma.workspace.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'workspace-1', deletedAt: null } }));
    expect(result).toEqual(expect.objectContaining({ id: 'workspace-1', name: 'Old' }));
  });
});

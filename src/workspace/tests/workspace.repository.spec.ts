import { WorkspaceRepository } from '../workspace.repository';

describe('WorkspaceRepository', () => {
  let repository: WorkspaceRepository;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn(),
      workspace: {
        create: jest.fn(),
        findFirst: jest.fn(),
      },
      workspaceMember: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      user: {
        findFirst: jest.fn(),
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
      type: 'PERSONAL',
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

  it('creates a workspace membership when an admin invites a user into a team workspace', async () => {
    prisma.workspace.findFirst.mockResolvedValue({
      id: 'workspace-1',
      type: 'TEAM',
      deletedAt: null,
    });
    prisma.workspaceMember.findFirst
      .mockResolvedValueOnce({ role: 'ADMIN' })
      .mockResolvedValueOnce(null);
    prisma.user.findFirst.mockResolvedValue({ id: 'user-2', email: 'invitee@example.com' });
    prisma.workspaceMember.create.mockResolvedValue({
      id: 'membership-1',
      workspaceId: 'workspace-1',
      userId: 'user-2',
      role: 'MEMBER',
      invitedBy: 'user-1',
    });

    const result = await repository.inviteMember('workspace-1', { email: 'invitee@example.com' }, 'user-1');

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

  it('updates a member role when an owner or admin changes it', async () => {
    prisma.workspaceMember.findFirst
      .mockResolvedValueOnce({ role: 'OWNER', userId: 'owner-user' })
      .mockResolvedValueOnce({ id: 'membership-2', workspaceId: 'workspace-1', userId: 'user-2', role: 'MEMBER' });
    prisma.workspaceMember.update.mockResolvedValue({
      id: 'membership-2',
      workspaceId: 'workspace-1',
      userId: 'user-2',
      role: 'ADMIN',
    });

    const result = await repository.updateMemberRole('workspace-1', 'membership-2', 'ADMIN', 'owner-user');

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

  it('removes a member from a workspace when an owner or admin deletes them', async () => {
    prisma.workspaceMember.findFirst
      .mockResolvedValueOnce({ role: 'OWNER', userId: 'owner-user' })
      .mockResolvedValueOnce({ id: 'membership-2', workspaceId: 'workspace-1', userId: 'user-2', role: 'MEMBER' });
    prisma.workspaceMember.delete.mockResolvedValue({ id: 'membership-2' });

    const result = await repository.removeMember('workspace-1', 'membership-2', 'owner-user');

    expect(result).toBe(true);
    expect(prisma.workspaceMember.delete).toHaveBeenCalledWith({ where: { id: 'membership-2' } });
  });
});

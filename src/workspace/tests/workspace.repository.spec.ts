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

  it('maps duplicate workspace member writes to the shared membership conflict message', async () => {
    const error = new Error('duplicate') as Error & { code?: string };
    error.code = 'P2002';
    prisma.workspaceMember.create.mockRejectedValue(error);

    await expect(repository.createMember('workspace-1', 'user-2', 'MEMBER', 'user-1')).rejects.toMatchObject({
      message: 'User is already a member of this workspace',
    });
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

  it('throws not found when member role update target is missing', async () => {
    const error = new Error('missing') as Error & { code?: string };
    error.code = 'P2025';
    error.constructor = { name: 'PrismaClientKnownRequestError' } as any;
    prisma.workspaceMember.update.mockRejectedValue(error);

    await expect(repository.updateMemberRoleById('missing-member', 'ADMIN')).rejects.toMatchObject({
      message: 'Workspace member not found',
    });
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

  it('returns null when member role lookup misses', async () => {
    prisma.workspaceMember.findFirst.mockResolvedValue(null);

    const role = await repository.findMemberRole('workspace-1', 'missing-user');

    expect(role).toBeNull();
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

  it('returns null when membership by id is missing', async () => {
    prisma.workspaceMember.findFirst.mockResolvedValue(null);

    const membership = await repository.findMembershipById('workspace-1', 'missing-membership');

    expect(membership).toBeNull();
  });

  it('returns null when member workspace lookup misses', async () => {
    prisma.workspaceMember.findFirst.mockResolvedValue(null);

    const workspaceId = await repository.findMemberWorkspaceId('missing-user', 'workspace-1');

    expect(workspaceId).toBeNull();
  });

  it('returns null when first workspace lookup by user misses', async () => {
    prisma.workspaceMember.findFirst.mockResolvedValue(null);

    const workspaceId = await repository.findFirstWorkspaceIdByUserId('missing-user');

    expect(workspaceId).toBeNull();
  });

  it('returns null when workspace by id is missing', async () => {
    prisma.workspace.findFirst.mockResolvedValue(null);

    const workspace = await repository.findById('missing-workspace');

    expect(workspace).toBeNull();
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
      type: 'TEAM',
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

  it('throws not found when workspace update target is missing', async () => {
    const error = new Error('missing') as Error & { code?: string };
    error.code = 'P2025';
    error.constructor = { name: 'PrismaClientKnownRequestError' } as any;
    prisma.workspace.update.mockRejectedValue(error);

    await expect(repository.update('missing-workspace', { name: 'Updated' })).rejects.toMatchObject({
      message: 'Workspace missing-workspace not found',
    });
  });

  it('throws not found when workspace update has no fields and row is missing', async () => {
    prisma.workspace.findFirst.mockResolvedValue(null);

    await expect(repository.update('missing-workspace', {} as any)).rejects.toMatchObject({
      message: 'Workspace missing-workspace not found',
    });
  });

  it('returns findById result when no supported fields provided', async () => {
    prisma.workspace.findFirst.mockResolvedValue({ id: 'workspace-1', name: 'Old', slug: 'old', type: 'PERSONAL', description: null, avatarUrl: null, isArchived: false, deletedAt: null, createdAt: new Date(), updatedAt: new Date() });

    const result = await repository.update('workspace-1', {} as any);

    expect(prisma.workspace.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'workspace-1', deletedAt: null } }));
    expect(result).toEqual(expect.objectContaining({ id: 'workspace-1', name: 'Old' }));
  });

  it('throws not found when workspace removal target is missing', async () => {
    const error = new Error('missing') as Error & { code?: string };
    error.code = 'P2025';
    error.constructor = { name: 'PrismaClientKnownRequestError' } as any;
    prisma.workspace.update.mockRejectedValue(error);

    await expect(repository.remove('missing-workspace')).rejects.toMatchObject({
      message: 'Workspace missing-workspace not found',
    });
  });
});

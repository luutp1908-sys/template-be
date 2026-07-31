import { WorkspaceRepository } from '../workspace.repository';

describe('WorkspaceRepository', () => {
  let repository: WorkspaceRepository;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn(),
      workspace: {
        create: jest.fn(),
      },
      workspaceMember: {
        create: jest.fn(),
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
});

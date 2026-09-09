import {
  AccessDeniedError,
  AuthenticationRequiredError,
} from '../../common/errors/authorization-error';
import { WorkspaceAccessPolicy } from '../policies/workspace-access.policy';

describe('WorkspaceAccessPolicy', () => {
  let prisma: { workspaceMember: { findFirst: jest.Mock } };
  let policy: WorkspaceAccessPolicy;

  beforeEach(() => {
    prisma = {
      workspaceMember: {
        findFirst: jest.fn(),
      },
    };

    policy = new WorkspaceAccessPolicy(prisma as any);
  });

  it('throws authentication required when user id is missing', async () => {
    await expect(policy.assertAccess({ userId: '', workspaceId: 'workspace-1' })).rejects.toThrow(
      AuthenticationRequiredError,
    );
  });

  it('throws access denied when membership is missing', async () => {
    prisma.workspaceMember.findFirst.mockResolvedValue(null);

    await expect(policy.assertAccess({ userId: 'user-1', workspaceId: 'workspace-1' })).rejects.toThrow(
      AccessDeniedError,
    );
  });

  it('throws access denied when required role is missing', async () => {
    prisma.workspaceMember.findFirst.mockResolvedValue({ role: 'MEMBER' });

    await expect(
      policy.assertAccess({
        userId: 'user-1',
        workspaceId: 'workspace-1',
        requiredRoles: ['OWNER'],
      }),
    ).rejects.toThrow(AccessDeniedError);
  });

  it('returns membership role when access is allowed', async () => {
    prisma.workspaceMember.findFirst.mockResolvedValue({ role: 'ADMIN' });

    await expect(
      policy.assertAccess({
        userId: 'user-1',
        workspaceId: 'workspace-1',
        requiredRoles: ['ADMIN'],
      }),
    ).resolves.toBe('ADMIN');
  });
});
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { WorkspaceMembershipGuard } from '../guards/workspace-membership.guard';

describe('WorkspaceMembershipGuard', () => {
  let guard: WorkspaceMembershipGuard;
  let prisma: any;
  let reflector: any;

  const buildContext = (userId?: string, workspaceId?: string) => ({
    switchToHttp: () => ({
      getRequest: () => ({
        user: userId ? { id: userId } : undefined,
        params: workspaceId ? { id: workspaceId } : {},
      }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  });

  beforeEach(() => {
    prisma = {
      workspaceMember: {
        findFirst: jest.fn(),
      },
    };

    reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([]),
    };

    guard = new WorkspaceMembershipGuard(prisma, reflector);
  });

  it('requires authentication before checking workspace membership', async () => {
    await expect(guard.canActivate(buildContext(undefined, 'workspace-1') as any)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('denies access when the user is not a workspace member', async () => {
    prisma.workspaceMember.findFirst.mockResolvedValue(null);

    await expect(guard.canActivate(buildContext('user-1', 'workspace-1') as any)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('allows access when the user is a workspace member', async () => {
    prisma.workspaceMember.findFirst.mockResolvedValue({ role: 'MEMBER' });

    await expect(guard.canActivate(buildContext('user-1', 'workspace-1') as any)).resolves.toBe(true);
  });

  it('denies access when the required workspace role is missing', async () => {
    reflector.getAllAndOverride.mockReturnValue(['OWNER']);
    prisma.workspaceMember.findFirst.mockResolvedValue({ role: 'MEMBER' });

    await expect(guard.canActivate(buildContext('user-1', 'workspace-1') as any)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('allows access when the required role matches the membership role', async () => {
    reflector.getAllAndOverride.mockReturnValue(['ADMIN']);
    prisma.workspaceMember.findFirst.mockResolvedValue({ role: 'ADMIN' });

    await expect(guard.canActivate(buildContext('user-1', 'workspace-1') as any)).resolves.toBe(true);
  });
});

import { SetMetadata } from '@nestjs/common';

export const WORKSPACE_MEMBERSHIP_KEY = 'workspaceMembership';

export const WorkspaceMembership = (...roles: string[]): MethodDecorator & ClassDecorator =>
  SetMetadata(WORKSPACE_MEMBERSHIP_KEY, roles);

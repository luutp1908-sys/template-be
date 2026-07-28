export const ROLE_KEYS = {
  admin: 'admin',
  user: 'user',
} as const;

export type RoleKey = (typeof ROLE_KEYS)[keyof typeof ROLE_KEYS];

export const SYSTEM_ROLE_KEYS: ReadonlyArray<RoleKey> = [ROLE_KEYS.admin, ROLE_KEYS.user];

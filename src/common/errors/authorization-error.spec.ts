import {
  AccessDeniedError,
  AuthenticationRequiredError,
  AuthorizationError,
  isAuthorizationError,
} from './authorization-error';

describe('authorization errors', () => {
  it('creates a framework-agnostic authentication error contract', () => {
    const error = new AuthenticationRequiredError();

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AuthorizationError);
    expect(error.name).toBe('AuthenticationRequiredError');
    expect(error.code).toBe('AUTHENTICATION_REQUIRED');
    expect(error.message).toBe('Authentication required');
    expect(isAuthorizationError(error)).toBe(true);
  });

  it('creates a framework-agnostic access denied contract', () => {
    const error = new AccessDeniedError('Workspace access denied', {
      details: { workspaceId: 'workspace-1' },
    });

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AuthorizationError);
    expect(error.name).toBe('AccessDeniedError');
    expect(error.code).toBe('ACCESS_DENIED');
    expect(error.message).toBe('Workspace access denied');
    expect(error.details).toEqual({ workspaceId: 'workspace-1' });
    expect(isAuthorizationError(error)).toBe(true);
  });

  it('does not misclassify regular errors as authorization errors', () => {
    expect(isAuthorizationError(new Error('boom'))).toBe(false);
  });
});
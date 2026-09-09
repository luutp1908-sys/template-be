export type AuthorizationErrorCode = 'AUTHENTICATION_REQUIRED' | 'ACCESS_DENIED';

export interface AuthorizationErrorOptions {
  details?: unknown;
}

export abstract class AuthorizationError extends Error {
  readonly code: AuthorizationErrorCode;

  readonly details?: unknown;

  protected constructor(code: AuthorizationErrorCode, message: string, options: AuthorizationErrorOptions = {}) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.details = options.details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class AuthenticationRequiredError extends AuthorizationError {
  constructor(message = 'Authentication required', options: AuthorizationErrorOptions = {}) {
    super('AUTHENTICATION_REQUIRED', message, options);
  }
}

export class AccessDeniedError extends AuthorizationError {
  constructor(message = 'You are not allowed to perform this action', options: AuthorizationErrorOptions = {}) {
    super('ACCESS_DENIED', message, options);
  }
}

export function isAuthorizationError(error: unknown): error is AuthorizationError {
  return error instanceof AuthorizationError;
}
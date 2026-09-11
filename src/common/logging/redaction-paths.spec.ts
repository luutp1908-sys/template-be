import { Writable } from 'stream';
import pino from 'pino';
import { LOG_REDACT_PATHS } from './redaction-paths';

describe('LOG_REDACT_PATHS', () => {
  it('redacts cookie and token-like fields from logs', () => {
    const chunks: string[] = [];
    const stream = new Writable({
      write(chunk, _encoding, callback) {
        chunks.push(String(chunk));
        callback();
      },
    });

    const logger = pino({ redact: LOG_REDACT_PATHS }, stream);

    logger.info({
      req: {
        headers: {
          authorization: 'Bearer auth-secret',
          cookie: 'refreshToken=cookie-secret',
          'x-api-key': 'api-secret',
          'x-auth-token': 'auth-token-secret',
        },
        body: {
          password: 'pw-secret',
          currentPassword: 'current-pw-secret',
          newPassword: 'new-pw-secret',
          accessToken: 'access-secret',
          refreshToken: 'refresh-secret',
          idToken: 'id-secret',
          token: 'token-secret',
          safeField: 'safe-value',
        },
        query: {
          accessToken: 'query-access-secret',
          refreshToken: 'query-refresh-secret',
          token: 'query-token-secret',
          page: '1',
        },
      },
      res: {
        headers: {
          'set-cookie': 'session=header-cookie-secret',
        },
      },
    }, 'redaction test');

    const output = chunks.join('\n');

    expect(output).not.toContain('auth-secret');
    expect(output).not.toContain('cookie-secret');
    expect(output).not.toContain('api-secret');
    expect(output).not.toContain('auth-token-secret');
    expect(output).not.toContain('pw-secret');
    expect(output).not.toContain('current-pw-secret');
    expect(output).not.toContain('new-pw-secret');
    expect(output).not.toContain('access-secret');
    expect(output).not.toContain('refresh-secret');
    expect(output).not.toContain('id-secret');
    expect(output).not.toContain('token-secret');
    expect(output).not.toContain('query-access-secret');
    expect(output).not.toContain('query-refresh-secret');
    expect(output).not.toContain('query-token-secret');
    expect(output).not.toContain('header-cookie-secret');

    expect(output).toContain('safe-value');
  });
});

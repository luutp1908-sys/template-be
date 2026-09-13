describe('otel bootstrap', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv, NODE_ENV: 'development' };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
  });

  it('initializes the exporter only when telemetry is explicitly enabled', async () => {
    process.env.OTEL_ENABLED = 'true';
    process.env.OTEL_SERVICE_NAME = 'template-saas-backend-test';
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://localhost:4318/v1/traces';

    const { bootstrapOpenTelemetry } = await import('./otel.bootstrap');

    expect(() => bootstrapOpenTelemetry()).not.toThrow();
  });

  it('does nothing when telemetry is not enabled', async () => {
    delete process.env.OTEL_ENABLED;

    const { bootstrapOpenTelemetry } = await import('./otel.bootstrap');

    expect(() => bootstrapOpenTelemetry()).not.toThrow();
  });
});

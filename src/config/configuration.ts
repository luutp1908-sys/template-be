export default () => ({
  app: {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    name: process.env.APP_NAME ?? 'template-saas-backend',
    port: Number(process.env.PORT ?? 4000),
    apiPrefix: process.env.API_PREFIX ?? 'api',
    swaggerPath: process.env.SWAGGER_PATH ?? 'docs',
    mockMode: process.env.MOCK_MODE === 'true',
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },
  database: {
    url: process.env.DATABASE_URL,
  },
  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT ?? 6379),
    password: process.env.REDIS_PASSWORD ?? '',
  },
  log: {
    level: process.env.LOG_LEVEL ?? 'info',
  },
  security: {
    bcryptSaltRounds: Number(process.env.BCRYPT_SALT_ROUNDS ?? 12),
  },
});

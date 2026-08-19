export default () => ({
  app: {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    name: process.env.APP_NAME ?? 'template-saas-backend',
    port: Number(process.env.PORT ?? 4000),
    apiPrefix: process.env.API_PREFIX ?? 'api',
    swaggerPath: process.env.SWAGGER_PATH ?? 'docs',
    trustProxy: Number(process.env.TRUST_PROXY ?? 0),
    frontendOrigin: process.env.FRONTEND_ORIGIN ?? '',
    exportServiceUrl: process.env.EXPORT_SERVICE_URL ?? '',
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
    startupMode: process.env.DATABASE_STARTUP_MODE ?? 'warn',
  },
  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT ?? 6379),
    password: process.env.REDIS_PASSWORD ?? '',
  },
  cache: {
    enabled: process.env.CACHE_ENABLED !== 'false',
    keyPrefix: process.env.CACHE_KEY_PREFIX ?? 'template-saas',
    connectTimeoutMs: Number(process.env.CACHE_CONNECT_TIMEOUT_MS ?? 2000),
    ttlMs: {
      categoryTree: Number(process.env.CACHE_CATEGORY_TREE_TTL_MS ?? 3600000),
      templateList: Number(process.env.CACHE_TEMPLATE_LIST_TTL_MS ?? 300000),
    },
  },
  log: {
    level: process.env.LOG_LEVEL ?? 'warn',
    enableRequestLogs: process.env.ENABLE_REQUEST_LOGS === 'true',
  },
  security: {
    bcryptSaltRounds: Number(process.env.BCRYPT_SALT_ROUNDS ?? 12),
  },
  throttle: {
    default: {
      limit: Number(process.env.THROTTLE_DEFAULT_LIMIT ?? 120),
      ttlMs: Number(process.env.THROTTLE_DEFAULT_TTL_MS ?? 60000),
      blockDurationMs: Number(process.env.THROTTLE_DEFAULT_BLOCK_DURATION_MS ?? 120000),
    },
    auth: {
      login: {
        limit: Number(process.env.THROTTLE_AUTH_LOGIN_LIMIT ?? 10),
        ttlMs: Number(process.env.THROTTLE_AUTH_LOGIN_TTL_MS ?? 60000),
        blockDurationMs: Number(process.env.THROTTLE_AUTH_LOGIN_BLOCK_DURATION_MS ?? 300000),
      },
      register: {
        limit: Number(process.env.THROTTLE_AUTH_REGISTER_LIMIT ?? 5),
        ttlMs: Number(process.env.THROTTLE_AUTH_REGISTER_TTL_MS ?? 60000),
        blockDurationMs: Number(process.env.THROTTLE_AUTH_REGISTER_BLOCK_DURATION_MS ?? 600000),
      },
      refresh: {
        limit: Number(process.env.THROTTLE_AUTH_REFRESH_LIMIT ?? 20),
        ttlMs: Number(process.env.THROTTLE_AUTH_REFRESH_TTL_MS ?? 60000),
        blockDurationMs: Number(process.env.THROTTLE_AUTH_REFRESH_BLOCK_DURATION_MS ?? 300000),
      },
    },
  },
});

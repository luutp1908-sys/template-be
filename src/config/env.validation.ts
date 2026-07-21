import * as Joi from 'joi';

const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  MOCK_MODE: Joi.boolean().truthy('true').falsy('false').default(false),
  PORT: Joi.number().port().default(4000),
  APP_NAME: Joi.string().default('template-saas-backend'),
  API_PREFIX: Joi.string().default('api'),
  SWAGGER_PATH: Joi.string().default('docs'),
  JWT_ACCESS_SECRET: Joi.when('MOCK_MODE', {
    is: true,
    then: Joi.string().default('change_me_access'),
    otherwise: Joi.string().required(),
  }),
  JWT_REFRESH_SECRET: Joi.when('MOCK_MODE', {
    is: true,
    then: Joi.string().default('change_me_refresh'),
    otherwise: Joi.string().required(),
  }),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  DATABASE_URL: Joi.when('MOCK_MODE', {
    is: true,
    then: Joi.string().optional(),
    otherwise: Joi.string()
      .uri({ scheme: ['postgresql'] })
      .required(),
  }),
  REDIS_HOST: Joi.when('MOCK_MODE', {
    is: true,
    then: Joi.string().optional(),
    otherwise: Joi.string().required(),
  }),
  REDIS_PORT: Joi.when('MOCK_MODE', {
    is: true,
    then: Joi.number().port().optional(),
    otherwise: Joi.number().port().required(),
  }),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  LOG_LEVEL: Joi.string().valid('fatal', 'error', 'warn', 'info', 'debug', 'trace').default('info'),
});

export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const { error, value } = envSchema.validate(config, {
    abortEarly: false,
    allowUnknown: true,
    stripUnknown: true,
  });

  if (error) {
    throw new Error(`Environment validation error: ${error.message}`);
  }

  return value;
}

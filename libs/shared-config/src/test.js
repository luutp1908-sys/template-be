const Joi = require('joi');

const schema = Joi.object({
  MOCK_MODE: Joi.boolean().default(false),

  DATABASE_URL: Joi.when('MOCK_MODE', {
    is: true,
    then: Joi.string().optional(),
    otherwise: Joi.string()
      .uri({ scheme: ['postgresql'] })
      .required(),
  }),
});

const databaseUrl = 'postgresql://template_admin:a%5DtDb%237VP_VC0l2%24xb%28K%2AFse@template-saas-prod-postgres.cdsi6yue03d8.ap-southeast-1.rds.amazonaws.com:5432/template_saas?schema=public'

const result = schema.validate({
  MOCK_MODE: false,
  DATABASE_URL: databaseUrl,
});

console.log('DATABASE_URL:', databaseUrl);

if (result.error) {
  console.error('❌ VALIDATION FAILED');
  console.error(result.error.message);
} else {
  console.log('✅ VALIDATION PASSED');
}
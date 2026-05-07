import * as Joi from 'joi';

export const validationSchema = Joi.object({
  PORT: Joi.number().default(3000),
  DATABASE_URL: Joi.string().default(
    'postgresql://dialer:dialer@localhost:5432/winfi_dialer',
  ),
  REDIS_URL: Joi.string().default('redis://localhost:6379'),
  S3_BUCKET: Joi.string().default('winfi-dialer-recordings'),
  S3_REGION: Joi.string().default('us-east-1'),
  PUBLIC_BASE_URL: Joi.string().allow('').default(''),
  CORS_ORIGIN: Joi.string().allow('').default(''),
  JWT_SECRET: Joi.string().default('dev_jwt_secret_change_me'),
  JWT_EXPIRES_IN: Joi.string().default('1d'),
  REQUIRE_WS_AUTH: Joi.boolean().default(false),
  DEFAULT_OUTBOUND_NUMBER: Joi.string().default('+1234567890'),
  DEFAULT_OUTBOUND_CALLER_NAME: Joi.string().allow('').default('RMESSAGES LLC'),
  QUIET_HOURS_START: Joi.number().min(0).max(23).default(21),
  QUIET_HOURS_END: Joi.number().min(0).max(23).default(8),
  LOCAL_PRESENCE_NUMBERS: Joi.string().allow('').default(''),
  CLIENT_SIDE_DIAL: Joi.boolean().default(true),
  QUIET_HOURS_ENABLED: Joi.boolean().default(true),
  TELNYX_CALL_CONTROL_APP_ID: Joi.string().allow('').default(''),
  TELNYX_WEBHOOK_URL: Joi.string().allow('').default(''),
});

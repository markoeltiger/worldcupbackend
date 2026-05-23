'use strict';

const zod = require('zod');
const logger = require('./logger');

const envSchema = zod.object({
  NODE_ENV: zod.enum(['development', 'production', 'test']).default('development'),
  PORT: zod.preprocess((val) => parseInt(val, 10), zod.number().positive().default(3001)),
  API_VERSION: zod.string().default('v1'),
  
  SUPABASE_URL: zod.string().url('SUPABASE_URL must be a valid URL'),
  SUPABASE_SERVICE_ROLE_KEY: zod.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  
  API_FOOTBALL_KEY: zod.string().optional().default(''),
  API_FOOTBALL_BASE_URL: zod.string().url().default('https://v3.football.api-sports.io'),
  
  SPORTSDB_BASE_URL: zod.string().url().default('https://www.thesportsdb.com/api/v1/json/3'),
  
  FOOTBALL_DATA_API_TOKEN: zod.string().optional().default(''),
  FOOTBALL_DATA_BASE_URL: zod.string().url().default('https://api.football-data.org/v4'),
  
  OPENAI_API_KEY: zod.string().optional().default(''),
  OPENAI_MODEL: zod.string().default('gpt-4o-mini'),
  
  FIREBASE_PROJECT_ID: zod.string().optional().default(''),
  FIREBASE_CLIENT_EMAIL: zod.string().optional().default(''),
  FIREBASE_PRIVATE_KEY: zod.string().optional().default(''),
  
  REDIS_URL: zod.string().optional().default(''),
  
  RATE_LIMIT_WINDOW_MS: zod.preprocess((val) => parseInt(val, 10), zod.number().positive().default(60000)),
  RATE_LIMIT_MAX: zod.preprocess((val) => parseInt(val, 10), zod.number().positive().default(100)),
  
  INGESTION_INTERVAL_SECONDS: zod.preprocess((val) => parseInt(val, 10), zod.number().positive().default(30)),
  INGESTION_MAX_RETRIES: zod.preprocess((val) => parseInt(val, 10), zod.number().nonnegative().default(3)),
  INGESTION_RETRY_DELAY_MS: zod.preprocess((val) => parseInt(val, 10), zod.number().nonnegative().default(2000)),
  
  JWT_SECRET: zod.string().default('super-long-random-secret-change-this-in-production'),
  API_SECRET: zod.string().default('internal-service-secret'),
  
  LOG_LEVEL: zod.enum(['error', 'warn', 'info', 'http', 'debug']).default('info')
});

function validateEnv() {
  const result = envSchema.safeParse(process.env);
  
  if (!result.success) {
    logger.error('❌ Environment validation failed! Please check your .env configuration.');
    const errorDetails = result.error.format();
    
    // Log each failure detail nicely
    Object.keys(errorDetails).forEach((key) => {
      if (key !== '_errors') {
        logger.error(`  - ${key}: ${errorDetails[key]._errors.join(', ')}`);
      }
    });
    
    throw new Error('Environment variable validation failed');
  }
  
  logger.info('✓ Environment variable configurations validated successfully.');
  return result.data;
}

module.exports = {
  validateEnv,
  envSchema
};

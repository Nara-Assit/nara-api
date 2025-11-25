import { config as dotenvConfig } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file (check both root and config.env)
const envPath =
  process.env.NODE_ENV === 'production'
    ? resolve(__dirname, '../../.env')
    : resolve(__dirname, '../../config.env');

const result = dotenvConfig({ path: envPath });
if (result.error) {
  console.warn('Warning: Could not load environment file. Using existing environment variables.');
} else {
  console.log(
    `✅ Environment variables loaded from ${process.env.NODE_ENV === 'production' ? '.env' : 'config.env'}`
  );
}

export interface Config {
  PORT: number;
  NODE_ENV: string;
  ACCESS_TOKEN_SECRET: string;
  REFRESH_TOKEN_SECRET: string;
  ACCESS_TOKEN_EXPIRY: number;
  REFRESH_TOKEN_EXPIRY: number;
  OTP_CODE_EXPIRY: number;
  EMAIL_HOST: string;
  EMAIL_PORT: string;
  EMAIL_USERNAME: string;
  EMAIL_PASSWORD: string;
  EMAIL_FROM: string;
}

export const config: Config = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET || '',
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET || '',
  ACCESS_TOKEN_EXPIRY: parseInt(process.env.ACCESS_TOKEN_EXPIRY || '900000', 10),
  REFRESH_TOKEN_EXPIRY: parseInt(process.env.REFRESH_TOKEN_EXPIRY || '2592000000', 10),
  OTP_CODE_EXPIRY: parseInt(process.env.OTP_CODE_EXPIRY || '900000', 10),
  EMAIL_HOST: process.env.EMAIL_HOST!,
  EMAIL_PORT: process.env.EMAIL_PORT!,
  EMAIL_USERNAME: process.env.EMAIL_USERNAME!,
  EMAIL_PASSWORD: process.env.EMAIL_PASSWORD!,
  EMAIL_FROM: process.env.EMAIL_FROM!,
};

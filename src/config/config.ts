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
}

export const config: Config = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
};

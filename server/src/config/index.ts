import dotenv from 'dotenv';
dotenv.config();

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`缺少必要的环境变量: ${key}。生产环境必须设置此变量。`);
  }
  return value;
}

const isProduction = process.env.NODE_ENV === 'production';

export const config = {
  port: parseInt(process.env.PORT || '8080', 10),
  jwt: {
    accessSecret: isProduction
      ? requireEnv('JWT_ACCESS_SECRET')
      : process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me',
    refreshSecret: isProduction
      ? requireEnv('JWT_REFRESH_SECRET')
      : process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me',
    accessExpires: process.env.JWT_ACCESS_EXPIRES || '2h',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES || '30d',
  },
  redis: {
    url: process.env.REDIS_URL || '',
  },
  minio: {
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000', 10),
    accessKey: isProduction
      ? requireEnv('MINIO_ACCESS_KEY')
      : process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: isProduction
      ? requireEnv('MINIO_SECRET_KEY')
      : process.env.MINIO_SECRET_KEY || 'minioadmin',
    bucket: process.env.MINIO_BUCKET || 'restaurant-finance',
    useSSL: process.env.MINIO_USE_SSL === 'true',
  },
  ai: {
    funasrUrl: process.env.FUNASR_SERVICE_URL || 'http://localhost:8100',
    paddleocrUrl: process.env.PADDLEOCR_SERVICE_URL || 'http://localhost:8200',
    ollamaUrl: process.env.OLLAMA_SERVICE_URL || 'http://localhost:11434',
  },
  puppeteer: {
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
  },
};

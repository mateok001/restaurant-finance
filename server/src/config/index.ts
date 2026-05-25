import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '8080', 10),
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
    accessExpires: process.env.JWT_ACCESS_EXPIRES || '2h',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES || '30d',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  minio: {
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000', 10),
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
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

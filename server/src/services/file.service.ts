import { Client } from 'minio';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';

let _client: Client | null = null;

function getClient(): Client {
  if (!_client) {
    _client = new Client({
      endPoint: config.minio.endPoint,
      port: config.minio.port,
      useSSL: config.minio.useSSL,
      accessKey: config.minio.accessKey,
      secretKey: config.minio.secretKey,
    });
  }
  return _client;
}

async function ensureBucket(): Promise<void> {
  const client = getClient();
  const exists = await client.bucketExists(config.minio.bucket);
  if (!exists) {
    await client.makeBucket(config.minio.bucket);
  }
}

export async function uploadFile(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
): Promise<string> {
  await ensureBucket();
  const client = getClient();
  // 强制使用安全扩展名，防止路径遍历和危险文件类型
  const safeExts: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'application/pdf': 'pdf',
  };
  const ext = safeExts[mimeType] || 'bin';
  const objectName = `${uuidv4()}.${ext}`;

  await client.putObject(config.minio.bucket, objectName, buffer, buffer.length, {
    'Content-Type': mimeType,
  });

  // 生成预签名 URL（7天有效期），避免直接公开访问
  const presignedUrl = await client.presignedGetObject(
    config.minio.bucket,
    objectName,
    7 * 24 * 60 * 60, // 7 days
  );
  return presignedUrl;
}

export async function deleteFile(url: string): Promise<void> {
  const client = getClient();
  // 从 URL 中安全提取 objectName（兼容预签名 URL 和直接 URL）
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    // 路径格式: /{bucket}/{objectName}，取最后一个非空段
    const objectName = pathParts[pathParts.length - 1];
    if (objectName) {
      await client.removeObject(config.minio.bucket, objectName);
    }
  } catch {
    // URL 解析失败时回退到简单分割
    const cleanUrl = url.split('?')[0]; // 去掉查询参数
    const parts = cleanUrl.split('/');
    const objectName = parts[parts.length - 1];
    if (objectName) {
      await client.removeObject(config.minio.bucket, objectName);
    }
  }
}

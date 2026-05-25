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
  const ext = originalName.split('.').pop() || 'bin';
  const objectName = `${uuidv4()}.${ext}`;

  await client.putObject(config.minio.bucket, objectName, buffer, buffer.length, {
    'Content-Type': mimeType,
  });

  const protocol = config.minio.useSSL ? 'https' : 'http';
  return `${protocol}://${config.minio.endPoint}:${config.minio.port}/${config.minio.bucket}/${objectName}`;
}

export async function deleteFile(url: string): Promise<void> {
  const client = getClient();
  const parts = url.split('/');
  const objectName = parts.slice(-1)[0];
  await client.removeObject(config.minio.bucket, objectName);
}

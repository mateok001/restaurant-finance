import COS from 'cos-nodejs-sdk-v5';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';

const cos = new COS({
  SecretId: config.cos.secretId,
  SecretKey: config.cos.secretKey,
});

/**
 * 上传文件到腾讯云 COS，返回签名 URL（7天有效）
 */
export async function uploadFile(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
): Promise<string> {
  const safeExts: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'application/pdf': 'pdf',
  };
  const ext = safeExts[mimeType] || 'bin';
  const key = `${uuidv4()}.${ext}`;

  await cos.putObject({
    Bucket: config.cos.bucket,
    Region: config.cos.region,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
  });

  // 生成签名 URL（7天有效期）
  const presignedUrl = await new Promise<string>((resolve, reject) => {
    cos.getObjectUrl(
      {
        Bucket: config.cos.bucket,
        Region: config.cos.region,
        Key: key,
        Sign: true,
        Expires: 7 * 24 * 60 * 60, // 7 days
      },
      (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data.Url);
        }
      },
    );
  });

  return presignedUrl;
}

/**
 * 从 COS 删除文件
 * 兼容签名 URL 和直接 URL，从中提取 object key
 */
export async function deleteFile(url: string): Promise<void> {
  try {
    const urlObj = new URL(url);
    // COS URL 格式: https://{bucket}.cos.{region}.myqcloud.com/{key}?sign=...
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    const objectName = pathParts[pathParts.length - 1];
    if (objectName) {
      await cos.deleteObject({
        Bucket: config.cos.bucket,
        Region: config.cos.region,
        Key: objectName,
      });
    }
  } catch {
    // URL 解析失败时回退到简单分割
    const cleanUrl = url.split('?')[0];
    const parts = cleanUrl.split('/');
    const objectName = parts[parts.length - 1];
    if (objectName) {
      await cos.deleteObject({
        Bucket: config.cos.bucket,
        Region: config.cos.region,
        Key: objectName,
      });
    }
  }
}

import { config } from '../config';
import * as llmService from './llm.service';

function detectImageMimeType(buffer: Buffer): string {
  // JPEG: 0xFF 0xD8 0xFF at offset 0
  if (buffer.length >= 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return 'image/jpeg';
  }
  // PNG: 0x89 0x50 0x4E 0x47 at offset 0
  if (buffer.length >= 4 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return 'image/png';
  }
  // WebP: "RIFF" at offset 0 and "WEBP" at offset 8
  if (buffer.length >= 12 && buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46
      && buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
    return 'image/webp';
  }
  // Default to JPEG for PaddleOCR compatibility
  return 'image/jpeg';
}

interface OcrProcessResult {
  rawText: string;
  parsedItems: Array<{
    productName: string;
    supplierName?: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    totalAmount: number;
  }>;
  needsConfirmation: boolean;
  validationWarnings: string[];
}

export async function processOcrInput(
  imageBuffer: Buffer,
  purchaseDate: string,
  userId: string,
): Promise<OcrProcessResult> {
  // Step 1: Call PaddleOCR
  let rawText: string;
  const warnings: string[] = [];

  try {
    const formData = new FormData();
    // 根据文件头魔数推断真实 MIME 类型
    const detectedType = detectImageMimeType(imageBuffer);
    const blob = new Blob([imageBuffer], { type: detectedType });
    const ext = detectedType.split('/')[1] || 'jpg';
    formData.append('image', blob, `receipt.${ext}`);

    const ocrResponse = await fetch(`${config.ai.paddleocrUrl}/api/v1/ocr`, {
      method: 'POST',
      body: formData,
    });

    if (!ocrResponse.ok) {
      throw new Error(`PaddleOCR error: ${ocrResponse.status}`);
    }

    const ocrData = await ocrResponse.json() as {
      text: string;
      tables?: Array<{ cells: string[][] }>;
    };

    // Prefer table structure if available; otherwise use raw text
    if (ocrData.tables && ocrData.tables.length > 0) {
      rawText = ocrData.tables
        .map((table) =>
          table.cells.map((row) => row.join(' | ')).join('\n'),
        )
        .join('\n\n');
    } else {
      rawText = ocrData.text || '';
    }
  } catch (error) {
    console.error('PaddleOCR call error:', error);
    throw new Error('OCR识别失败，请重试或切换为手动录入');
  }

  if (!rawText.trim()) {
    throw new Error('OCR未识别到有效文字，请确认图片清晰度后重试');
  }

  // Step 2: Use LLM to structure the OCR text
  const parsedItems = await llmService.parsePurchaseText(rawText);

  // Step 3: Validate parsed results
  for (let i = 0; i < parsedItems.length; i++) {
    const item = parsedItems[i];
    if (item.quantity <= 0) {
      warnings.push(`第${i + 1}行: 数量异常（${item.quantity}），请确认`);
    }
    if (item.unitPrice <= 0) {
      warnings.push(`第${i + 1}行: 单价异常（${item.unitPrice}），请确认`);
    }
    if (item.unitPrice > 10000) {
      warnings.push(`第${i + 1}行: 单价过高（${item.unitPrice}元），请确认是否有误`);
    }
    if (!item.productName || item.productName.length < 1) {
      warnings.push(`第${i + 1}行: 商品名称未能识别，请手动填写`);
    }
  }

  return {
    rawText,
    parsedItems: parsedItems.map((item) => ({
      ...item,
      totalAmount: Math.round(item.quantity * item.unitPrice * 100) / 100,
    })),
    needsConfirmation: true,
    validationWarnings: warnings,
  };
}

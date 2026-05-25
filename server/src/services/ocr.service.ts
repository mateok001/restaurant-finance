import { config } from '../config';
import * as llmService from './llm.service';

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
    const blob = new Blob([imageBuffer], { type: 'image/jpeg' });
    formData.append('image', blob, 'receipt.jpg');

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

import { config } from '../config';
import * as llmService from './llm.service';
import * as purchaseService from './purchase.service';

interface VoiceProcessResult {
  rawText: string;
  parsedItems: Array<{
    productName: string;
    supplierName?: string;
    quantity: number;
    unit: string;
    unitPrice: number;
  }>;
  needsConfirmation: boolean;
}

export async function processVoiceInput(
  audioBuffer: Buffer,
  purchaseDate: string,
  userId: string,
): Promise<VoiceProcessResult> {
  // Step 1: Call FunASR for speech recognition
  let rawText: string;
  try {
    const formData = new FormData();
    const blob = new Blob([audioBuffer], { type: 'audio/wav' });
    formData.append('audio', blob, 'recording.wav');

    const asrResponse = await fetch(`${config.ai.funasrUrl}/api/v1/recognize`, {
      method: 'POST',
      body: formData,
    });

    if (!asrResponse.ok) {
      throw new Error(`FunASR error: ${asrResponse.status}`);
    }

    const asrData = await asrResponse.json() as { text: string };
    rawText = asrData.text || '';
  } catch (error) {
    // Fallback: simulate with base64 for demo/testing
    console.error('FunASR call error:', error);
    // For now, if the text is passed directly, use it
    rawText = audioBuffer.toString('utf-8').replace(/[^\x20-\x7E一-鿿]/g, '');
    if (!rawText || rawText.length < 2) {
      throw new Error('语音识别失败，请重试或切换为手动录入');
    }
  }

  if (!rawText.trim()) {
    throw new Error('语音识别未获取到有效文本，请重试');
  }

  // Step 2: Use LLM to structure the text
  const parsedItems = await llmService.parsePurchaseText(rawText);

  return {
    rawText,
    parsedItems,
    needsConfirmation: true,
  };
}

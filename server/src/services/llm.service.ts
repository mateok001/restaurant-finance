import { config } from '../config';

interface StructuredPurchaseItem {
  productName: string;
  supplierName?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

export async function parsePurchaseText(rawText: string): Promise<StructuredPurchaseItem[]> {
  const prompt = `你是一个财务记账助手。请从以下采购语音或OCR文本中提取采购信息，返回严格的JSON数组格式。

每个采购项包含以下字段：
- productName: 商品名称（字符串）
- supplierName: 供应商名称（字符串，如果能从文本中推断）
- quantity: 数量（数字）
- unit: 单位（字符串，如"斤"、"公斤"、"袋"、"箱"、"瓶"等）
- unitPrice: 单价（数字，单位为元）

注意：
1. 如果文本中缺少某个字段，尝试从上下文推断
2. 如果提到"总共"、"合计"等，忽略总金额，只提取每个单项
3. 如果供应商名称没有明确提到，supplierName可以为空字符串

语音/OCR原始文本：
${rawText}

请只返回JSON数组，不要包含其他文字：`;

  try {
    const response = await fetch(`${config.ai.ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen2.5:3b',
        prompt,
        stream: false,
        options: { temperature: 0.1 },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama service error: ${response.status}`);
    }

    const data = await response.json() as { response: string };
    // Extract JSON from the response
    const jsonMatch = data.response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Failed to parse structured data from LLM response');
    }

    const items = JSON.parse(jsonMatch[0]) as StructuredPurchaseItem[];

    // Validate each item
    return items.map((item) => ({
      productName: item.productName,
      supplierName: item.supplierName || '',
      quantity: Number(item.quantity) || 0,
      unit: item.unit || '斤',
      unitPrice: Number(item.unitPrice) || 0,
    }));
  } catch (error) {
    console.error('LLM parse error:', error);
    // Fallback: return empty to trigger manual input
    throw new Error('AI解析失败，请手动输入采购信息');
  }
}

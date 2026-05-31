import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import * as reportService from './report.service';
import * as fileService from './file.service';
import { ReportType } from '../types/enums';
import puppeteer from 'puppeteer';
import { config } from '../config';
import fs from 'fs';
import path from 'path';

export async function list(page: number, pageSize: number) {
  const [items, total] = await Promise.all([
    prisma.report.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { generatedAt: 'desc' },
    }),
    prisma.report.count(),
  ]);
  return { items, total, page, pageSize };
}

export async function generate(
  type: ReportType,
  periodStart: string,
  periodEnd: string,
  userId: string,
) {
  const dateRange = {
    startDate: new Date(periodStart),
    endDate: new Date(periodEnd),
  };

  // 当前周期数据
  const currentSummary = await reportService.getSummary(dateRange, 'day');

  // 计算上一周期（环比）— 使用自然前周期而非简单天数相减
  const periodDurationMs = dateRange.endDate.getTime() - dateRange.startDate.getTime();
  const prevEndDate = new Date(dateRange.startDate.getTime() - 24 * 60 * 60 * 1000);
  const prevStartDate = new Date(prevEndDate.getTime() - periodDurationMs);
  const prevSummary = await reportService.getSummary(
    { startDate: prevStartDate, endDate: prevEndDate },
    'day',
  );

  // 计算去年同期（同比）
  const yoyStartDate = new Date(dateRange.startDate);
  yoyStartDate.setFullYear(yoyStartDate.getFullYear() - 1);
  const yoyEndDate = new Date(dateRange.endDate);
  yoyEndDate.setFullYear(yoyEndDate.getFullYear() - 1);
  const yoySummary = await reportService.getSummary(
    { startDate: yoyStartDate, endDate: yoyEndDate },
    'day',
  );

  // 环比变化率
  function calcChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 10000) / 100;
  }

  const changes = {
    revenueMoM: calcChange(currentSummary.summary.totalRevenue, prevSummary.summary.totalRevenue),
    profitMoM: calcChange(currentSummary.summary.netProfit, prevSummary.summary.netProfit),
    expenseMoM: calcChange(currentSummary.summary.totalExpenses, prevSummary.summary.totalExpenses),
    revenueYoY: calcChange(currentSummary.summary.totalRevenue, yoySummary.summary.totalRevenue),
    profitYoY: calcChange(currentSummary.summary.netProfit, yoySummary.summary.netProfit),
  };

  // 异常提醒：单项支出环比变化 > 30%
  const anomalies: string[] = [];
  for (const [category, amount] of Object.entries(currentSummary.expensesByCategory)) {
    const prevAmount = prevSummary.expensesByCategory[category as any] || 0;
    if (prevAmount > 0) {
      const change = calcChange(amount, prevAmount);
      if (Math.abs(change) > 30) {
        anomalies.push(`${category}: ${change > 0 ? '增加' : '减少'}${Math.abs(change)}%`);
      }
    }
  }

  // 构建简报数据
  const briefingData = {
    type,
    period: { start: periodStart, end: periodEnd },
    current: currentSummary.summary,
    changes,
    anomalies,
    revenueByChannel: currentSummary.revenueByChannel,
    expensesByCategory: currentSummary.expensesByCategory,
  };

  // 生成 HTML
  const templatePath = path.join(__dirname, '../../templates/briefing.html');
  let html = fs.readFileSync(templatePath, 'utf-8');

  html = html
    .replace('{{TITLE}}', getReportTitle(type, periodStart, periodEnd))
    .replace('{{GEN_DATE}}', new Date().toLocaleDateString('zh-CN'))
    .replace('{{DATA}}', JSON.stringify(briefingData).replace(/"/g, '&quot;'));

  // Puppeteer 渲染
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: config.puppeteer.executablePath || undefined,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 800, height: 1200 });
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const imageBuffer = await page.screenshot({ type: 'png', fullPage: true });
    const fileName = `briefing_${type}_${periodStart}_${periodEnd}.png`;
    const imageUrl = await fileService.uploadFile(imageBuffer, fileName, 'image/png');

    // 保存到数据库
    const report = await prisma.report.create({
      data: {
        type,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        imageUrl,
        summaryJson: briefingData,
        generatedBy: userId,
      },
    });

    return { ...report, summary: briefingData };
  } finally {
    await browser.close();
  }
}

function getReportTitle(type: ReportType, start: string, end: string): string {
  const nameMap: Record<ReportType, string> = {
    daily: '日报',
    weekly: '周报',
    monthly: '月报',
    quarterly: '季报',
  };
  return `XX餐馆 ${start}~${end} 经营${nameMap[type]}`;
}

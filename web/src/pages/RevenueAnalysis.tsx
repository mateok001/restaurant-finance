import { useEffect, useState, useCallback } from 'react';
import { Select, Spin, Card, Row, Col, Statistic, Space, Empty } from 'antd';
import { BarChartOutlined, RiseOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import dayjs from 'dayjs';
import api from '../services/api';

const now = dayjs();

const granularityOptions = [
  { label: '按年', value: 'year' },
  { label: '按季度', value: 'quarter' },
  { label: '按月', value: 'month' },
  { label: '按日', value: 'day' },
];

export default function RevenueAnalysisPage() {
  const [granularity, setGranularity] = useState<string>('month');
  const [year, setYear] = useState<number>(now.year());
  const [month, setMonth] = useState<number>(now.month() + 1);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const yearOptions: { label: string; value: number }[] = [];
  for (let y = now.year() - 5; y <= now.year(); y++) {
    yearOptions.push({ label: `${y}年`, value: y });
  }

  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    label: `${i + 1}月`,
    value: i + 1,
  }));

  const fetchData = useCallback(() => {
    setLoading(true);
    const params: any = { year, granularity };
    if (granularity === 'day') params.month = month;
    api.get('/reports/revenue-analysis', { params })
      .then((r) => setData(r.data.data || []))
      .finally(() => setLoading(false));
  }, [year, granularity, month]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalRevenue = data.reduce((s, d) => s + d.revenue, 0);
  const totalLastYear = data.reduce((s, d) => s + d.lastYearRevenue, 0);

  // Revenue comparison bar chart
  const barOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const cur = params.find((p: any) => p.seriesName === '本年');
        const ly = params.find((p: any) => p.seriesName === '去年');
        let html = `<b>${params[0].axisValue}</b><br/>`;
        if (cur) html += `${cur.marker} 本年: ¥${cur.value.toLocaleString()}<br/>`;
        if (ly) html += `${ly.marker} 去年: ¥${ly.value.toLocaleString()}<br/>`;
        if (cur && ly && ly.value > 0) {
          const pct = ((cur.value - ly.value) / ly.value * 100).toFixed(1);
          html += `同比: ${pct}%`;
        }
        return html;
      },
    },
    legend: { data: ['本年', '去年'], bottom: 0 },
    grid: { left: 60, right: 20, top: 20, bottom: 40 },
    xAxis: {
      type: 'category',
      data: data.map((d) => d.period),
      axisLabel: { rotate: granularity === 'day' ? 45 : 0, fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      axisLabel: { formatter: (v: number) => `¥${(v / 10000).toFixed(1)}万` },
    },
    series: [
      {
        name: '本年',
        type: 'bar',
        data: data.map((d) => d.revenue),
        itemStyle: { color: '#D4A574' },
        barMaxWidth: 40,
      },
      {
        name: '去年',
        type: 'bar',
        data: data.map((d) => d.lastYearRevenue),
        itemStyle: { color: '#B0C4DE' },
        barMaxWidth: 40,
      },
    ],
  };

  // Growth rate line chart
  const lineOption = {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        let html = `<b>${params[0].axisValue}</b><br/>`;
        params.forEach((p: any) => {
          const v = p.value;
          html += `${p.marker} ${p.seriesName}: ${v != null ? (v > 0 ? '+' : '') + v.toFixed(1) + '%' : '-'}<br/>`;
        });
        return html;
      },
    },
    legend: { data: ['同比增长率', '环比增长率'], bottom: 0 },
    grid: { left: 60, right: 20, top: 20, bottom: 40 },
    xAxis: {
      type: 'category',
      data: data.map((d) => d.period),
      axisLabel: { rotate: granularity === 'day' ? 45 : 0, fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      axisLabel: { formatter: (v: number) => `${v}%` },
      splitLine: { lineStyle: { type: 'dashed' } },
    },
    series: [
      {
        name: '同比增长率',
        type: 'line',
        data: data.map((d) => d.yoyChange),
        smooth: true,
        lineStyle: { color: '#52c41a', width: 2 },
        itemStyle: { color: '#52c41a' },
        symbol: 'circle',
        symbolSize: 6,
      },
      {
        name: '环比增长率',
        type: 'line',
        data: data.map((d) => d.momChange),
        smooth: true,
        lineStyle: { color: '#1890ff', width: 2, type: 'dashed' },
        itemStyle: { color: '#1890ff' },
        symbol: 'diamond',
        symbolSize: 6,
      },
    ],
  };

  return (
    <div>
      <h2 style={{ marginBottom: 16, fontSize: 20, fontWeight: 600 }}>营业额分析</h2>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card hoverable size="small">
            <Statistic title="本期总收入" value={totalRevenue} precision={2} prefix="¥" valueStyle={{ fontWeight: 600, fontSize: 20, color: '#D4A574' }} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card hoverable size="small">
            <Statistic
              title="去年同期"
              value={totalLastYear}
              precision={2}
              prefix="¥"
              valueStyle={{ fontWeight: 600, fontSize: 20, color: '#B0C4DE' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card hoverable size="small">
            <Statistic
              title="同比变化"
              value={totalLastYear > 0 ? ((totalRevenue - totalLastYear) / totalLastYear * 100) : 0}
              precision={1}
              suffix="%"
              valueStyle={{
                fontWeight: 600,
                fontSize: 20,
                color: totalRevenue >= totalLastYear ? '#52c41a' : '#ff4d4f',
              }}
              prefix={totalRevenue >= totalLastYear ? '↑' : '↓'}
            />
          </Card>
        </Col>
      </Row>

      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <Space>
          <span style={{ color: '#666', fontSize: 13 }}>粒度：</span>
          <Select value={granularity} onChange={(v) => setGranularity(v)} options={granularityOptions} style={{ width: 100 }} />
        </Space>
        <Space>
          <span style={{ color: '#666', fontSize: 13 }}>年份：</span>
          <Select value={year} onChange={(v) => setYear(v)} options={yearOptions} style={{ width: 100 }} />
        </Space>
        {granularity === 'day' && (
          <Space>
            <span style={{ color: '#666', fontSize: 13 }}>月份：</span>
            <Select value={month} onChange={(v) => setMonth(v)} options={monthOptions} style={{ width: 85 }} />
          </Space>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
      ) : data.length === 0 ? (
        <Empty description="暂无数据" style={{ padding: 80 }} />
      ) : (
        <>
          <Card
            title={<span><BarChartOutlined style={{ marginRight: 8 }} />营业额对比（本年 vs 去年）</span>}
            size="small"
            style={{ marginBottom: 16 }}
          >
            <ReactECharts option={barOption} style={{ height: 360 }} />
          </Card>

          <Card
            title={<span><RiseOutlined style={{ marginRight: 8 }} />增长率趋势</span>}
            size="small"
          >
            <ReactECharts option={lineOption} style={{ height: 320 }} />
          </Card>
        </>
      )}
    </div>
  );
}

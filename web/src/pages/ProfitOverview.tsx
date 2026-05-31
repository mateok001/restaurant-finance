import { useEffect, useState, useCallback } from 'react';
import { Card, DatePicker, Button, Statistic, Row, Col, Space, Spin, message } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import dayjs from 'dayjs';
import api from '../services/api';
import { downloadCSV } from '../utils/download';

const { RangePicker } = DatePicker;

const categoryLabels: Record<string, string> = {
  salary: '工资', rent: '房租', utilities: '水电', gas: '煤气', maintenance: '维修', other: '其他',
};

export default function ProfitOverviewPage() {
  const [loading, setLoading] = useState(false);
  const [profit, setProfit] = useState<any>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(30, 'day'), dayjs(),
  ]);

  const fetchData = useCallback(() => {
    if (!dateRange[0] || !dateRange[1]) return;
    setLoading(true);
    const params = {
      startDate: dateRange[0].format('YYYY-MM-DD'),
      endDate: dateRange[1].format('YYYY-MM-DD'),
    };
    Promise.all([
      api.get('/reports/profit', { params }),
      api.get('/reports/trends', { params }),
    ]).then(([p, t]) => {
      setProfit(p.data);
      setTrends(t.data);
    }).catch((err) => {
      message.error('加载利润数据失败，请稍后重试');
      console.error('Profit fetch error:', err);
    }).finally(() => setLoading(false));
  }, [dateRange]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleExportCSV = (type: string) => {
    const ts = dayjs().format('YYYYMMDD_HHmmss');
    try {
      if (type === 'profit') {
        const headers = ['指标', '金额(元)'];
        const rows = [
          ['总收入', profit?.totalRevenue || 0],
          ['采购成本', profit?.totalPurchaseCost || 0],
          ['其他支出', profit?.totalExpenses || 0],
          ['净利润', profit?.netProfit || 0],
          ['利润率', (profit?.profitMargin || 0) + '%'],
        ];
        downloadCSV(headers, rows, `利润报表_${ts}.csv`);
      } else if (type === 'trends') {
        const headers = ['日期', '收入', '采购成本', '其他支出', '净利润'];
        const rows = trends.map((t: any) => [t.date, t.revenue, t.purchaseCost, t.expenses, t.netProfit]);
        downloadCSV(headers, rows, `趋势数据_${ts}.csv`);
      }
      message.success('导出成功');
    } catch {
      message.error('导出失败');
    }
  };

  const s = profit || { totalRevenue: 0, totalPurchaseCost: 0, totalExpenses: 0, grossProfit: 0, netProfit: 0, profitMargin: 0 };

  const revenuePieOption = profit?.revenueByChannel ? {
    tooltip: { trigger: 'item', formatter: '{b}: ¥{c} ({d}%)' },
    legend: { bottom: 0 },
    series: [{
      type: 'pie', radius: ['45%', '70%'], center: ['50%', '45%'],
      label: { formatter: '{b}\n{d}%' },
      data: Object.entries(profit.revenueByChannel).map(([k, v]) => ({ name: k, value: v })),
      itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
    }],
  } : null;

  const expensePieOption = profit?.expensesByCategory ? {
    tooltip: { trigger: 'item', formatter: '{b}: ¥{c} ({d}%)' },
    legend: { bottom: 0 },
    series: [{
      type: 'pie', radius: ['45%', '70%'], center: ['50%', '45%'],
      label: { formatter: '{b}\n{d}%' },
      data: Object.entries(profit.expensesByCategory).map(([k, v]) => ({
        name: categoryLabels[k] || k, value: v,
      })),
      itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
    }],
  } : null;

  const trendOption = trends.length > 0 ? {
    tooltip: { trigger: 'axis' },
    legend: { data: ['收入', '采购成本', '其他支出', '净利润'], bottom: 0 },
    grid: { left: 8, right: 16, top: 16, bottom: 40, containLabel: true },
    xAxis: { type: 'category', data: trends.map((t: any) => t.date.slice(5)), axisLabel: { rotate: 45, fontSize: 10 } },
    yAxis: { type: 'value' },
    series: [
      { name: '收入', type: 'bar', stack: 'revenue', data: trends.map((t: any) => t.revenue), itemStyle: { color: '#52c41a' }, barWidth: 16 },
      { name: '采购成本', type: 'bar', stack: 'cost', data: trends.map((t: any) => t.purchaseCost), itemStyle: { color: '#faad14' }, barWidth: 16 },
      { name: '其他支出', type: 'bar', stack: 'cost', data: trends.map((t: any) => t.expenses), itemStyle: { color: '#ff7a45' }, barWidth: 16 },
      { name: '净利润', type: 'line', data: trends.map((t: any) => t.netProfit), itemStyle: { color: '#D4A574' }, lineStyle: { width: 2.5 }, smooth: true, symbol: 'circle', symbolSize: 6 },
    ],
  } : null;

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>利润概览</h2>
        <Space>
          <span style={{ color: '#666', fontSize: 13 }}>数据范围：</span>
          <RangePicker value={dateRange} onChange={(v) => v && setDateRange([v[0]!, v[1]!])} allowClear={false} />
          <Button type="primary" onClick={fetchData}>查询</Button>
          <Button size="small" icon={<DownloadOutlined />} onClick={() => handleExportCSV('profit')}>导出利润</Button>
          <Button size="small" icon={<DownloadOutlined />} onClick={() => handleExportCSV('trends')}>导出趋势</Button>
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} md={6}>
          <Card hoverable><Statistic title="总收入" value={s.totalRevenue} precision={2} prefix="¥" valueStyle={{ color: '#52c41a', fontWeight: 600 }} /></Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card hoverable><Statistic title="采购成本" value={s.totalPurchaseCost} precision={2} prefix="¥" valueStyle={{ color: '#faad14', fontWeight: 600 }} /></Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card hoverable><Statistic title="其他支出" value={s.totalExpenses} precision={2} prefix="¥" valueStyle={{ color: '#ff7a45', fontWeight: 600 }} /></Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card hoverable><Statistic title="净利润" value={s.netProfit} precision={2} prefix="¥"
            valueStyle={{ color: s.netProfit >= 0 ? '#3f8600' : '#cf1322', fontWeight: 600 }}
            suffix={<span style={{ fontSize: 14 }}>({s.profitMargin}%)</span>} /></Card>
        </Col>
      </Row>

      {trendOption && (
        <Card title="收支趋势" size="small" style={{ marginBottom: 20 }}>
          <ReactECharts option={trendOption} style={{ height: 320 }} />
        </Card>
      )}

      <Row gutter={16}>
        <Col xs={24} lg={12}>
          <Card title="收入渠道分布" size="small">
            {revenuePieOption ? <ReactECharts option={revenuePieOption} style={{ height: 300 }} /> : <div style={{ textAlign: 'center', color: '#999', padding: 40 }}>暂无数据</div>}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="支出类别分布" size="small">
            {expensePieOption ? <ReactECharts option={expensePieOption} style={{ height: 300 }} /> : <div style={{ textAlign: 'center', color: '#999', padding: 40 }}>暂无数据</div>}
          </Card>
        </Col>
      </Row>
    </div>
  );
}

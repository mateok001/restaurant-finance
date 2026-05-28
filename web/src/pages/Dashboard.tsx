import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Card, Statistic, Spin, Button, Space, Table, Tag } from 'antd';
import {
  DollarOutlined, ShoppingOutlined, RiseOutlined,
  AudioOutlined, CameraOutlined, EditOutlined,
  ArrowUpOutlined, ArrowDownOutlined, WalletOutlined,
  PayCircleOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import dayjs from 'dayjs';
import api from '../services/api';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [recentRevenue, setRecentRevenue] = useState<any[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const today = dayjs().format('YYYY-MM-DD');
    const thirtyDaysAgo = dayjs().subtract(30, 'day').format('YYYY-MM-DD');
    const sevenDaysAgo = dayjs().subtract(7, 'day').format('YYYY-MM-DD');

    setLoading(true);
    Promise.all([
      api.get('/reports/profit', { params: { startDate: thirtyDaysAgo, endDate: today } }),
      api.get('/reports/trends', { params: { startDate: sevenDaysAgo, endDate: today } }),
      api.get('/daily-revenue', { params: { pageSize: 5, startDate: sevenDaysAgo, endDate: today } }),
      api.get('/expenses', { params: { pageSize: 5, startDate: sevenDaysAgo, endDate: today } }),
    ]).then(([profitRes, trendsRes, revenueRes, expensesRes]) => {
      setData(profitRes.data);
      setTrends(trendsRes.data);
      setRecentRevenue(revenueRes.data.items || []);
      setRecentExpenses(expensesRes.data.items || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  const s = data || { totalRevenue: 0, totalPurchaseCost: 0, totalExpenses: 0, grossProfit: 0, netProfit: 0, profitMargin: 0 };

  const trendOption = trends.length > 0 ? {
    tooltip: { trigger: 'axis' },
    legend: { data: ['收入', '净利润'], bottom: 0 },
    grid: { left: 8, right: 16, top: 8, bottom: 32, containLabel: true },
    xAxis: { type: 'category', data: trends.map((t: any) => dayjs(t.date).format('MM/DD')), axisLabel: { fontSize: 11 } },
    yAxis: { type: 'value', splitLine: { lineStyle: { type: 'dashed', color: '#f0f0f0' } } },
    series: [
      { name: '收入', type: 'bar', data: trends.map((t: any) => t.revenue), itemStyle: { color: '#52c41a', borderRadius: [4, 4, 0, 0] }, barWidth: 20, barGap: '30%' },
      { name: '净利润', type: 'line', data: trends.map((t: any) => t.netProfit), itemStyle: { color: '#D4A574' }, lineStyle: { width: 3 }, smooth: true, symbol: 'circle', symbolSize: 8, areaStyle: { color: 'rgba(212, 165, 116, 0.1)' } },
    ],
  } : null;

  const revenuePieOption = data?.revenueByChannel ? {
    tooltip: { trigger: 'item', formatter: '{b}: ¥{c}' },
    series: [{
      type: 'pie', radius: ['55%', '75%'], center: ['50%', '50%'],
      label: { show: false },
      data: Object.entries(data.revenueByChannel).map(([k, v]) => ({ name: k, value: v })),
      itemStyle: { borderRadius: 3, borderColor: '#fff', borderWidth: 2 },
    }],
  } : null;

  const expensePieOption = data?.expensesByCategory ? {
    tooltip: { trigger: 'item', formatter: '{b}: ¥{c}' },
    series: [{
      type: 'pie', radius: ['55%', '75%'], center: ['50%', '50%'],
      label: { show: false },
      data: Object.entries(data.expensesByCategory).map(([k, v]) => ({
        name: ({ salary: '工资', rent: '房租', utilities: '水电', gas: '煤气', maintenance: '维修', other: '其他' } as any)[k] || k, value: v,
      })),
      itemStyle: { borderRadius: 3, borderColor: '#fff', borderWidth: 2 },
    }],
  } : null;

  const recentRevenueColumns = [
    { title: '日期', dataIndex: 'revenueDate', width: 100, render: (d: string) => dayjs(d).format('MM/DD') },
    { title: '渠道', dataIndex: 'channel', width: 100, render: (c: any) => c?.name },
    { title: '金额', dataIndex: 'amount', width: 120, render: (v: number) => `¥${Number(v).toLocaleString()}` },
  ];

  const recentExpenseColumns = [
    { title: '日期', dataIndex: 'expenseDate', width: 100, render: (d: string) => dayjs(d).format('MM/DD') },
    {
      title: '类别', dataIndex: 'category', width: 80,
      render: (v: string) => ({ salary: '工资', rent: '房租', utilities: '水电', gas: '煤气', maintenance: '维修', other: '其他' } as any)[v] || v,
    },
    { title: '金额', dataIndex: 'amount', width: 120, render: (v: number) => `¥${Number(v).toLocaleString()}` },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>仪表盘</h2>
        <span style={{ color: '#999', fontSize: 13 }}>数据统计：近30天</span>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card hoverable onClick={() => navigate('/revenue')} style={{ borderTop: '3px solid #52c41a' }}>
            <Statistic title="总收入" value={s.totalRevenue} precision={2} prefix="¥"
              valueStyle={{ color: '#52c41a', fontWeight: 600 }}
              suffix={<DollarOutlined style={{ fontSize: 20, marginLeft: 8 }} />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card hoverable onClick={() => navigate('/expenses')} style={{ borderTop: '3px solid #faad14' }}>
            <Statistic title="采购成本" value={s.totalPurchaseCost} precision={2} prefix="¥"
              valueStyle={{ color: '#faad14', fontWeight: 600 }}
              suffix={<ShoppingOutlined style={{ fontSize: 20, marginLeft: 8 }} />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card hoverable style={{ borderTop: '3px solid #ff7a45' }}>
            <Statistic title="其他支出" value={s.totalExpenses} precision={2} prefix="¥"
              valueStyle={{ color: '#ff7a45', fontWeight: 600 }}
              suffix={<WalletOutlined style={{ fontSize: 20, marginLeft: 8 }} />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card hoverable style={{ borderTop: '3px solid #D4A574' }}>
            <Statistic title="净利润" value={s.netProfit} precision={2} prefix="¥"
              valueStyle={{ color: s.netProfit >= 0 ? '#3f8600' : '#cf1322', fontWeight: 600 }}
              suffix={<span style={{ fontSize: 14, marginLeft: 8 }}>{s.profitMargin}%</span>} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={14}>
          <Card title="近7天收支趋势" size="small">
            {trendOption ? <ReactECharts option={trendOption} style={{ height: 280 }} /> : <div style={{ textAlign: 'center', color: '#999', padding: 40 }}>暂无趋势数据</div>}
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Row gutter={[0, 16]}>
            <Col span={24}>
              {revenuePieOption ? (
                <Card title="收入渠道占比" size="small">
                  <ReactECharts option={revenuePieOption} style={{ height: 120 }} />
                </Card>
              ) : null}
            </Col>
            <Col span={24}>
              {expensePieOption ? (
                <Card title="支出类别占比" size="small">
                  <ReactECharts option={expensePieOption} style={{ height: 120 }} />
                </Card>
              ) : null}
            </Col>
          </Row>
        </Col>
      </Row>

      <h3 style={{ marginBottom: 12, fontSize: 16, fontWeight: 600 }}>快捷录入</h3>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card hoverable onClick={() => navigate('/expenses')} style={{ textAlign: 'center', borderRadius: 8 }}>
            <EditOutlined style={{ fontSize: 36, color: '#D4A574', marginBottom: 12 }} />
            <div style={{ fontWeight: 600, fontSize: 15 }}>手动记账</div>
            <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>录入采购与支出明细</div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card hoverable onClick={() => navigate('/expenses/voice')} style={{ textAlign: 'center', borderRadius: 8 }}>
            <AudioOutlined style={{ fontSize: 36, color: '#52c41a', marginBottom: 12 }} />
            <div style={{ fontWeight: 600, fontSize: 15 }}>语音记账</div>
            <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>说出记账内容自动识别</div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card hoverable onClick={() => navigate('/expenses/ocr')} style={{ textAlign: 'center', borderRadius: 8 }}>
            <CameraOutlined style={{ fontSize: 36, color: '#1677ff', marginBottom: 12 }} />
            <div style={{ fontWeight: 600, fontSize: 15 }}>拍照记账</div>
            <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>拍摄票据自动识别录入</div>
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} lg={12}>
          <Card title="最近收入记录" size="small" extra={<Button type="link" size="small" onClick={() => navigate('/revenue')}>查看全部</Button>}>
            <Table columns={recentRevenueColumns} dataSource={recentRevenue} rowKey="id" size="small" pagination={false}
              locale={{ emptyText: '暂无记录' }} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="最近支出记录" size="small" extra={<Button type="link" size="small" onClick={() => navigate('/expenses')}>查看全部</Button>}>
            <Table columns={recentExpenseColumns} dataSource={recentExpenses} rowKey="id" size="small" pagination={false}
              locale={{ emptyText: '暂无记录' }} />
          </Card>
        </Col>
      </Row>
    </div>
  );
}

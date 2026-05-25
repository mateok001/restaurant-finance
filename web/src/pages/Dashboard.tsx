import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Card, Statistic, Spin, Button, Space } from 'antd';
import {
  DollarOutlined, ShoppingOutlined, RiseOutlined,
  AudioOutlined, CameraOutlined, EditOutlined,
  ArrowUpOutlined, ArrowDownOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import api from '../services/api';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    api.get('/reports/profit', { params: { startDate: thirtyDaysAgo, endDate: today } })
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  const s = data || { totalRevenue: 0, totalPurchaseCost: 0, totalExpenses: 0, grossProfit: 0, netProfit: 0, profitMargin: 0 };

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>仪表盘</h2>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable onClick={() => navigate('/revenue')}>
            <Statistic title="总收入（近30天）" value={s.totalRevenue} precision={2} prefix="¥" />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable onClick={() => navigate('/expenses')}>
            <Statistic title="采购成本（近30天）" value={s.totalPurchaseCost} precision={2} prefix="¥" valueStyle={{ color: '#cf1322' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="毛利" value={s.grossProfit} precision={2} prefix="¥"
              valueStyle={{ color: s.grossProfit >= 0 ? '#3f8600' : '#cf1322' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="净利润" value={s.netProfit} precision={2} prefix="¥"
              valueStyle={{ color: s.netProfit >= 0 ? '#3f8600' : '#cf1322' }}
              suffix={`(${s.profitMargin}%)`} />
          </Card>
        </Col>
      </Row>

      <h3 style={{ marginBottom: 16 }}>快捷录入</h3>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card hoverable onClick={() => navigate('/expenses')} style={{ textAlign: 'center' }}>
            <EditOutlined style={{ fontSize: 32, color: '#D4A574', marginBottom: 8 }} />
            <div style={{ fontWeight: 500 }}>手动记账</div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card hoverable onClick={() => navigate('/expenses/voice')} style={{ textAlign: 'center' }}>
            <AudioOutlined style={{ fontSize: 32, color: '#D4A574', marginBottom: 8 }} />
            <div style={{ fontWeight: 500 }}>语音记账</div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card hoverable onClick={() => navigate('/expenses/ocr')} style={{ textAlign: 'center' }}>
            <CameraOutlined style={{ fontSize: 32, color: '#D4A574', marginBottom: 8 }} />
            <div style={{ fontWeight: 500 }}>拍照记账</div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

import { useEffect, useState, useCallback } from 'react';
import { Card, DatePicker, Button, Table, Statistic, Row, Col, Space, Spin, Input, message } from 'antd';
import { DownloadOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../services/api';
import { downloadCSV } from '../utils/download';

const { RangePicker } = DatePicker;

export default function ProductPurchaseReportPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(30, 'day'), dayjs(),
  ]);
  const [productName, setProductName] = useState('');

  const fetchData = useCallback(() => {
    if (!dateRange[0] || !dateRange[1]) return;
    setLoading(true);
    const params: any = {
      startDate: dateRange[0].format('YYYY-MM-DD'),
      endDate: dateRange[1].format('YYYY-MM-DD'),
    };
    if (productName) params.productName = productName;
    api.get('/reports/by-product', { params })
      .then((res) => setData(res.data))
      .catch(() => {}).finally(() => setLoading(false));
  }, [dateRange, productName]);

  useEffect(() => { fetchData(); }, []);

  const totalAmount = data.reduce((s, d) => s + d.totalAmount, 0);
  const totalCount = data.reduce((s, d) => s + d.count, 0);

  const handleExport = () => {
    const ts = dayjs().format('YYYYMMDD_HHmmss');
    const headers = ['商品', '规格', '采购次数', '总数量', '总金额'];
    const rows = data.map((d: any) => [d.name, d.unit || '-', d.count, d.totalQuantity, d.totalAmount]);
    downloadCSV(headers, rows, `商品采购报表_${ts}.csv`);
    message.success('导出成功');
  };

  const handleSearch = (value: string) => {
    setProductName(value);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>商品采购报表</h2>
        <Space>
          <span style={{ color: '#666', fontSize: 13 }}>数据范围：</span>
          <RangePicker value={dateRange} onChange={(v) => v && setDateRange([v[0]!, v[1]!])} allowClear={false} />
          <Button type="primary" onClick={fetchData}>查询</Button>
        </Space>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Input.Search
          placeholder="搜索商品名称"
          allowClear
          onSearch={handleSearch}
          style={{ width: 260 }}
          prefix={<SearchOutlined />}
        />
        <Button size="small" icon={<DownloadOutlined />} onClick={handleExport}>导出CSV</Button>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12}>
          <Card hoverable size="small">
            <Statistic title="采购总金额" value={totalAmount} precision={2} prefix="¥" valueStyle={{ fontWeight: 600 }} />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card hoverable size="small">
            <Statistic title="采购记录数" value={totalCount} valueStyle={{ fontWeight: 600 }} />
          </Card>
        </Col>
      </Row>

      <Spin spinning={loading}>
        <Table dataSource={data} rowKey="productId" size="small"
          columns={[
            { title: '商品', dataIndex: 'name', width: 150 },
            { title: '规格', dataIndex: 'unit', width: 80, render: (v: string | null) => v || '-' },
            { title: '采购次数', dataIndex: 'count', width: 100, sorter: (a: any, b: any) => a.count - b.count },
            { title: '总数量', dataIndex: 'totalQuantity', width: 120, render: (v: number) => Number(v).toLocaleString(), sorter: (a: any, b: any) => a.totalQuantity - b.totalQuantity },
            { title: '总金额', dataIndex: 'totalAmount', width: 150, render: (v: number) => `¥${Number(v).toLocaleString()}`, sorter: (a: any, b: any) => a.totalAmount - b.totalAmount },
          ]}
          pagination={{ pageSize: 30 }}
          locale={{ emptyText: '暂无数据' }}
        />
      </Spin>
    </div>
  );
}

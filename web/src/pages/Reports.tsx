import { useEffect, useState } from 'react';
import { Card, DatePicker, Select, Button, Table, Statistic, Row, Col, Space, Spin, Tabs } from 'antd';
import { BarChartOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import dayjs from 'dayjs';
import api from '../services/api';

const { RangePicker } = DatePicker;

export default function ReportsPage() {
  const [loading, setLoading] = useState(false);
  const [profit, setProfit] = useState<any>(null);
  const [byProduct, setByProduct] = useState<any[]>([]);
  const [bySupplier, setBySupplier] = useState<any[]>([]);
  const [salaryReport, setSalaryReport] = useState<any>(null);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(30, 'day'), dayjs(),
  ]);

  const fetchReports = () => {
    if (!dateRange[0] || !dateRange[1]) return;
    setLoading(true);
    const params = {
      startDate: dateRange[0].format('YYYY-MM-DD'),
      endDate: dateRange[1].format('YYYY-MM-DD'),
    };

    Promise.all([
      api.get('/reports/profit', { params }),
      api.get('/reports/by-product', { params }),
      api.get('/reports/by-supplier', { params }),
      api.get('/salaries/report', {
        params: { periodStart: params.startDate, periodEnd: params.endDate },
      }),
    ]).then(([p, prod, supp, sal]) => {
      setProfit(p.data);
      setByProduct(prod.data);
      setBySupplier(supp.data);
      setSalaryReport(sal.data);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchReports(); }, []);

  const revenuePieOption = profit?.revenueByChannel ? {
    tooltip: { trigger: 'item' },
    series: [{
      type: 'pie', radius: ['40%', '70%'],
      data: Object.entries(profit.revenueByChannel).map(([k, v]) => ({ name: k, value: v })),
    }],
  } : null;

  const expensePieOption = profit?.expensesByCategory ? {
    tooltip: { trigger: 'item' },
    series: [{
      type: 'pie', radius: ['40%', '70%'],
      data: Object.entries(profit.expensesByCategory).map(([k, v]) => ({
        name: { salary: '工资', rent: '房租', utilities: '水电', gas: '煤气', maintenance: '维修', other: '其他' }[k] || k,
        value: v,
      })),
    }],
  } : null;

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>报表中心</h2>
      <Space style={{ marginBottom: 16 }}>
        <RangePicker value={dateRange} onChange={(v) => v && setDateRange([v[0]!, v[1]!])} />
        <Button type="primary" onClick={fetchReports}>查询</Button>
      </Space>

      <Tabs items={[
        {
          key: 'profit', label: '利润概览',
          children: (
            <>
              <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col span={6}><Card><Statistic title="总收入" value={profit?.totalRevenue || 0} precision={2} prefix="¥" /></Card></Col>
                <Col span={6}><Card><Statistic title="采购成本" value={profit?.totalPurchaseCost || 0} precision={2} prefix="¥" /></Card></Col>
                <Col span={6}><Card><Statistic title="其他支出" value={profit?.totalExpenses || 0} precision={2} prefix="¥" /></Card></Col>
                <Col span={6}><Card><Statistic title="净利润" value={profit?.netProfit || 0} precision={2} prefix="¥"
                  valueStyle={{ color: (profit?.netProfit || 0) >= 0 ? '#3f8600' : '#cf1322' }} suffix={`(${profit?.profitMargin || 0}%)`} /></Card></Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>{revenuePieOption && <ReactECharts option={revenuePieOption} style={{ height: 300 }} />}</Col>
                <Col span={12}>{expensePieOption && <ReactECharts option={expensePieOption} style={{ height: 300 }} />}</Col>
              </Row>
            </>
          ),
        },
        {
          key: 'product', label: '商品采购',
          children: (
            <Table dataSource={byProduct} rowKey="productId" size="small"
              columns={[
                { title: '商品', dataIndex: 'name' },
                { title: '采购次数', dataIndex: 'count' },
                { title: '总数量', dataIndex: 'totalQuantity', render: (v: number) => Number(v).toLocaleString() },
                { title: '总金额', dataIndex: 'totalAmount', render: (v: number) => `¥${Number(v).toLocaleString()}` },
              ]}
              pagination={false} />
          ),
        },
        {
          key: 'supplier', label: '供应商采购',
          children: (
            <Table dataSource={bySupplier} rowKey="supplierId" size="small"
              columns={[
                { title: '供应商', dataIndex: 'name' },
                { title: '采购次数', dataIndex: 'count' },
                { title: '总金额', dataIndex: 'totalAmount', render: (v: number) => `¥${Number(v).toLocaleString()}` },
              ]}
              pagination={false} />
          ),
        },
        {
          key: 'salary', label: '工资报表',
          children: salaryReport ? (
            <>
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={8}><Card><Statistic title="工资总额(应发)" value={salaryReport.total?.grossSalary || 0} precision={2} prefix="¥" /></Card></Col>
                <Col span={8}><Card><Statistic title="工资总额(实发)" value={salaryReport.total?.netSalary || 0} precision={2} prefix="¥" /></Card></Col>
                <Col span={8}><Card><Statistic title="记录数" value={salaryReport.total?.recordCount || 0} /></Card></Col>
              </Row>
              <h4>按岗位统计</h4>
              <Table dataSource={salaryReport.byPosition} rowKey="position" size="small"
                columns={[
                  { title: '岗位', dataIndex: 'position' },
                  { title: '人数(人次)', dataIndex: 'count' },
                  { title: '应发总额', dataIndex: 'totalGross', render: (v: number) => `¥${Number(v).toLocaleString()}` },
                  { title: '实发总额', dataIndex: 'totalNet', render: (v: number) => `¥${Number(v).toLocaleString()}` },
                ]} pagination={false} />
            </>
          ) : null,
        },
      ]} />
    </div>
  );
}

import { useEffect, useState, useCallback } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, DatePicker, Select, Popconfirm, message, Space, Tag, Card, Statistic, Row, Col } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../services/api';

export default function RevenuePage() {
  const [channels, setChannels] = useState<any[]>([]);
  const [revenues, setRevenues] = useState<any>({ items: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [revenueModalOpen, setRevenueModalOpen] = useState(false);
  const [channelModalOpen, setChannelModalOpen] = useState(false);
  const [editingRevenue, setEditingRevenue] = useState<string | null>(null);
  const [editingChannel, setEditingChannel] = useState<string | null>(null);
  const [revenueForm] = Form.useForm();
  const [channelForm] = Form.useForm();

  const now = dayjs();

  // 日期筛选
  const [filterYear, setFilterYear] = useState<number>(now.year());
  const [filterMonth, setFilterMonth] = useState<number>(0);
  const [filterDay, setFilterDay] = useState<number>(0);

  const yearOptions = [{ label: '全部年', value: 0 }];
  for (let y = now.year() - 5; y <= now.year(); y++) {
    yearOptions.push({ label: `${y}年`, value: y });
  }

  const monthOptions = [
    { label: '全部月', value: 0 },
    ...Array.from({ length: 12 }, (_, i) => ({ label: `${i + 1}月`, value: i + 1 })),
  ];

  const dayOptions = [
    { label: '全部日', value: 0 },
    ...Array.from({ length: 31 }, (_, i) => ({ label: `${i + 1}日`, value: i + 1 })),
  ];

  const fetchChannels = () => api.get('/revenue-channels').then((r) => setChannels(r.data));
  const fetchRevenues = useCallback(() => {
    setLoading(true);
    const params: any = { pageSize: 200 };

    if (filterYear > 0) {
      let start: string, end: string;
      if (filterMonth > 0) {
        const m = String(filterMonth).padStart(2, '0');
        if (filterDay > 0) {
          const d = String(filterDay).padStart(2, '0');
          start = `${filterYear}-${m}-${d}`;
          end = `${filterYear}-${m}-${d}`;
        } else {
          start = dayjs(`${filterYear}-${m}-01`).startOf('month').format('YYYY-MM-DD');
          end = dayjs(`${filterYear}-${m}-01`).endOf('month').format('YYYY-MM-DD');
        }
      } else {
        start = dayjs(`${filterYear}-01-01`).startOf('year').format('YYYY-MM-DD');
        end = dayjs(`${filterYear}-12-31`).endOf('year').format('YYYY-MM-DD');
      }
      params.startDate = start;
      params.endDate = end;
    }

    api.get('/daily-revenue', { params })
      .then((r) => setRevenues(r.data)).finally(() => setLoading(false));
  }, [filterYear, filterMonth, filterDay]);

  useEffect(() => { fetchChannels(); fetchRevenues(); }, [fetchRevenues]);

  const handleRevenueSubmit = async (values: any) => {
    try {
      const data = { ...values, revenueDate: values.revenueDate.format('YYYY-MM-DD') };
      if (editingRevenue) {
        await api.put(`/daily-revenue/${editingRevenue}`, data);
        message.success('收入记录已更新');
      } else {
        await api.post('/daily-revenue', data);
        message.success('收入记录成功');
      }
      setRevenueModalOpen(false);
      setEditingRevenue(null);
      revenueForm.resetFields();
      fetchRevenues();
    } catch (err: any) {
      message.error(err.response?.data?.error || '操作失败');
    }
  };

  const handleChannelSubmit = async (values: any) => {
    try {
      if (editingChannel) {
        await api.put(`/revenue-channels/${editingChannel}`, values);
        message.success('渠道已更新');
      } else {
        await api.post('/revenue-channels', values);
        message.success('渠道添加成功');
      }
      setChannelModalOpen(false);
      setEditingChannel(null);
      channelForm.resetFields();
      fetchChannels();
    } catch (err: any) {
      message.error(err.response?.data?.error || '操作失败');
    }
  };

  const handleDeleteRevenue = async (id: string) => {
    await api.delete(`/daily-revenue/${id}`);
    message.success('已删除');
    fetchRevenues();
  };

  const handleDeleteChannel = async (id: string) => {
    try {
      await api.delete(`/revenue-channels/${id}`);
      message.success('渠道已删除');
      fetchChannels();
    } catch (err: any) {
      message.error(err.response?.data?.error || '删除失败');
    }
  };

  const handleEditRevenue = (record: any) => {
    setEditingRevenue(record.id);
    revenueForm.setFieldsValue({
      ...record,
      revenueDate: dayjs(record.revenueDate),
    });
    setRevenueModalOpen(true);
  };

  const handleEditChannel = (record: any) => {
    setEditingChannel(record.id);
    channelForm.setFieldsValue(record);
    setChannelModalOpen(true);
  };

  const totalAmount = revenues.items.reduce((s: number, r: any) => s + Number(r.amount), 0);

  const revenueColumns = [
    { title: '日期', dataIndex: 'revenueDate', render: (d: string) => dayjs(d).format('YYYY-MM-DD'), width: 120 },
    { title: '渠道', dataIndex: 'channel', render: (c: any) => c?.name, width: 130 },
    { title: '金额', dataIndex: 'amount', render: (a: number) => `¥${Number(a).toLocaleString()}`, width: 150 },
    { title: '记录人', dataIndex: 'recorder', render: (r: any) => r?.displayName, width: 100 },
    { title: '备注', dataIndex: 'memo', width: 180, ellipsis: true },
    {
      title: '操作', width: 140,
      render: (_: any, record: any) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEditRevenue(record)}>编辑</Button>
          <Popconfirm title="确认删除?" onConfirm={() => handleDeleteRevenue(record.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const channelColumns = [
    { title: '渠道名称', dataIndex: 'name', width: 150 },
    { title: '排序', dataIndex: 'sortOrder', width: 80 },
    {
      title: '类型', dataIndex: 'isDefault', width: 80,
      render: (v: boolean) => v ? <Tag color="gold">默认</Tag> : <Tag>自定义</Tag>,
    },
    {
      title: '操作', width: 140,
      render: (_: any, record: any) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEditChannel(record)}>编辑</Button>
          <Popconfirm
            title={record.isDefault ? '默认渠道不可删除' : '确认删除此渠道?'}
            onConfirm={() => !record.isDefault && handleDeleteChannel(record.id)}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />} disabled={record.isDefault}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <h2 style={{ marginBottom: 16, fontSize: 20, fontWeight: 600 }}>收入管理</h2>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12}>
          <Card hoverable size="small">
            <Statistic title="总计收入" value={totalAmount} precision={2} prefix="¥" valueStyle={{ fontWeight: 600, fontSize: 20 }} />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card hoverable size="small">
            <Statistic title="记录数" value={revenues.total} valueStyle={{ fontWeight: 600, fontSize: 20 }} />
          </Card>
        </Col>
      </Row>

      <Card title="收入渠道" size="small" style={{ marginBottom: 16 }}
        extra={<Button type="link" icon={<PlusOutlined />} onClick={() => { setEditingChannel(null); channelForm.resetFields(); setChannelModalOpen(true); }}>添加渠道</Button>}>
        <Table columns={channelColumns} dataSource={channels} rowKey="id" size="small"
          pagination={false} showHeader={true} locale={{ emptyText: '暂无渠道' }} />
      </Card>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Space>
          <span style={{ color: '#666', fontSize: 13 }}>筛选日期：</span>
          <Select value={filterYear} onChange={(v) => setFilterYear(v)} options={yearOptions} style={{ width: 95 }} />
          <Select value={filterMonth} onChange={(v) => setFilterMonth(v)} options={monthOptions} style={{ width: 85 }} />
          <Select value={filterDay} onChange={(v) => setFilterDay(v)} options={dayOptions} style={{ width: 85 }} />
          <Button icon={<SearchOutlined />} onClick={fetchRevenues}>查询</Button>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingRevenue(null); revenueForm.resetFields(); revenueForm.setFieldsValue({ revenueDate: dayjs() }); setRevenueModalOpen(true); }}>
          记录收入
        </Button>
      </div>

      <Table columns={revenueColumns} dataSource={revenues.items} rowKey="id" loading={loading}
        pagination={{ pageSize: 30, showSizeChanger: true, showTotal: (t: number) => `共 ${t} 条` }} size="small" />

      <Modal
        title={(editingRevenue ? '编辑' : '新增') + '收入记录'}
        open={revenueModalOpen}
        onCancel={() => { setRevenueModalOpen(false); setEditingRevenue(null); }}
        onOk={() => revenueForm.submit()}
        destroyOnClose
      >
        <Form form={revenueForm} layout="vertical" onFinish={handleRevenueSubmit}>
          <Form.Item name="channelId" label="收入渠道" rules={[{ required: true, message: '请选择渠道' }]}>
            <Select options={channels.map((c: any) => ({ label: c.name, value: c.id }))} placeholder="选择渠道" />
          </Form.Item>
          <Form.Item name="amount" label="金额" rules={[{ required: true, message: '请输入金额' }]}>
            <InputNumber min={0} step={0.01} style={{ width: '100%' }} prefix="¥" placeholder="0.00" />
          </Form.Item>
          <Form.Item name="revenueDate" label="日期" rules={[{ required: true, message: '请选择日期' }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="memo" label="备注"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      <Modal
        title={(editingChannel ? '编辑' : '添加') + '收入渠道'}
        open={channelModalOpen}
        onCancel={() => { setChannelModalOpen(false); setEditingChannel(null); }}
        onOk={() => channelForm.submit()}
        destroyOnClose
      >
        <Form form={channelForm} layout="vertical" onFinish={handleChannelSubmit}>
          <Form.Item name="name" label="渠道名称" rules={[{ required: true, message: '请输入渠道名称' }]}>
            <Input placeholder="如：美团外卖" />
          </Form.Item>
          <Form.Item name="sortOrder" label="排序" initialValue={0}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

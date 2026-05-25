import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, DatePicker, Select, Popconfirm, message, Space, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../services/api';

export default function RevenuePage() {
  const [channels, setChannels] = useState<any[]>([]);
  const [revenues, setRevenues] = useState<any>({ items: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [channelModalOpen, setChannelModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [channelForm] = Form.useForm();

  const fetchChannels = () => api.get('/revenue-channels').then((r) => setChannels(r.data));
  const fetchRevenues = () => {
    setLoading(true);
    api.get('/daily-revenue', { params: { pageSize: 100 } }).then((r) => setRevenues(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { fetchChannels(); fetchRevenues(); }, []);

  const handleAddRevenue = async (values: any) => {
    await api.post('/daily-revenue', { ...values, revenueDate: values.revenueDate.format('YYYY-MM-DD') });
    message.success('收入记录成功');
    setModalOpen(false);
    form.resetFields();
    fetchRevenues();
  };

  const handleAddChannel = async (values: any) => {
    await api.post('/revenue-channels', values);
    message.success('渠道添加成功');
    setChannelModalOpen(false);
    channelForm.resetFields();
    fetchChannels();
  };

  const handleDeleteRevenue = async (id: string) => {
    await api.delete(`/daily-revenue/${id}`);
    message.success('已删除');
    fetchRevenues();
  };

  const revenueColumns = [
    { title: '日期', dataIndex: 'revenueDate', render: (d: string) => dayjs(d).format('YYYY-MM-DD'), width: 120 },
    {
      title: '渠道', dataIndex: 'channel', render: (c: any) => c?.name, width: 120,
    },
    { title: '金额', dataIndex: 'amount', render: (a: number) => `¥${Number(a).toLocaleString()}`, width: 150 },
    { title: '记录人', dataIndex: 'recorder', render: (r: any) => r?.displayName, width: 100 },
    { title: '备注', dataIndex: 'memo', width: 200 },
    {
      title: '操作', width: 100,
      render: (_: any, record: any) => (
        <Popconfirm title="确认删除?" onConfirm={() => handleDeleteRevenue(record.id)}>
          <Button type="link" danger size="small">删除</Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>收入管理</h2>

      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>记录收入</Button>
        <Button onClick={() => setChannelModalOpen(true)}>管理渠道</Button>
      </Space>

      <h4 style={{ marginBottom: 8 }}>收入渠道</h4>
      <Space wrap style={{ marginBottom: 16 }}>
        {channels.map((ch: any) => (
          <Tag key={ch.id} color={ch.isDefault ? 'gold' : 'default'}>{ch.name}</Tag>
        ))}
      </Space>

      <Table columns={revenueColumns} dataSource={revenues.items} rowKey="id" loading={loading}
        pagination={{ pageSize: 30, total: revenues.total }} size="small" />

      <Modal title="记录收入" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={handleAddRevenue}>
          <Form.Item name="channelId" label="收入渠道" rules={[{ required: true }]}>
            <Select options={channels.map((c: any) => ({ label: c.name, value: c.id }))} />
          </Form.Item>
          <Form.Item name="amount" label="金额" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} prefix="¥" />
          </Form.Item>
          <Form.Item name="revenueDate" label="日期" rules={[{ required: true }]} initialValue={dayjs()}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="memo" label="备注"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      <Modal title="添加收入渠道" open={channelModalOpen} onCancel={() => setChannelModalOpen(false)} onOk={() => channelForm.submit()}>
        <Form form={channelForm} layout="vertical" onFinish={handleAddChannel}>
          <Form.Item name="name" label="渠道名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="sortOrder" label="排序" initialValue={0}><InputNumber min={0} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

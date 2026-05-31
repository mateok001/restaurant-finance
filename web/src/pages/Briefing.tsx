import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Select, DatePicker, Image, message, Space, Tag, Spin } from 'antd';
import { FileImageOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../services/api';

const { RangePicker } = DatePicker;

const typeLabels: Record<string, string> = {
  daily: '日报', weekly: '周报', monthly: '月报', quarterly: '季报',
};

export default function BriefingPage() {
  const [data, setData] = useState<any>({ items: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [form] = Form.useForm();

  const fetchData = () => {
    setLoading(true);
    api.get('/briefing', { params: { pageSize: 50 } })
      .then((r) => setData(r.data))
      .catch((err) => {
        message.error('加载简报数据失败');
        console.error('Briefing fetch error:', err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleGenerate = async (values: any) => {
    setGenerating(true);
    try {
      const payload = {
        type: values.type,
        periodStart: values.dateRange[0].format('YYYY-MM-DD'),
        periodEnd: values.dateRange[1].format('YYYY-MM-DD'),
      };
      const res = await api.post('/briefing/generate', payload);
      message.success('简报生成成功');
      setModalOpen(false);
      form.resetFields();
      fetchData();
      if (res.data.imageUrl) setPreviewUrl(res.data.imageUrl);
    } catch (err: any) {
      message.error(err.response?.data?.error || '生成失败');
    } finally {
      setGenerating(false);
    }
  };

  const columns = [
    { title: '类型', dataIndex: 'type', width: 80, render: (v: string) => <Tag color="gold">{typeLabels[v] || v}</Tag> },
    { title: '周期', key: 'period', width: 200, render: (_: any, r: any) =>
      `${dayjs(r.periodStart).format('YYYY-MM-DD')} ~ ${dayjs(r.periodEnd).format('YYYY-MM-DD')}` },
    { title: '生成时间', dataIndex: 'generatedAt', width: 160, render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm') },
    {
      title: '图片', dataIndex: 'imageUrl', width: 80,
      render: (url: string) => url ? (
        <Button type="link" size="small" icon={<FileImageOutlined />} onClick={() => setPreviewUrl(url)}>查看</Button>
      ) : '-',
    },
  ];

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>经营简报</h2>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<FileImageOutlined />} onClick={() => setModalOpen(true)}>生成简报</Button>
        <Button icon={<ReloadOutlined />} onClick={fetchData}>刷新</Button>
      </Space>

      <Table columns={columns} dataSource={data.items} rowKey="id" loading={loading} size="small" pagination={{ pageSize: 20 }} />

      <Modal title="生成经营简报" open={modalOpen}
        onCancel={() => setModalOpen(false)} onOk={() => form.submit()}
        confirmLoading={generating} width={520}>
        <Form form={form} layout="vertical" onFinish={handleGenerate}>
          <Form.Item name="type" label="简报类型" rules={[{ required: true }]}>
            <Select options={[
              { label: '日报', value: 'daily' }, { label: '周报', value: 'weekly' },
              { label: '月报', value: 'monthly' }, { label: '季报', value: 'quarterly' },
            ]} />
          </Form.Item>
          <Form.Item name="dateRange" label="日期范围" rules={[{ required: true }]}>
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="简报预览" open={!!previewUrl} footer={null} width={800}
        onCancel={() => setPreviewUrl(null)}>
        {previewUrl && <Image src={previewUrl} style={{ width: '100%' }} />}
      </Modal>
    </div>
  );
}

import { useEffect, useState, useCallback } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, DatePicker, AutoComplete, Popconfirm, message, Space, Upload, Tag, Card, Statistic, Row, Col, Select } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../services/api';

const now = dayjs();

export default function ExpenseManagementPage() {
  const [data, setData] = useState<any>({ items: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form] = Form.useForm();
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [invoiceTarget, setInvoiceTarget] = useState<string | null>(null);

  // Year/month filter
  const [filterYear, setFilterYear] = useState<number>(now.year());
  const [filterMonth, setFilterMonth] = useState<number>(now.month() + 1);

  const yearOptions = [{ label: '全部年', value: 0 }];
  for (let y = now.year() - 5; y <= now.year(); y++) {
    yearOptions.push({ label: `${y}年`, value: y });
  }

  const monthOptions = [
    { label: '全年', value: 0 },
    ...Array.from({ length: 12 }, (_, i) => ({ label: `${i + 1}月`, value: i + 1 })),
  ];

  const fetchData = useCallback(() => {
    setLoading(true);
    const params: any = { pageSize: 200 };

    if (filterMonth === 0) {
      params.startDate = dayjs(`${filterYear}-01-01`).startOf('year').format('YYYY-MM-DD');
      params.endDate = dayjs(`${filterYear}-12-31`).endOf('year').format('YYYY-MM-DD');
    } else {
      const m = String(filterMonth).padStart(2, '0');
      params.startDate = dayjs(`${filterYear}-${m}-01`).startOf('month').format('YYYY-MM-DD');
      params.endDate = dayjs(`${filterYear}-${m}-01`).endOf('month').format('YYYY-MM-DD');
    }

    api.get('/expenses', { params })
      .then((r) => setData(r.data)).finally(() => setLoading(false));
  }, [filterYear, filterMonth]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async (values: any) => {
    try {
      const data = { ...values };
      if (data.expenseDate) data.expenseDate = data.expenseDate.format('YYYY-MM-DD');

      if (editing) {
        await api.put(`/expenses/${editing}`, data);
        message.success('支出记录已更新');
      } else {
        await api.post('/expenses', data);
        message.success('支出记录已添加');
      }
      setModalOpen(false);
      setEditing(null);
      form.resetFields();
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.error || '操作失败');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/expenses/${id}`);
      message.success('已删除');
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.error || '删除失败');
    }
  };

  const handleEdit = (record: any) => {
    setEditing(record.id);
    form.setFieldsValue({
      category: record.category,
      amount: record.amount,
      expenseDate: dayjs(record.expenseDate),
      description: record.description,
    });
    setModalOpen(true);
  };

  const handleUploadInvoice = async (file: File) => {
    if (!invoiceTarget) return;
    const formData = new FormData();
    formData.append('invoice', file);
    await api.post(`/expenses/${invoiceTarget}/invoice`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    message.success('发票上传成功');
    setInvoiceModalOpen(false);
    setInvoiceTarget(null);
    fetchData();
  };

  const openCreateModal = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ expenseDate: dayjs() });
    setModalOpen(true);
  };

  const totalAmount = data.items.reduce((s: number, r: any) => s + Number(r.amount), 0);

  const columns = [
    { title: '日期', dataIndex: 'expenseDate', render: (d: string) => dayjs(d).format('YYYY-MM-DD'), width: 110 },
    {
      title: '类别', dataIndex: 'category', width: 100,
      render: (v: string) => ({ salary: '工资', rent: '房租', utilities: '水电', gas: '煤气', maintenance: '维修', other: '其他' } as any)[v] || v,
    },
    { title: '金额', dataIndex: 'amount', render: (v: number) => `¥${Number(v).toLocaleString()}`, width: 120 },
    { title: '说明', dataIndex: 'description', width: 200, ellipsis: true },
    {
      title: '发票', dataIndex: 'invoiceFileUrl', width: 70,
      render: (url: string) => url ? <Tag color="green">已上传</Tag> : <Tag color="default">无</Tag>,
    },
    { title: '记录人', dataIndex: 'recorder', render: (r: any) => r?.displayName, width: 80 },
    {
      title: '操作', width: 200, fixed: 'right' as const,
      render: (_: any, record: any) => {
        const isSalaryLinked = record.category === 'salary';
        return (
          <Space size="small">
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>
            <Button type="link" size="small" icon={<UploadOutlined />} onClick={() => { setInvoiceTarget(record.id); setInvoiceModalOpen(true); }}>发票</Button>
            <Popconfirm
              title={isSalaryLinked ? '此支出关联工资记录，不可删除' : '确认删除此支出记录?'}
              onConfirm={() => !isSalaryLinked && handleDelete(record.id)}
            >
              <Button type="link" size="small" danger icon={<DeleteOutlined />} disabled={isSalaryLinked}>删除</Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <h2 style={{ marginBottom: 16, fontSize: 20, fontWeight: 600 }}>费用支出</h2>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12}>
          <Card hoverable size="small">
            <Statistic title="总计金额" value={totalAmount} precision={2} prefix="¥" valueStyle={{ fontWeight: 600, fontSize: 20 }} />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card hoverable size="small">
            <Statistic title="记录数" value={data.total} valueStyle={{ fontWeight: 600, fontSize: 20 }} />
          </Card>
        </Col>
      </Row>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Space>
          <span style={{ color: '#666', fontSize: 13 }}>筛选月份：</span>
          <Select value={filterYear} onChange={(v) => setFilterYear(v)} options={yearOptions} style={{ width: 95 }} />
          <Select value={filterMonth} onChange={(v) => setFilterMonth(v)} options={monthOptions} style={{ width: 85 }} />
          <Button icon={<SearchOutlined />} onClick={fetchData}>查询</Button>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>新增支出</Button>
      </div>

      <Table columns={columns} dataSource={data.items} rowKey="id" loading={loading}
        size="small" scroll={{ x: 900 }} pagination={{ pageSize: 30, showSizeChanger: true, showTotal: (t: number) => `共 ${t} 条` }} />

      <Modal
        title={(editing ? '编辑' : '新增') + '支出记录'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditing(null); }}
        onOk={() => form.submit()}
        width={500}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="category" label="支出类别" rules={[{ required: true, message: '请选择或输入类别' }]}>
            <AutoComplete
              placeholder="选择或输入支出类别（新类别将自动保存）"
              options={[
                { label: '房租', value: 'rent' }, { label: '水电费', value: 'utilities' },
                { label: '煤气费', value: 'gas' }, { label: '维修', value: 'maintenance' },
                { label: '其他', value: 'other' },
              ]}
              filterOption={(inputValue, option) =>
                option!.label.toLowerCase().includes(inputValue.toLowerCase())
              }
              allowClear
            />
          </Form.Item>
          <Form.Item name="amount" label="金额" rules={[{ required: true, message: '请输入金额' }]}>
            <InputNumber min={0} step={0.01} style={{ width: '100%' }} prefix="¥" placeholder="0.00" />
          </Form.Item>
          <Form.Item name="expenseDate" label="日期" rules={[{ required: true, message: '请选择日期' }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="description" label="说明"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      <Modal
        title="上传发票"
        open={invoiceModalOpen}
        onCancel={() => { setInvoiceModalOpen(false); setInvoiceTarget(null); }}
        footer={null}
        width={400}
      >
        <Upload.Dragger
          accept="image/*,.pdf"
          maxCount={1}
          beforeUpload={(file) => { handleUploadInvoice(file); return false; }}
          showUploadList={false}
        >
          <p className="ant-upload-drag-icon"><UploadOutlined style={{ fontSize: 36, color: '#D4A574' }} /></p>
          <p>点击或拖拽上传发票图片/PDF</p>
        </Upload.Dragger>
      </Modal>
    </div>
  );
}

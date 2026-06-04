import { useEffect, useState, useCallback } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, DatePicker, Select, AutoComplete, Popconfirm, message, Space, Upload, Tag, Card, Statistic, Row, Col } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../services/api';

const unitOptions = ['斤','公斤','个','箱','捆','袋','包','瓶','桶','把','只','条','份','盘','件','套'].map(u => ({ label: u, value: u }));

const now = dayjs();

export default function PurchaseManagementPage() {
  const [data, setData] = useState<any>({ items: [], total: 0 });
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form] = Form.useForm();
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [invoiceTarget, setInvoiceTarget] = useState<string | null>(null);

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

  const fetchData = useCallback(() => {
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

    Promise.all([
      api.get('/purchases', { params }),
      api.get('/suppliers', { params: { pageSize: 200 } }),
      api.get('/products', { params: { pageSize: 200 } }),
    ]).then(([p, s, pr]) => {
      setData(p.data);
      setSuppliers(s.data.items);
      setProducts(pr.data.items);
    }).finally(() => setLoading(false));
  }, [filterYear, filterMonth, filterDay]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async (values: any) => {
    try {
      const data = { ...values };
      if (data.purchaseDate) data.purchaseDate = data.purchaseDate.format('YYYY-MM-DD');

      if (!data.totalAmount || Number(data.totalAmount) <= 0) {
        message.error('请输入总价');
        return;
      }

      if (editing) {
        await api.put(`/purchases/${editing}`, data);
        message.success('采购记录已更新');
      } else {
        data.inputMethod = 'manual';
        await api.post('/purchases', data);
        message.success('采购记录已添加');
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
      await api.delete(`/purchases/${id}`);
      message.success('已删除');
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.error || '删除失败');
    }
  };

  const handleEdit = (record: any) => {
    setEditing(record.id);
    form.setFieldsValue({
      supplierId: record.supplierId,
      productId: record.productId,
      unit: record.unit,
      quantity: record.quantity,
      unitPrice: record.unitPrice,
      totalAmount: record.totalAmount,
      purchaseDate: dayjs(record.purchaseDate),
      memo: record.memo,
    });
    setModalOpen(true);
  };

  const handleUploadInvoice = async (file: File) => {
    if (!invoiceTarget) return;
    const formData = new FormData();
    formData.append('invoice', file);
    await api.post(`/purchases/${invoiceTarget}/invoice`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    message.success('发票上传成功');
    setInvoiceModalOpen(false);
    setInvoiceTarget(null);
    fetchData();
  };

  const openCreateModal = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ purchaseDate: dayjs() });
    setModalOpen(true);
  };

  const totalAmount = data.items.reduce((s: number, r: any) => s + Number(r.totalAmount), 0);

  const columns = [
    { title: '日期', dataIndex: 'purchaseDate', render: (d: string) => dayjs(d).format('YYYY-MM-DD'), width: 110 },
    { title: '供应商', dataIndex: 'supplier', render: (s: any) => s?.name, width: 120 },
    { title: '商品', dataIndex: 'product', render: (p: any) => p?.name, width: 120 },
    { title: '单位', dataIndex: 'unit', width: 60, render: (v: string) => v || '-' },
    { title: '数量', dataIndex: 'quantity', render: (v: number) => Number(v).toLocaleString(), width: 80 },
    { title: '单价', dataIndex: 'unitPrice', render: (v: number) => `¥${Number(v).toFixed(2)}`, width: 100 },
    { title: '金额', dataIndex: 'totalAmount', render: (v: number) => `¥${Number(v).toLocaleString()}`, width: 120 },
    {
      title: '方式', dataIndex: 'inputMethod', width: 70,
      render: (v: string) => ({ manual: '手动' } as any)[v] || v,
    },
    {
      title: '发票', dataIndex: 'invoiceFileUrl', width: 70,
      render: (url: string) => url ? <Tag color="green">已上传</Tag> : <Tag color="default">无</Tag>,
    },
    { title: '记录人', dataIndex: 'recorder', render: (r: any) => r?.displayName, width: 80 },
    {
      title: '操作', width: 200, fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>
          <Button type="link" size="small" icon={<UploadOutlined />} onClick={() => { setInvoiceTarget(record.id); setInvoiceModalOpen(true); }}>发票</Button>
          <Popconfirm title="确认删除此采购记录?" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <h2 style={{ marginBottom: 16, fontSize: 20, fontWeight: 600 }}>采购管理</h2>

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
          <span style={{ color: '#666', fontSize: 13 }}>筛选日期：</span>
          <Select value={filterYear} onChange={(v) => setFilterYear(v)} options={yearOptions} style={{ width: 95 }} />
          <Select value={filterMonth} onChange={(v) => setFilterMonth(v)} options={monthOptions} style={{ width: 85 }} />
          <Select value={filterDay} onChange={(v) => setFilterDay(v)} options={dayOptions} style={{ width: 85 }} />
          <Button icon={<SearchOutlined />} onClick={fetchData}>查询</Button>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>新增采购</Button>
      </div>

      <Table columns={columns} dataSource={data.items} rowKey="id" loading={loading}
        size="small" scroll={{ x: 1200 }} pagination={{ pageSize: 30, showSizeChanger: true, showTotal: (t: number) => `共 ${t} 条` }} />

      <Modal
        title={(editing ? '编辑' : '新增') + '采购记录'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditing(null); }}
        onOk={() => form.submit()}
        width={500}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="supplierId" label="供应商" rules={[{ required: true, message: '请选择或输入供应商' }]}>
            <AutoComplete
              placeholder="选择或输入供应商名称（新供应商将自动创建）"
              options={suppliers.map((s: any) => ({ label: s.name, value: s.id }))}
              filterOption={(inputValue, option) =>
                option!.label.toLowerCase().includes(inputValue.toLowerCase())
              }
              allowClear
            />
          </Form.Item>
          <Form.Item name="productId" label="商品" rules={[{ required: true, message: '请选择或输入商品' }]}>
            <AutoComplete
              placeholder="选择或输入商品名称（新商品将自动创建）"
              options={products.map((p: any) => ({ label: p.name, value: p.id }))}
              filterOption={(inputValue, option) =>
                option!.label.toLowerCase().includes(inputValue.toLowerCase())
              }
              allowClear
            />
          </Form.Item>
          <Form.Item name="unit" label="单位">
            <Select allowClear placeholder="选择单位（可选）" options={unitOptions} />
          </Form.Item>
          <Form.Item name="quantity" label="数量（可选）">
            <InputNumber min={0} step={0.1} style={{ width: '100%' }} placeholder="0"
              onChange={(val) => {
                if (val == null) return;
                const up = form.getFieldValue('unitPrice');
                if (up) form.setFieldsValue({ totalAmount: Number((val * up).toFixed(2)) });
              }} />
          </Form.Item>
          <Form.Item name="unitPrice" label="单价（可选）">
            <InputNumber min={0} step={0.01} style={{ width: '100%' }} prefix="¥" placeholder="0.00"
              onChange={(val) => {
                const q = form.getFieldValue('quantity');
                if (q && val != null) form.setFieldsValue({ totalAmount: Number((q * val).toFixed(2)) });
              }} />
          </Form.Item>
          <Form.Item name="totalAmount" label="总价" rules={[{ required: true, message: '请输入总价' }]}>
            <InputNumber min={0.01} step={0.01} style={{ width: '100%' }} prefix="¥" placeholder="0.00"
              onChange={(val) => {
                const q = form.getFieldValue('quantity');
                if (q && q > 0 && val != null) form.setFieldsValue({ unitPrice: Number((val / q).toFixed(4)) });
              }} />
          </Form.Item>
          <Form.Item name="purchaseDate" label="采购日期" rules={[{ required: true, message: '请选择日期' }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="memo" label="备注"><Input.TextArea rows={2} /></Form.Item>
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

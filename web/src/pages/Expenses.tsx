import { useEffect, useState } from 'react';
import { Tabs, Table, Button, Modal, Form, Input, InputNumber, DatePicker, Select, AutoComplete, Popconfirm, message, Space, Upload, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../services/api';

const unitOptions = ['斤','公斤','个','箱','捆','袋','包','瓶','桶','把','只','条','份','盘','件','套'].map(u => ({ label: u, value: u }));

export default function ExpensesPage() {
  const [purchases, setPurchases] = useState<any>({ items: [], total: 0 });
  const [expenses, setExpenses] = useState<any>({ items: [], total: 0 });
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'purchase' | 'expense'>('purchase');
  const [editing, setEditing] = useState<string | null>(null);
  const [form] = Form.useForm();
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [invoiceTarget, setInvoiceTarget] = useState<{ id: string; type: 'purchase' | 'expense' } | null>(null);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      api.get('/purchases', { params: { pageSize: 100 } }),
      api.get('/expenses', { params: { pageSize: 100 } }),
      api.get('/suppliers', { params: { pageSize: 200 } }),
      api.get('/products', { params: { pageSize: 200 } }),
    ]).then(([p, e, s, pr]) => {
      setPurchases(p.data);
      setExpenses(e.data);
      setSuppliers(s.data.items);
      setProducts(pr.data.items);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (values: any) => {
    try {
      const data = { ...values };
      if (data.purchaseDate) data.purchaseDate = data.purchaseDate.format('YYYY-MM-DD');
      if (data.expenseDate) data.expenseDate = data.expenseDate.format('YYYY-MM-DD');

      if (modalType === 'purchase') {
        const qty = Number(data.quantity);
        const up = Number(data.unitPrice);
        const ta = Number(data.totalAmount);
        if (!data.totalAmount && qty && up) {
          data.totalAmount = qty * up;
        } else if (!data.unitPrice && qty && ta) {
          data.unitPrice = ta / qty;
        } else if (!data.totalAmount || !data.unitPrice) {
          message.error('请填写单价或总价');
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
      } else {
        if (editing) {
          await api.put(`/expenses/${editing}`, data);
          message.success('支出记录已更新');
        } else {
          await api.post('/expenses', data);
          message.success('支出记录已添加');
        }
      }
      setModalOpen(false);
      setEditing(null);
      form.resetFields();
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.error || '操作失败');
    }
  };

  const handleDelete = async (id: string, type: 'purchase' | 'expense') => {
    try {
      const url = type === 'purchase' ? `/purchases/${id}` : `/expenses/${id}`;
      await api.delete(url);
      message.success('已删除');
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.error || '删除失败');
    }
  };

  const handleEdit = (record: any, type: 'purchase' | 'expense') => {
    setEditing(record.id);
    setModalType(type);
    const fields: any = {};
    if (type === 'purchase') {
      fields.supplierId = record.supplierId;
      fields.productId = record.productId;
      fields.unit = record.unit;
      fields.quantity = record.quantity;
      fields.unitPrice = record.unitPrice;
      fields.totalAmount = record.totalAmount;
      fields.purchaseDate = dayjs(record.purchaseDate);
      fields.memo = record.memo;
    } else {
      fields.category = record.category;
      fields.amount = record.amount;
      fields.expenseDate = dayjs(record.expenseDate);
      fields.description = record.description;
    }
    form.setFieldsValue(fields);
    setModalOpen(true);
  };

  const handleUploadInvoice = async (file: File) => {
    if (!invoiceTarget) return;
    const formData = new FormData();
    formData.append('invoice', file);
    const url = invoiceTarget.type === 'purchase'
      ? `/purchases/${invoiceTarget.id}/invoice`
      : `/expenses/${invoiceTarget.id}/invoice`;
    await api.post(url, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    message.success('发票上传成功');
    setInvoiceModalOpen(false);
    setInvoiceTarget(null);
    fetchData();
  };

  const openCreateModal = (type: 'purchase' | 'expense') => {
    setEditing(null);
    setModalType(type);
    form.resetFields();
    if (type === 'purchase') {
      form.setFieldsValue({ purchaseDate: dayjs() });
    } else {
      form.setFieldsValue({ expenseDate: dayjs() });
    }
    setModalOpen(true);
  };

  const purchaseColumns = [
    { title: '日期', dataIndex: 'purchaseDate', render: (d: string) => dayjs(d).format('YYYY-MM-DD'), width: 110 },
    { title: '供应商', dataIndex: 'supplier', render: (s: any) => s?.name, width: 120 },
    { title: '商品', dataIndex: 'product', render: (p: any) => p?.name, width: 120 },
    { title: '单位', dataIndex: 'unit', width: 60, render: (v: string) => v || '-' },
    { title: '数量', dataIndex: 'quantity', render: (v: number) => Number(v).toLocaleString(), width: 80 },
    { title: '单价', dataIndex: 'unitPrice', render: (v: number) => `¥${Number(v).toFixed(2)}`, width: 100 },
    { title: '金额', dataIndex: 'totalAmount', render: (v: number) => `¥${Number(v).toLocaleString()}`, width: 120 },
    {
      title: '方式', dataIndex: 'inputMethod', width: 70,
      render: (v: string) => ({ manual: '手动', voice: '语音', ocr: '拍照' } as any)[v] || v,
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
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record, 'purchase')}>编辑</Button>
          <Button type="link" size="small" icon={<UploadOutlined />} onClick={() => { setInvoiceTarget({ id: record.id, type: 'purchase' }); setInvoiceModalOpen(true); }}>发票</Button>
          <Popconfirm title="确认删除此采购记录?" onConfirm={() => handleDelete(record.id, 'purchase')}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const expenseColumns = [
    { title: '日期', dataIndex: 'expenseDate', render: (d: string) => dayjs(d).format('YYYY-MM-DD'), width: 110 },
    {
      title: '类别', dataIndex: 'category', width: 90,
      render: (v: string) => ({ salary: '工资', rent: '房租', utilities: '水电', gas: '煤气', maintenance: '维修', other: '其他' } as any)[v] || v,
    },
    { title: '金额', dataIndex: 'amount', render: (v: number) => `¥${Number(v).toLocaleString()}`, width: 120 },
    { title: '说明', dataIndex: 'description', width: 180, ellipsis: true },
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
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record, 'expense')}>编辑</Button>
            <Button type="link" size="small" icon={<UploadOutlined />} onClick={() => { setInvoiceTarget({ id: record.id, type: 'expense' }); setInvoiceModalOpen(true); }}>发票</Button>
            <Popconfirm
              title={isSalaryLinked ? '此支出关联工资记录，不可删除' : '确认删除此支出记录?'}
              onConfirm={() => !isSalaryLinked && handleDelete(record.id, 'expense')}
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
      <h2 style={{ marginBottom: 16, fontSize: 20, fontWeight: 600 }}>支出管理</h2>

      <Tabs
        defaultActiveKey="purchases"
        tabBarExtraContent={
          <Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openCreateModal('purchase')}>新增采购</Button>
            <Button icon={<PlusOutlined />} onClick={() => openCreateModal('expense')}>新增支出</Button>
          </Space>
        }
        items={[
          {
            key: 'purchases',
            label: `采购记录 (${purchases.total})`,
            children: (
              <Table columns={purchaseColumns} dataSource={purchases.items} rowKey="id" loading={loading}
                size="small" scroll={{ x: 1200 }} pagination={{ pageSize: 30, showSizeChanger: true, showTotal: (t: number) => `共 ${t} 条` }} />
            ),
          },
          {
            key: 'expenses',
            label: `其他支出 (${expenses.total})`,
            children: (
              <Table columns={expenseColumns} dataSource={expenses.items} rowKey="id" loading={loading}
                size="small" scroll={{ x: 900 }} pagination={{ pageSize: 30, showSizeChanger: true, showTotal: (t: number) => `共 ${t} 条` }} />
            ),
          },
        ]}
      />

      <Modal
        title={(editing ? '编辑' : '新增') + (modalType === 'purchase' ? '采购记录' : '支出记录')}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditing(null); }}
        onOk={() => form.submit()}
        width={500}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          {modalType === 'purchase' ? (
            <>
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
              <Form.Item name="quantity" label="数量" rules={[{ required: true, message: '请输入数量' }]}>
                <InputNumber min={0} step={0.1} style={{ width: '100%' }} placeholder="0"
                  onChange={(val) => {
                    if (val == null) return;
                    const up = form.getFieldValue('unitPrice');
                    const ta = form.getFieldValue('totalAmount');
                    if (up) form.setFieldsValue({ totalAmount: Number((val * up).toFixed(2)) });
                    else if (ta && val > 0) form.setFieldsValue({ unitPrice: Number((ta / val).toFixed(4)) });
                  }} />
              </Form.Item>
              <Form.Item name="unitPrice" label="单价" rules={[{ required: true, message: '请输入单价或总价' }]}>
                <InputNumber min={0} step={0.01} style={{ width: '100%' }} prefix="¥" placeholder="0.00"
                  onChange={(val) => {
                    const q = form.getFieldValue('quantity');
                    if (q && val != null) form.setFieldsValue({ totalAmount: Number((q * val).toFixed(2)) });
                  }} />
              </Form.Item>
              <Form.Item name="totalAmount" label="总价">
                <InputNumber min={0} step={0.01} style={{ width: '100%' }} prefix="¥" placeholder="0.00"
                  onChange={(val) => {
                    const q = form.getFieldValue('quantity');
                    if (q && q > 0 && val != null) form.setFieldsValue({ unitPrice: Number((val / q).toFixed(4)) });
                  }} />
              </Form.Item>
              <Form.Item name="purchaseDate" label="采购日期" rules={[{ required: true, message: '请选择日期' }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="memo" label="备注"><Input.TextArea rows={2} /></Form.Item>
            </>
          ) : (
            <>
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
            </>
          )}
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

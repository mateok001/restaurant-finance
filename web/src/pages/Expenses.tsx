import { useEffect, useState } from 'react';
import { Tabs, Table, Button, Modal, Form, Input, InputNumber, DatePicker, Select, Popconfirm, message, Space, Upload } from 'antd';
import { PlusOutlined, UploadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../services/api';

export default function ExpensesPage() {
  const [purchases, setPurchases] = useState<any>({ items: [], total: 0 });
  const [expenses, setExpenses] = useState<any>({ items: [], total: 0 });
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'purchase' | 'expense'>('purchase');
  const [form] = Form.useForm();

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

  const handleAdd = async (values: any) => {
    try {
      const data = { ...values };
      if (data.purchaseDate) data.purchaseDate = data.purchaseDate.format('YYYY-MM-DD');
      if (data.expenseDate) data.expenseDate = data.expenseDate.format('YYYY-MM-DD');

      if (modalType === 'purchase') {
        data.totalAmount = data.quantity * data.unitPrice;
        data.inputMethod = 'manual';
        await api.post('/purchases', data);
      } else {
        await api.post('/expenses', data);
      }
      message.success('记录成功');
      setModalOpen(false);
      form.resetFields();
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.error || '操作失败');
    }
  };

  const handleUploadInvoice = async (id: string, file: File, type: 'purchase' | 'expense') => {
    const formData = new FormData();
    formData.append('invoice', file);
    const url = type === 'purchase' ? `/purchases/${id}/invoice` : `/expenses/${id}/invoice`;
    await api.post(url, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    message.success('发票上传成功');
    fetchData();
  };

  const openModal = (type: 'purchase' | 'expense') => {
    setModalType(type);
    setModalOpen(true);
  };

  const purchaseColumns = [
    { title: '日期', dataIndex: 'purchaseDate', render: (d: string) => dayjs(d).format('YYYY-MM-DD'), width: 110 },
    { title: '供应商', dataIndex: 'supplier', render: (s: any) => s?.name, width: 120 },
    { title: '商品', dataIndex: 'product', render: (p: any) => p?.name, width: 120 },
    { title: '数量', dataIndex: 'quantity', render: (v: number) => Number(v).toLocaleString(), width: 80 },
    { title: '单价', dataIndex: 'unitPrice', render: (v: number) => `¥${Number(v).toFixed(2)}`, width: 100 },
    { title: '金额', dataIndex: 'totalAmount', render: (v: number) => `¥${Number(v).toLocaleString()}`, width: 120 },
    { title: '方式', dataIndex: 'inputMethod', width: 80, render: (v: string) => ({ manual: '手动', voice: '语音', ocr: '拍照' } as any)[v] || v },
    { title: '发票', dataIndex: 'invoiceFileUrl', width: 80, render: (url: string) => url ? '✅' : '-' },
    { title: '记录人', dataIndex: 'recorder', render: (r: any) => r?.displayName, width: 80 },
  ];

  const expenseColumns = [
    { title: '日期', dataIndex: 'expenseDate', render: (d: string) => dayjs(d).format('YYYY-MM-DD'), width: 110 },
    { title: '类别', dataIndex: 'category', width: 100, render: (v: string) =>
      ({ salary: '工资', rent: '房租', utilities: '水电', gas: '煤气', maintenance: '维修', other: '其他' } as any)[v] || v },
    { title: '金额', dataIndex: 'amount', render: (v: number) => `¥${Number(v).toLocaleString()}`, width: 120 },
    { title: '说明', dataIndex: 'description', width: 200 },
    { title: '发票', dataIndex: 'invoiceFileUrl', width: 80, render: (url: string) => url ? '✅' : '-' },
    { title: '记录人', dataIndex: 'recorder', render: (r: any) => r?.displayName, width: 80 },
  ];

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>支出管理</h2>

      <Tabs
        defaultActiveKey="purchases"
        tabBarExtraContent={
          <Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal('purchase')}>新增采购</Button>
            <Button icon={<PlusOutlined />} onClick={() => openModal('expense')}>新增支出</Button>
          </Space>
        }
        items={[
          {
            key: 'purchases',
            label: `采购记录 (${purchases.total})`,
            children: <Table columns={purchaseColumns} dataSource={purchases.items} rowKey="id" loading={loading}
              size="small" scroll={{ x: 900 }} pagination={{ pageSize: 30 }} />,
          },
          {
            key: 'expenses',
            label: `其他支出 (${expenses.total})`,
            children: <Table columns={expenseColumns} dataSource={expenses.items} rowKey="id" loading={loading}
              size="small" scroll={{ x: 700 }} pagination={{ pageSize: 30 }} />,
          },
        ]}
      />

      <Modal
        title={modalType === 'purchase' ? '新增采购记录' : '新增支出记录'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        width={500}
      >
        <Form form={form} layout="vertical" onFinish={handleAdd}>
          {modalType === 'purchase' ? (
            <>
              <Form.Item name="supplierId" label="供应商" rules={[{ required: true }]}>
                <Select showSearch optionFilterProp="label" options={suppliers.map((s: any) => ({ label: s.name, value: s.id }))} />
              </Form.Item>
              <Form.Item name="productId" label="商品" rules={[{ required: true }]}>
                <Select showSearch optionFilterProp="label" options={products.map((p: any) => ({ label: `${p.name} (${p.unit})`, value: p.id }))} />
              </Form.Item>
              <Form.Item name="quantity" label="数量" rules={[{ required: true }]}>
                <InputNumber min={0} step={0.1} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="unitPrice" label="单价" rules={[{ required: true }]}>
                <InputNumber min={0} step={0.01} style={{ width: '100%' }} prefix="¥" />
              </Form.Item>
              <Form.Item name="purchaseDate" label="采购日期" rules={[{ required: true }]} initialValue={dayjs()}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="memo" label="备注"><Input.TextArea rows={2} /></Form.Item>
            </>
          ) : (
            <>
              <Form.Item name="category" label="支出类别" rules={[{ required: true }]}>
                <Select options={[
                  { label: '房租', value: 'rent' }, { label: '水电费', value: 'utilities' },
                  { label: '煤气费', value: 'gas' }, { label: '维修', value: 'maintenance' },
                  { label: '其他', value: 'other' },
                ]} />
              </Form.Item>
              <Form.Item name="amount" label="金额" rules={[{ required: true }]}>
                <InputNumber min={0} style={{ width: '100%' }} prefix="¥" />
              </Form.Item>
              <Form.Item name="expenseDate" label="日期" rules={[{ required: true }]} initialValue={dayjs()}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="description" label="说明"><Input.TextArea rows={2} /></Form.Item>
            </>
          )}
        </Form>
      </Modal>
    </div>
  );
}

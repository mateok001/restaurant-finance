import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, Select, Popconfirm, message, Space, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '../services/api';

const categoryLabels: Record<string, string> = {
  ingredients: '食材', beverages: '酒水', seasonings: '调料', packaging: '包装耗材', other: '其他',
};

export default function ProductsPage() {
  const [data, setData] = useState<any>({ items: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form] = Form.useForm();

  const fetchData = () => {
    setLoading(true);
    api.get('/products', { params: { pageSize: 200 } })
      .then((r) => setData(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (values: any) => {
    if (editing) {
      await api.put(`/products/${editing}`, values);
      message.success('更新成功');
    } else {
      await api.post('/products', values);
      message.success('添加成功');
    }
    setModalOpen(false);
    setEditing(null);
    form.resetFields();
    fetchData();
  };

  const handleEdit = (record: any) => {
    setEditing(record.id);
    form.setFieldsValue(record);
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    await api.delete(`/products/${id}`);
    message.success('已删除');
    fetchData();
  };

  const columns = [
    { title: '商品名称', dataIndex: 'name', width: 200 },
    { title: '类别', dataIndex: 'category', width: 120, render: (v: string) => <Tag>{categoryLabels[v] || v}</Tag> },
    {
      title: '操作', width: 120,
      render: (_: any, record: any) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>
          <Popconfirm title="确认删除?" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>商品管理</h2>
      <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true); }}
        style={{ marginBottom: 16 }}>新增商品</Button>
      <Table columns={columns} dataSource={data.items} rowKey="id" loading={loading} size="small" pagination={{ pageSize: 50 }} />

      <Modal title={editing ? '编辑商品' : '新增商品'} open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditing(null); }} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="商品名称" rules={[{ required: true, message: '请输入商品名称' }]}><Input /></Form.Item>
          <Form.Item name="category" label="类别" rules={[{ required: true }]} initialValue="ingredients">
            <Select options={Object.entries(categoryLabels).map(([k, v]) => ({ label: v, value: k }))} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, Popconfirm, message, Space } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '../services/api';

export default function SuppliersPage() {
  const [data, setData] = useState<any>({ items: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form] = Form.useForm();

  const fetchData = () => {
    setLoading(true);
    api.get('/suppliers', { params: { pageSize: 200 } })
      .then((r) => setData(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (values: any) => {
    if (editing) {
      await api.put(`/suppliers/${editing}`, values);
      message.success('更新成功');
    } else {
      await api.post('/suppliers', values);
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
    await api.delete(`/suppliers/${id}`);
    message.success('已删除');
    fetchData();
  };

  const columns = [
    { title: '供应商名称', dataIndex: 'name', width: 150 },
    { title: '联系人', dataIndex: 'contactPerson', width: 100 },
    { title: '联系电话', dataIndex: 'contactPhone', width: 130 },
    { title: '地址', dataIndex: 'address', width: 200 },
    { title: '备注', dataIndex: 'remark', width: 200 },
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
      <h2 style={{ marginBottom: 16 }}>供应商管理</h2>
      <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true); }}
        style={{ marginBottom: 16 }}>新增供应商</Button>
      <Table columns={columns} dataSource={data.items} rowKey="id" loading={loading} size="small" pagination={{ pageSize: 50 }} />

      <Modal title={editing ? '编辑供应商' : '新增供应商'} open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditing(null); }} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="contactPerson" label="联系人"><Input /></Form.Item>
          <Form.Item name="contactPhone" label="电话"><Input /></Form.Item>
          <Form.Item name="address" label="地址"><Input /></Form.Item>
          <Form.Item name="remark" label="备注"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

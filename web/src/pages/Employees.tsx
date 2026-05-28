import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, Select, DatePicker, Popconfirm, message, Space, Tag, Switch } from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../services/api';

const positionLabels: Record<string, string> = {
  chef: '厨师', waiter: '服务员', cashier: '收银', cleaner: '杂工', manager: '经理',
};

export default function EmployeesPage() {
  const [data, setData] = useState<any>({ items: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [showFull, setShowFull] = useState(false);
  const [form] = Form.useForm();

  const fetchData = () => {
    setLoading(true);
    api.get('/employees', { params: { pageSize: 100 } })
      .then((r) => setData(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (values: any) => {
    const payload = { ...values, hireDate: values.hireDate.format('YYYY-MM-DD') };
    if (editing) {
      await api.put(`/employees/${editing}`, payload);
      message.success('更新成功');
    } else {
      await api.post('/employees', payload);
      message.success('添加成功');
    }
    setModalOpen(false); setEditing(null); form.resetFields(); fetchData();
  };

  const toggleStatus = async (id: string) => {
    await api.patch(`/employees/${id}/status`);
    message.success('状态已更新');
    fetchData();
  };

  const handleEdit = async (record: any) => {
    setEditing(record.id);
    setShowFull(true);
    const full = await api.get(`/employees/${record.id}`, { params: { showFull: true } });
    form.setFieldsValue({ ...full.data, hireDate: dayjs(full.data.hireDate) });
    setModalOpen(true);
  };

  const columns = [
    { title: '姓名', dataIndex: 'name', width: 80 },
    { title: '岗位', dataIndex: 'position', width: 80, render: (v: string) => positionLabels[v] || v },
    { title: '电话', dataIndex: 'phone', width: 120 },
    { title: '基本工资', dataIndex: 'baseSalary', width: 100, render: (v: number) => `¥${Number(v).toLocaleString()}` },
    { title: '发薪日', dataIndex: 'scheduledPayDay', width: 70, render: (v: number) => `每月${v}号` },
    { title: '状态', dataIndex: 'isActive', width: 80, render: (v: boolean, record: any) =>
      <Switch checked={v} onChange={() => toggleStatus(record.id)} checkedChildren="在岗" unCheckedChildren="离职" /> },
    {
      title: '操作', width: 80,
      render: (_: any, record: any) => <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>,
    },
  ];

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>员工管理</h2>
      <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); setShowFull(true); form.resetFields(); setModalOpen(true); }}
        style={{ marginBottom: 16 }}>新增员工</Button>
      <Table columns={columns} dataSource={data.items} rowKey="id" loading={loading} size="small" pagination={{ pageSize: 50 }} />

      <Modal title={editing ? '编辑员工' : '新增员工'} open={modalOpen} width={520}
        onCancel={() => { setModalOpen(false); setEditing(null); setShowFull(false); }} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="姓名" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="idCardNumber" label="身份证号"><Input maxLength={18} placeholder="非必填" /></Form.Item>
          <Form.Item name="bankCardNumber" label="银行卡号"><Input maxLength={30} placeholder="非必填" /></Form.Item>
          <Form.Item name="phone" label="电话号码" rules={[{ required: true }]}><Input maxLength={20} /></Form.Item>
          <Form.Item name="position" label="岗位" rules={[{ required: true }]}>
            <Select options={Object.entries(positionLabels).map(([k, v]) => ({ label: v, value: k }))} />
          </Form.Item>
          <Form.Item name="baseSalary" label="基本工资" rules={[{ required: true }]}><InputNumber min={0} style={{ width: '100%' }} prefix="¥" /></Form.Item>
          <Form.Item name="scheduledPayDay" label="应发工资日" rules={[{ required: true }]} initialValue={15}>
            <InputNumber min={1} max={31} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="hireDate" label="入职日期" rules={[{ required: true }]} initialValue={dayjs()}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="remark" label="备注"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

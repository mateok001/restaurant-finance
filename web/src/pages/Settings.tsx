import { useEffect, useState } from 'react';
import { Card, Form, Input, Button, message, Divider, Table, Modal, Select, Popconfirm, Tag, Space } from 'antd';
import { UserOutlined, PlusOutlined } from '@ant-design/icons';
import { useAuthStore } from '../stores/authStore';
import api from '../services/api';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [changingPwd, setChangingPwd] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [pwdForm] = Form.useForm();
  const [userForm] = Form.useForm();

  const isAdmin = user?.role === 'admin';

  const fetchUsers = async () => {
    if (!isAdmin) return;
    try {
      const res = await api.get('/auth/users');
      setUsers(res.data);
    } catch (err: any) {
      message.error(err.response?.data?.error || '获取用户列表失败');
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [isAdmin]);

  const handleChangePassword = async (values: any) => {
    try {
      await api.put('/auth/password', values);
      message.success('密码修改成功，请重新登录');
      pwdForm.resetFields();
    } catch (err: any) {
      message.error(err.response?.data?.error || '修改失败');
    }
  };

  const handleAddUser = async (values: any) => {
    try {
      await api.post('/auth/register', values);
      message.success('用户创建成功');
      setUserModalOpen(false);
      userForm.resetFields();
      fetchUsers();
    } catch (err: any) {
      message.error(err.response?.data?.error || '创建失败');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await api.delete(`/auth/users/${userId}`);
      message.success('用户已删除');
      fetchUsers();
    } catch (err: any) {
      message.error(err.response?.data?.error || '删除失败');
    }
  };

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>系统设置</h2>

      <Card title="个人信息" style={{ marginBottom: 16 }}>
        <p><UserOutlined /> 用户名: {user?.username}</p>
        <p>显示名称: {user?.displayName}</p>
        <p>角色: {user?.role === 'admin' ? '管理员' : user?.role === 'partner' ? '合伙人' : '员工'}</p>
      </Card>

      <Card title="修改密码" style={{ marginBottom: 16 }}>
        <Form form={pwdForm} layout="vertical" onFinish={handleChangePassword} style={{ maxWidth: 400 }}>
          <Form.Item name="oldPassword" label="原密码" rules={[{ required: true }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="newPassword" label="新密码" rules={[{ required: true, min: 6 }]}>
            <Input.Password />
          </Form.Item>
          <Button type="primary" htmlType="submit">修改密码</Button>
        </Form>
      </Card>

      {isAdmin && (
        <Card title="用户管理"
          extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setUserModalOpen(true)}>添加用户</Button>}>
          <Table dataSource={users} rowKey="id" size="small" pagination={false}
            columns={[
              { title: '用户名', dataIndex: 'username' },
              { title: '显示名', dataIndex: 'displayName' },
              { title: '角色', dataIndex: 'role', render: (v: string) =>
                <Tag>{v === 'admin' ? '管理员' : v === 'partner' ? '合伙人' : '员工'}</Tag> },
              { title: '操作', render: (_: any, record: any) =>
                record.role !== 'admin' ? (
                  <Popconfirm title="确定删除此用户？" onConfirm={() => handleDeleteUser(record.id)}>
                    <Button type="link" danger size="small">删除</Button>
                  </Popconfirm>
                ) : null },
            ]} />

          <Modal title="添加用户" open={userModalOpen}
            onCancel={() => setUserModalOpen(false)} onOk={() => userForm.submit()}>
            <Form form={userForm} layout="vertical" onFinish={handleAddUser}>
              <Form.Item name="username" label="用户名" rules={[{ required: true, min: 2 }]}><Input /></Form.Item>
              <Form.Item name="password" label="密码" rules={[{ required: true, min: 6 }]}><Input.Password /></Form.Item>
              <Form.Item name="displayName" label="显示名称" rules={[{ required: true }]}><Input /></Form.Item>
              <Form.Item name="role" label="角色" initialValue="staff">
                <Select options={[
                  { label: '管理员', value: 'admin' }, { label: '合伙人', value: 'partner' }, { label: '员工', value: 'staff' },
                ]} />
              </Form.Item>
            </Form>
          </Modal>
        </Card>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, Checkbox, Modal, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuthStore } from '../stores/authStore';
import api from '../services/api';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useAuthStore();

  // 注册
  const [registerOpen, setRegisterOpen] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerForm] = Form.useForm();

  // 修改密码
  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdForm] = Form.useForm();

  const onFinish = async (values: { username: string; password: string; remember: boolean }) => {
    setLoading(true);
    try {
      const { remember, ...credentials } = values;
      const res = await api.post('/auth/login', credentials);
      const { accessToken, refreshToken, user } = res.data;
      if (!accessToken || !refreshToken) {
        message.error('登录响应缺少令牌，请联系管理员');
        return;
      }
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      setUser(user);
      message.success(`欢迎回来，${user.displayName}`);
      navigate('/');
    } catch (err: any) {
      message.error(err.response?.data?.error || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (values: any) => {
    setRegisterLoading(true);
    try {
      await api.post('/auth/public-register', values);
      message.success('注册成功，请登录');
      setRegisterOpen(false);
      registerForm.resetFields();
    } catch (err: any) {
      message.error(err.response?.data?.error || '注册失败');
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleChangePwd = async (values: any) => {
    setPwdLoading(true);
    try {
      await api.post('/auth/public-change-password', values);
      message.success('密码修改成功，请重新登录');
      setPwdOpen(false);
      pwdForm.resetFields();
    } catch (err: any) {
      message.error(err.response?.data?.error || '修改失败');
    } finally {
      setPwdLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative background shapes */}
      <div style={{
        position: 'absolute', top: -80, right: -80,
        width: 300, height: 300, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(212,165,116,0.12), transparent 70%)',
      }} />
      <div style={{
        position: 'absolute', bottom: -60, left: -60,
        width: 260, height: 260, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(212,165,116,0.08), transparent 70%)',
      }} />

      <Card
        style={{ width: 400, borderRadius: 14, boxShadow: '0 12px 40px rgba(0,0,0,0.25)' }}
        styles={{ body: { padding: '44px 36px' } }}
      >
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 64, height: 64, margin: '0 auto 16px',
            borderRadius: 16, background: 'linear-gradient(135deg, #D4A574, #c9965e)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(212,165,116,0.3)',
          }}>
            <span style={{ fontSize: 32 }}>🍽</span>
          </div>
          <h2 style={{ color: '#1a1a2e', margin: 0, fontSize: 22, fontWeight: 700 }}>餐馆财务记账</h2>
          <p style={{ color: '#999', marginTop: 8, fontSize: 13 }}>小餐馆一站式财务管理工具</p>
        </div>
        <Form name="login" onFinish={onFinish} size="large" initialValues={{ remember: true }}>
          <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input prefix={<UserOutlined style={{ color: '#bfbfbf' }} />} />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password prefix={<LockOutlined style={{ color: '#bfbfbf' }} />} />
          </Form.Item>
          <Form.Item name="remember" valuePropName="checked">
            <Checkbox>记住登录状态</Checkbox>
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" loading={loading} block
              style={{ height: 44, fontSize: 15, fontWeight: 500, borderRadius: 8 }}>
              登 录
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center', marginTop: 16, display: 'flex', justifyContent: 'center', gap: 16 }}>
          <Button type="link" onClick={() => setRegisterOpen(true)}>注册新用户</Button>
          <Button type="link" onClick={() => setPwdOpen(true)}>修改密码</Button>
        </div>
      </Card>

      {/* 注册 Modal */}
      <Modal
        title="注册新用户"
        open={registerOpen}
        onCancel={() => { setRegisterOpen(false); registerForm.resetFields(); }}
        onOk={() => registerForm.submit()}
        confirmLoading={registerLoading}
        okText="注册"
        destroyOnClose
      >
        <Form form={registerForm} layout="vertical" onFinish={handleRegister}>
          <Form.Item name="username" label="用户名" rules={[{ required: true, min: 2, message: '用户名至少2位' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true, min: 6, message: '密码至少6位' }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="displayName" label="显示名称" rules={[{ required: true, message: '请输入显示名称' }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      {/* 修改密码 Modal */}
      <Modal
        title="修改密码"
        open={pwdOpen}
        onCancel={() => { setPwdOpen(false); pwdForm.resetFields(); }}
        onOk={() => pwdForm.submit()}
        confirmLoading={pwdLoading}
        okText="确认修改"
        destroyOnClose
      >
        <Form form={pwdForm} layout="vertical" onFinish={handleChangePwd}>
          <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="oldPassword" label="原密码" rules={[{ required: true, message: '请输入原密码' }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="newPassword" label="新密码" rules={[{ required: true, min: 6, message: '新密码至少6位' }]}>
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

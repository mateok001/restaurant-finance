import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, Checkbox, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuthStore } from '../stores/authStore';
import api from '../services/api';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useAuthStore();

  const onFinish = async (values: { username: string; password: string; remember: boolean }) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', values);
      const { accessToken, refreshToken, user } = res.data;
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
            <Input prefix={<UserOutlined style={{ color: '#bfbfbf' }} />} placeholder="用户名" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password prefix={<LockOutlined style={{ color: '#bfbfbf' }} />} placeholder="密码" />
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
      </Card>

      <div style={{ marginTop: 24, color: 'rgba(255,255,255,0.35)', fontSize: 12, textAlign: 'center' }}>
        默认账户: admin / admin123
      </div>
    </div>
  );
}

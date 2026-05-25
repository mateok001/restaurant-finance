import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Dropdown, Avatar } from 'antd';
import type { MenuProps } from 'antd';
import {
  DashboardOutlined,
  DollarOutlined,
  ShoppingOutlined,
  ShopOutlined,
  AppstoreOutlined,
  TeamOutlined,
  PayCircleOutlined,
  BarChartOutlined,
  FileImageOutlined,
  SettingOutlined,
  AudioOutlined,
  CameraOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LogoutOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../stores/authStore';

const { Header, Sider, Content } = Layout;

const menuItems: MenuProps['items'] = [
  { key: '/', icon: <DashboardOutlined />, label: '仪表盘' },
  {
    key: '/revenue',
    icon: <DollarOutlined />,
    label: '收入管理',
    children: [
      { key: '/revenue', label: '每日收入' },
    ],
  },
  {
    key: 'expenses',
    icon: <ShoppingOutlined />,
    label: '支出管理',
    children: [
      { key: '/expenses', label: '采购与支出' },
      { key: '/expenses/voice', label: '语音记账' },
      { key: '/expenses/ocr', label: '拍照记账' },
    ],
  },
  { key: '/suppliers', icon: <ShopOutlined />, label: '供应商管理' },
  { key: '/products', icon: <AppstoreOutlined />, label: '商品管理' },
  {
    key: 'staff',
    icon: <TeamOutlined />,
    label: '员工管理',
    children: [
      { key: '/employees', label: '员工档案' },
      { key: '/salaries', label: '工资发放' },
    ],
  },
  { key: '/reports', icon: <BarChartOutlined />, label: '报表中心' },
  { key: '/briefing', icon: <FileImageOutlined />, label: '经营简报' },
  { key: '/settings', icon: <SettingOutlined />, label: '系统设置' },
];

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, clearUser } = useAuthStore();

  const handleMenuClick: MenuProps['onClick'] = (e) => {
    navigate(e.key);
  };

  const handleLogout = () => {
    clearUser();
    navigate('/login');
  };

  const userMenuItems: MenuProps['items'] = [
    { key: 'profile', icon: <UserOutlined />, label: `${user?.displayName || ''} (${user?.role || ''})` },
    { type: 'divider' },
    { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', danger: true },
  ];

  const handleUserMenuClick: MenuProps['onClick'] = (e) => {
    if (e.key === 'logout') handleLogout();
  };

  const selectedKeys = [location.pathname];

  return (
    <Layout>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        style={{
          background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
        }}
        width={220}
      >
        <div className="logo">
          {collapsed ? '🍽' : '🍽 餐馆记账'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={selectedKeys}
          defaultOpenKeys={['expenses', 'staff']}
          onClick={handleMenuClick}
          items={menuItems}
          style={{
            background: 'transparent',
            borderRight: 'none',
            fontSize: '14px',
          }}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #f0f0f0',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
          />
          <Dropdown menu={{ items: userMenuItems, onClick: handleUserMenuClick }} placement="bottomRight">
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar style={{ backgroundColor: '#D4A574' }} icon={<UserOutlined />} />
              <span>{user?.displayName || '用户'}</span>
            </div>
          </Dropdown>
        </Header>
        <Content
          style={{
            margin: 24,
            padding: 24,
            background: '#fff',
            borderRadius: 8,
            minHeight: 280,
            overflow: 'auto',
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}

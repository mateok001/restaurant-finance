import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Dropdown, Avatar, Badge } from 'antd';
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
      { key: '/revenue/analysis', label: '营业额分析' },
    ],
  },
  {
    key: 'expenses',
    icon: <ShoppingOutlined />,
    label: '支出管理',
    children: [
      { key: '/purchases', label: '采购管理' },
      { key: '/expenses', label: '费用支出' },
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
  {
    key: 'reports',
    icon: <BarChartOutlined />,
    label: '报表中心',
    children: [
      { key: '/reports/profit', label: '利润概览' },
      { key: '/reports/product', label: '商品采购' },
      { key: '/reports/supplier', label: '供应商货款' },
    ],
  },
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

  const roleLabel = (role?: string) => {
    switch (role) {
      case 'admin': return '管理员';
      case 'partner': return '合伙人';
      case 'staff': return '员工';
      default: return role || '';
    }
  };

  const userMenuItems: MenuProps['items'] = [
    { key: 'profile', icon: <UserOutlined />, label: `${user?.displayName || ''} · ${roleLabel(user?.role)}` },
    { type: 'divider' },
    { key: 'settings', icon: <SettingOutlined />, label: '系统设置' },
    { type: 'divider' },
    { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', danger: true },
  ];

  const handleUserMenuClick: MenuProps['onClick'] = (e) => {
    if (e.key === 'logout') handleLogout();
    if (e.key === 'settings') navigate('/settings');
  };

  const selectedKeys = [location.pathname];

  return (
    <Layout>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        style={{
          background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
          borderRight: 'none',
          boxShadow: '2px 0 12px rgba(0,0,0,0.15)',
        }}
        width={220}
      >
        <div className="logo">
          {collapsed ? (
            <span style={{ fontSize: 22 }}>🍽</span>
          ) : (
            <>
              <span style={{ fontSize: 20 }}>🍽</span>
              <span>餐馆记账</span>
            </>
          )}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={selectedKeys}
          defaultOpenKeys={['/revenue', 'expenses', 'staff', 'reports']}
          onClick={handleMenuClick}
          items={menuItems}
          style={{
            background: 'transparent',
            borderRight: 'none',
            fontSize: '14px',
            marginTop: 4,
          }}
        />
        {!collapsed && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.45)', fontSize: 11, textAlign: 'center',
          }}>
            餐馆财务管理 v1.0
          </div>
        )}
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
            boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
            height: 52,
            lineHeight: '52px',
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined style={{ fontSize: 16 }} /> : <MenuFoldOutlined style={{ fontSize: 16 }} />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ color: '#666' }}
          />
          <Dropdown menu={{ items: userMenuItems, onClick: handleUserMenuClick }} placement="bottomRight">
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, padding: '4px 8px', borderRadius: 6 }}>
              <Avatar
                style={{ backgroundColor: '#D4A574', verticalAlign: 'middle' }}
                icon={<UserOutlined />}
                size={30}
              />
              <div style={{ lineHeight: 1.2 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{user?.displayName || '用户'}</div>
                <div style={{ fontSize: 11, color: '#999' }}>{roleLabel(user?.role)}</div>
              </div>
            </div>
          </Dropdown>
        </Header>
        <Content
          style={{
            margin: 20,
            padding: 24,
            background: '#fff',
            borderRadius: 10,
            minHeight: 280,
            overflow: 'auto',
            boxShadow: '0 1px 6px rgba(0,0,0,0.03)',
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}

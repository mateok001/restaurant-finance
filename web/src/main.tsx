import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import App from './App';
import './index.css';

const theme = {
  token: {
    colorPrimary: '#D4A574',
    colorSuccess: '#52c41a',
    colorWarning: '#faad14',
    colorError: '#ff4d4f',
    colorInfo: '#1677ff',
    borderRadius: 8,
    borderRadiusLG: 10,
    fontFamily: '"PingFang SC", "Microsoft YaHei", "Helvetica Neue", sans-serif',
    colorBgContainer: '#ffffff',
    colorBgLayout: '#f5f3f0',
    colorBorderSecondary: '#f0ede8',
    colorText: '#2c2c2c',
    colorTextSecondary: '#666666',
    fontSize: 14,
    controlHeight: 36,
    paddingContentHorizontal: 20,
    paddingContentVertical: 16,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  components: {
    Table: {
      headerBg: '#faf8f5',
      headerColor: '#5c5c5c',
      rowHoverBg: '#fdf8f3',
      borderColor: '#f0ede8',
    },
    Card: {
      paddingLG: 20,
    },
    Modal: {
      titleFontSize: 16,
    },
    Menu: {
      darkItemBg: 'transparent',
      darkItemSelectedBg: 'rgba(212, 165, 116, 0.2)',
      darkItemHoverBg: 'rgba(212, 165, 116, 0.1)',
      darkSubMenuItemBg: 'transparent',
    },
    Statistic: {
      contentFontSize: 24,
    },
  },
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider locale={zhCN} theme={theme}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ConfigProvider>
  </React.StrictMode>,
);

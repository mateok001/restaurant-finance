const { clearAuth, isLoggedIn, getUserInfo } = require('../../utils/auth');
const { showConfirm } = require('../../utils/util');
const app = getApp();

Page({
  data: {
    user: null,
    isLoggedIn: false,
  },

  onShow() {
    if (!isLoggedIn()) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }

    const user = getUserInfo() || app.globalData.userInfo || {};
    this.setData({
      user,
      isLoggedIn: true,
      serverUrl: app.globalData.baseUrl,
    });
  },

  onViewAccount() {
    wx.showModal({
      title: '账户信息',
      content: `用户名: ${this.data.user.username || '-'}\n角色: ${this.getRoleText(this.data.user.role)}`,
      showCancel: false,
    });
  },

  onChangePassword() {
    wx.showModal({
      title: '修改密码',
      content: '修改密码功能暂未开放，请在 Web 端操作',
      showCancel: false,
    });
  },

  onServerConfig() {
    wx.showModal({
      title: '服务器地址',
      content: `当前: ${app.globalData.baseUrl}`,
      showCancel: false,
    });
  },

  onAbout() {
    wx.showModal({
      title: '关于',
      content: '小餐馆记账 v1.0\n移动端财务管理助手\n后端: Node.js + Express\n数据库: SQLite',
      showCancel: false,
    });
  },

  async onLogout() {
    const confirmed = await showConfirm('确定要退出登录吗？', '退出登录');
    if (confirmed) {
      app.logout();
      wx.reLaunch({ url: '/pages/login/login' });
    }
  },

  getRoleText(role) {
    const map = {
      admin: '管理员',
      partner: '合伙人',
      staff: '员工',
    };
    return map[role] || role || '-';
  },
});

const { setTokens, setUserInfo } = require('../../utils/auth');
const { showToast, showLoading, hideLoading } = require('../../utils/util');
const app = getApp();

Page({
  data: {
    username: '',
    password: '',
    remember: false,
  },

  onLoad() {
    // 如果已登录直接跳转首页
    const { isLoggedIn } = require('../../utils/auth');
    if (isLoggedIn()) {
      wx.switchTab({ url: '/pages/dashboard/dashboard' });
    }
  },

  onInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({ [field]: e.detail.value });
  },

  onToggleRemember() {
    this.setData({ remember: !this.data.remember });
  },

  onLogin() {
    const { username, password, remember } = this.data;
    if (!username.trim()) return showToast('请输入用户名');
    if (!password.trim()) return showToast('请输入密码');

    showLoading('登录中...');
    wx.request({
      url: `${app.globalData.baseUrl}/auth/login`,
      method: 'POST',
      data: { username: username.trim(), password, remember },
      success: (res) => {
        hideLoading();
        if (res.statusCode === 200) {
          const { accessToken, refreshToken, user } = res.data;
          setTokens(accessToken, refreshToken);
          setUserInfo(user);
          app.setUserInfo(user);
          showToast('登录成功', 'success');
          setTimeout(() => {
            wx.switchTab({ url: '/pages/dashboard/dashboard' });
          }, 500);
        } else {
          showToast(res.data?.error || '登录失败');
        }
      },
      fail: (err) => {
        hideLoading();
        showToast(err.errMsg || '网络请求失败，请检查服务器连接');
      },
    });
  },

  onRegisterHint() {
    wx.showModal({
      title: '注册说明',
      content: '新用户注册请联系管理员（admin / admin123）在 Web 端添加账户。\n\n默认账户：\n管理员：admin / admin123\n合伙人：partner / partner123',
      showCancel: false,
    });
  },
});

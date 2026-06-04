const { getToken } = require('./utils/auth');
const { BASE_URL } = require('./utils/config');

App({
  globalData: {
    baseUrl: BASE_URL,
    userInfo: null,
    isLoggedIn: false,
  },

  onLaunch() {
    // 检查登录状态
    const token = getToken();
    if (token) {
      this.globalData.isLoggedIn = true;
      this.checkLoginStatus();
    }
  },

  checkLoginStatus() {
    const api = require('./services/api');
    api.get('/auth/profile')
      .then((user) => {
        this.globalData.userInfo = user;
        this.globalData.isLoggedIn = true;
      })
      .catch(() => {
        this.globalData.isLoggedIn = false;
        this.globalData.userInfo = null;
      });
  },

  setUserInfo(user) {
    this.globalData.userInfo = user;
    this.globalData.isLoggedIn = true;
  },

  logout() {
    const { clearAuth } = require('./utils/auth');
    clearAuth();
    this.globalData.userInfo = null;
    this.globalData.isLoggedIn = false;
  },
});

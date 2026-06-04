const STORAGE_KEY_TOKEN = 'access_token';
const STORAGE_KEY_REFRESH = 'refresh_token';
const STORAGE_KEY_USER = 'user_info';

function getToken() {
  return wx.getStorageSync(STORAGE_KEY_TOKEN) || '';
}

function getRefreshToken() {
  return wx.getStorageSync(STORAGE_KEY_REFRESH) || '';
}

function setTokens(accessToken, refreshToken) {
  wx.setStorageSync(STORAGE_KEY_TOKEN, accessToken);
  wx.setStorageSync(STORAGE_KEY_REFRESH, refreshToken);
}

function getUserInfo() {
  return wx.getStorageSync(STORAGE_KEY_USER) || null;
}

function setUserInfo(user) {
  wx.setStorageSync(STORAGE_KEY_USER, user);
}

function clearAuth() {
  wx.removeStorageSync(STORAGE_KEY_TOKEN);
  wx.removeStorageSync(STORAGE_KEY_REFRESH);
  wx.removeStorageSync(STORAGE_KEY_USER);
}

function isLoggedIn() {
  return !!getToken();
}

module.exports = {
  getToken,
  getRefreshToken,
  setTokens,
  getUserInfo,
  setUserInfo,
  clearAuth,
  isLoggedIn,
};

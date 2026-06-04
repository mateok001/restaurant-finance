const { getToken, getRefreshToken, setTokens, clearAuth } = require('../utils/auth');
const { BASE_URL } = require('../utils/config');

let isRefreshing = false;
let refreshSubscribers = [];

function onRefreshed(newToken) {
  refreshSubscribers.forEach((cb) => cb(newToken));
  refreshSubscribers = [];
}

function addRefreshSubscriber(cb) {
  refreshSubscribers.push(cb);
}

/**
 * 发起 HTTP 请求
 * 自动附加 Authorization header
 * 401 时自动尝试刷新 token
 */
function request(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const doRequest = () => {
      const header = {};
      const token = getToken();
      if (token) {
        header['Authorization'] = `Bearer ${token}`;
      }
      header['Content-Type'] = 'application/json';

      wx.request({
        url: `${BASE_URL}${path}`,
        method,
        header,
        data,
        success: (res) => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(res.data);
          } else if (res.statusCode === 401) {
            // Token 过期，尝试刷新
            if (!isRefreshing) {
              isRefreshing = true;
              const refreshToken = getRefreshToken();
              if (!refreshToken) {
                clearAuth();
                redirectToLogin();
                reject(new Error('登录已过期，请重新登录'));
                return;
              }
              wx.request({
                url: `${BASE_URL}/auth/refresh`,
                method: 'POST',
                data: { refreshToken },
                success: (refreshRes) => {
                  isRefreshing = false;
                  if (refreshRes.statusCode === 200) {
                    const { accessToken, refreshToken: newRefreshToken } = refreshRes.data;
                    setTokens(accessToken, newRefreshToken || refreshToken);
                    onRefreshed(accessToken);
                    doRequest(); // 重试原请求
                  } else {
                    clearAuth();
                    redirectToLogin();
                    reject(new Error('登录已过期，请重新登录'));
                  }
                },
                fail: () => {
                  isRefreshing = false;
                  clearAuth();
                  redirectToLogin();
                  reject(new Error('网络错误'));
                },
              });
            } else {
              // 已在刷新中，排队等待
              addRefreshSubscriber(() => doRequest());
            }
          } else {
            const msg = res.data?.error || res.data?.message || '请求失败';
            reject(new Error(msg));
          }
        },
        fail: (err) => {
          reject(new Error(err.errMsg || '网络请求失败'));
        },
      });
    };

    doRequest();
  });
}

function redirectToLogin() {
  const pages = getCurrentPages();
  if (pages.length > 0 && pages[pages.length - 1].route !== 'pages/login/login') {
    wx.reLaunch({ url: '/pages/login/login' });
  }
}

// 便捷方法
function get(path, params = {}) {
  const keys = Object.keys(params).filter((k) => params[k] != null && params[k] !== '');
  if (keys.length > 0) {
    const qs = keys.map((k) => `${k}=${encodeURIComponent(params[k])}`).join('&');
    path = `${path}?${qs}`;
  }
  return request('GET', path);
}

function post(path, data) {
  return request('POST', path, data);
}

function put(path, data) {
  return request('PUT', path, data);
}

function del(path) {
  return request('DELETE', path);
}

module.exports = { get, post, put, del };

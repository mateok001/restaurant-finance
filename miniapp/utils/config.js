/**
 * API 服务器配置
 *
 * 开发阶段：
 *   - 模拟器：使用 http://localhost:8080
 *   - 手机预览：改为电脑局域网 IP，如 http://192.168.1.14:8080
 *
 * 生产环境（体验版）：
 *   - 通过服务器 IP 直连，无需域名和 SSL
 *   - 微信开发者工具需勾选「不校验合法域名」
 *
 * 查看本机 IP：
 *   Windows: ipconfig | findstr IPv4
 *   Mac/Linux: ifconfig | grep "inet "
 */

// ===== 修改这里的配置 =====
const DEV_IP = '192.168.1.14'; // 改为你的局域网 IP
const DEV_PORT = '8080';
const PROD_DOMAIN = 'http://43.131.245.188:8080'; // 服务器 IP
// =========================

/**
 * 判断当前是否为正式版（生产环境）
 * 微信小程序中 __wxConfig.envVersion 可能的值：
 *   'develop' — 开发版（开发者工具）
 *   'trial'   — 体验版
 *   'release' — 正式版
 */
function isProduction(): boolean {
  try {
    const accountInfo = wx.getAccountInfoSync();
    return accountInfo.miniProgram.envVersion === 'release';
  } catch {
    // 无法获取（非微信环境），默认使用开发模式
    return false;
  }
}

const DEV_URL = `http://${DEV_IP}:${DEV_PORT}/api/v1`;
const PROD_URL = `${PROD_DOMAIN}/api/v1`;

const BASE_URL = isProduction() ? PROD_URL : PROD_URL;

module.exports = {
  BASE_URL,
  DEV_URL,
  PROD_URL,
  DEV_IP,
  DEV_PORT,
  PROD_DOMAIN,
};

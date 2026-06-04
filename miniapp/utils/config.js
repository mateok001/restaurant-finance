/**
 * API 服务器配置
 *
 * 开发阶段：
 *   - 模拟器：使用 http://localhost:8080
 *   - 手机预览：改为电脑局域网 IP，如 http://192.168.1.14:8080
 *
 * 查看本机 IP：
 *   Windows: ipconfig | findstr IPv4
 *   Mac/Linux: ifconfig | grep "inet "
 */
const DEV_IP = '192.168.1.14'; // 改为你的局域网 IP
const PORT = '8080';

// 根据运行环境自动选择
// 模拟器使用 localhost，真机使用局域网 IP
const BASE_URL = `http://${DEV_IP}:${PORT}/api/v1`;

module.exports = {
  BASE_URL,
  DEV_IP,
  PORT,
};

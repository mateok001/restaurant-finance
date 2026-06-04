/**
 * 格式化日期为 YYYY-MM-DD
 */
function formatDate(date) {
  const d = date || new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 格式化金额（保留两位小数，加千分位）
 */
function formatMoney(amount) {
  if (amount == null) return '¥0.00';
  const num = parseFloat(amount);
  const parts = num.toFixed(2).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `¥${parts.join('.')}`;
}

/**
 * 格式化金额（不带 ¥ 符号）
 */
function formatNumber(amount) {
  if (amount == null) return '0.00';
  const num = parseFloat(amount);
  const parts = num.toFixed(2).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
}

/**
 * Toast 提示
 */
function showToast(title, icon = 'none') {
  wx.showToast({ title, icon, duration: 2000 });
}

/**
 * 显示加载中
 */
function showLoading(title = '加载中...') {
  wx.showLoading({ title, mask: true });
}

function hideLoading() {
  wx.hideLoading();
}

/**
 * 确认弹窗
 */
function showConfirm(content, title = '提示') {
  return new Promise((resolve) => {
    wx.showModal({
      title,
      content,
      success: (res) => resolve(res.confirm),
    });
  });
}

module.exports = {
  formatDate,
  formatMoney,
  formatNumber,
  showToast,
  showLoading,
  hideLoading,
  showConfirm,
};

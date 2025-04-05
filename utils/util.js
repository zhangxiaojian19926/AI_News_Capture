// 格式化时间
function formatTime(date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = date.getHours();
  const minute = date.getMinutes();
  const second = date.getSeconds();

  return [year, month, day].map(formatNumber).join('-') + ' ' + [hour, minute, second].map(formatNumber).join(':');
}

// 格式化日期
function formatDate(date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  return [year, month, day].map(formatNumber).join('-');
}

// 格式化数字
function formatNumber(n) {
  n = n.toString();
  return n[1] ? n : '0' + n;
}

// 生成唯一ID
function generateId() {
  return 'id_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
}

// 截断文本
function truncateText(text, maxLength) {
  if (!text) return '';
  
  // 移除HTML标签
  text = text.replace(/<\/?[^>]+(>|$)/g, '');
  
  if (text.length <= maxLength) {
    return text;
  }
  
  return text.substring(0, maxLength) + '...';
}

// 显示成功提示
function showSuccess(message) {
  wx.showToast({
    title: message,
    icon: 'success',
    duration: 2000
  });
}

// 显示错误提示
function showError(message) {
  wx.showToast({
    title: message,
    icon: 'none',
    duration: 2000
  });
}

// 显示信息提示
function showInfo(message) {
  wx.showToast({
    title: message,
    icon: 'none',
    duration: 2000
  });
}

module.exports = {
  formatTime,
  formatDate,
  generateId,
  truncateText,
  showSuccess,
  showError,
  showInfo
};
App({
  onLaunch: function() {
    // 初始化应用
    this.checkSchedule();
  },
  
  // 检查定时任务
  checkSchedule: function() {
    const lastCheckTime = wx.getStorageSync('last_check_time') || 0;
    const now = new Date().getTime();
    
    // 如果上次检查时间超过1小时，则重新检查
    if (now - lastCheckTime > 3600000) {
      const newsService = require('./services/news');
      newsService.checkScheduledTasks();
      wx.setStorageSync('last_check_time', now);
    }
  },
  
  globalData: {
    userInfo: null
  }
})
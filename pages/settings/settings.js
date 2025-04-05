const newsService = require('../../services/news');
const util = require('../../utils/util');

Page({
  data: {
    scheduleSettings: {
      autoCollect: false,
      collectTime: '08:00',
      autoPush: false,
      pushTime: '12:00'
    },
    wechatSettings: {
      appId: '',
      appSecret: '',
      templateId: ''
    },
    loading: false
  },

  onLoad: function() {
    this.loadSettings();
  },
  
  loadSettings: function() {
    this.setData({ loading: true });
    
    // 加载定时任务设置
    const scheduleSettings = newsService.getScheduleSettings();
    
    // 加载微信公众号设置
    const wechatSettings = newsService.getWechatSettings();
    
    this.setData({
      scheduleSettings,
      wechatSettings,
      loading: false
    });
  },
  
  // 切换自动采集开关
  toggleAutoCollect: function(e) {
    const scheduleSettings = { ...this.data.scheduleSettings };
    scheduleSettings.autoCollect = e.detail.value;
    this.setData({ scheduleSettings });
    newsService.saveScheduleSettings(scheduleSettings);
  },
  
  // 设置采集时间
  setCollectTime: function(e) {
    const scheduleSettings = { ...this.data.scheduleSettings };
    scheduleSettings.collectTime = e.detail.value;
    this.setData({ scheduleSettings });
    newsService.saveScheduleSettings(scheduleSettings);
  },
  
  // 切换自动推送开关
  toggleAutoPush: function(e) {
    const scheduleSettings = { ...this.data.scheduleSettings };
    scheduleSettings.autoPush = e.detail.value;
    this.setData({ scheduleSettings });
    newsService.saveScheduleSettings(scheduleSettings);
  },
  
  // 设置推送时间
  setPushTime: function(e) {
    const scheduleSettings = { ...this.data.scheduleSettings };
    scheduleSettings.pushTime = e.detail.value;
    this.setData({ scheduleSettings });
    newsService.saveScheduleSettings(scheduleSettings);
  },
  
  // 输入AppID
  inputAppId: function(e) {
    const wechatSettings = { ...this.data.wechatSettings };
    wechatSettings.appId = e.detail.value;
    this.setData({ wechatSettings });
  },
  
  // 输入AppSecret
  inputAppSecret: function(e) {
    const wechatSettings = { ...this.data.wechatSettings };
    wechatSettings.appSecret = e.detail.value;
    this.setData({ wechatSettings });
  },
  
  // 输入模板ID
  inputTemplateId: function(e) {
    const wechatSettings = { ...this.data.wechatSettings };
    wechatSettings.templateId = e.detail.value;
    this.setData({ wechatSettings });
  },
  
  // 保存微信设置
  saveWechatSettings: function() {
    const { appId, appSecret, templateId } = this.data.wechatSettings;
    
    if (!appId || !appSecret || !templateId) {
      util.showError('请填写完整信息');
      return;
    }
    
    newsService.saveWechatSettings(this.data.wechatSettings);
    util.showSuccess('保存成功');
  },
  
  // 导航到RSS源管理页面
  navigateToRSS: function() {
    wx.navigateTo({
      url: '/pages/rss/rss'
    });
  }
})
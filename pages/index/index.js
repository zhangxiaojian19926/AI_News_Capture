const newsService = require('../../services/news');
const util = require('../../utils/util');

Page({
  data: {
    todayCollected: 0,
    pendingPush: 0,
    newsList: [],
    originalNewsList: [], // 存储原始新闻数据，包含HTML标签
    loading: false
  },

  onLoad: function() {
    this.loadStats();
  },
  
  onShow: function() {
    this.loadStats();
  },
  
  onPullDownRefresh: function() {
    this.loadStats().then(() => {
      wx.stopPullDownRefresh();
    });
  },
  
  loadStats: function() {
    this.setData({ loading: true });
    return newsService.getStats()
      .then(stats => {
        // 处理新闻内容，移除HTML标签用于显示
        const processedNewsList = stats.newsList.map(item => {
          return {
            ...item,
            content: this.removeHtmlTags(item.content),
            title: this.removeHtmlTags(item.title)
          };
        });
        
        this.setData({
          todayCollected: stats.todayCollected,
          pendingPush: stats.pendingPush,
          newsList: processedNewsList,
          originalNewsList: stats.newsList,
          loading: false
        });
      })
      .catch(error => {
        this.setData({ loading: false });
        util.showError('获取数据失败');
        console.error('获取统计数据失败:', error);
      });
  },
  
  // 移除HTML标签
  removeHtmlTags: function(text) {
    if (!text) return '';
    return text.replace(/<\/?[^>]+(>|$)/g, '');
  },
  
  handleCollectNews: function() {
    wx.showLoading({
      title: '正在采集...',
      mask: true
    });
    
    newsService.collectNews()
      .then(result => {
        wx.hideLoading();
        if (result.success) {
          util.showSuccess(`采集成功，新增${result.count}条`);
          this.loadStats();
        } else {
          util.showError('采集失败');
        }
      })
      .catch(error => {
        wx.hideLoading();
        util.showError('采集失败');
        console.error('采集新闻失败:', error);
      });
  },
  
  handlePushNews: function() {
    if (this.data.pendingPush <= 0) {
      util.showInfo('没有待推送的新闻');
      return;
    }
    
    wx.showModal({
      title: '推送确认',
      content: `确定要推送${this.data.pendingPush}条新闻到公众号吗？`,
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({
            title: '正在推送...',
            mask: true
          });
          
          newsService.pushNews()
            .then(result => {
              wx.hideLoading();
              if (result.success) {
                util.showSuccess(`推送成功，共${result.count}条`);
                this.loadStats();
              } else {
                util.showError('推送失败: ' + (result.message || '未知错误'));
              }
            })
            .catch(error => {
              wx.hideLoading();
              util.showError('推送失败');
              console.error('推送新闻失败:', error);
            });
        }
      }
    });
  },

  // 在现有代码中添加处理函数
  handleClearNews: function() {
    wx.showModal({
      title: '清除确认',
      content: '确定要清除所有新闻数据吗？此操作不可恢复！',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({
            title: '正在清除...',
            mask: true
          });
          
          newsService.clearAllNews()
            .then(result => {
              wx.hideLoading();
              if (result.success) {
                util.showSuccess('清除成功');
                this.loadStats(); // 重新加载数据
              } else {
                util.showError('清除失败');
              }
            })
            .catch(error => {
              wx.hideLoading();
              util.showError('清除失败');
              console.error('清除新闻失败:', error);
            });
        }
      }
    });
  },
  
  viewNewsDetail: function(e) {
    const index = e.currentTarget.dataset.index;
    const newsData = this.data.originalNewsList[index];
    if (!newsData) {
      wx.showToast({
        title: '新闻数据无效',
        icon: 'none'
      });
      return;
    }
    
    // 修改为通过URL参数传递数据
    const newsId = newsData.id; // 假设新闻数据有id字段
    wx.setStorageSync('current_news_data', newsData); // 仍然保留本地存储作为备份

    wx.navigateTo({
      url: `/pages/detail/detail?id=${newsId}&title=${encodeURIComponent(newsData.title)}&source=${encodeURIComponent(newsData.source.name)}&time=${encodeURIComponent(newsData.collectTime)}`
    });
  }
})
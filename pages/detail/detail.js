Page({
  data: {
    news: null,
    formattedContent: ''
  },

  onLoad: function(options) {
    // 从本地存储获取完整数据
    const news = wx.getStorageSync('current_news_data');
    
    if (news) {
      try {
        // 格式化内容，保留图片标签
        let formattedContent = news.content || '';
        
        // 处理HTML内容，保留图片标签
        formattedContent = this.formatHtmlContent(formattedContent);
        
        this.setData({ 
          news: {
            ...news,
            title: this.removeHtmlTags(news.title || '')
          },
          formattedContent
        });
      } catch (e) {
        console.error('处理新闻数据失败:', e);
      }
    } else {
      // 如果本地存储没有数据，使用URL参数的基本信息
      this.setData({
        news: {
          id: newsId,
          title: title,
          source: source,
          time: time
        },
        formattedContent: '无法加载完整内容'
      });
    }
  },
  
  // 格式化HTML内容，保留图片标签
  formatHtmlContent: function(html) {
    if (!html) return '';
    
    // 处理段落，增加间距
    html = html.replace(/<p[^>]*>/gi, '<p style="margin-bottom:30rpx;line-height:2.0;text-align:left;color:#333;padding:0;font-size:30rpx;letter-spacing:1rpx;">');

    // 处理标题，不添加缩进
    html = html.replace(/<h([1-6])[^>]*>/gi, (match, level) => {
      const fontSize = 40 - ((level - 1) * 2);
      return `<h${level} style="font-size:${fontSize}rpx;font-weight:bold;margin:40rpx 0 24rpx 0;color:#222;text-align:left;text-indent:0;">`;
    });

    // 处理列表项，不添加缩进
    html = html.replace(/<li[^>]*>/gi, '<li style="margin-bottom:20rpx;line-height:1.8;text-indent:0;">');

    // 确保图片标签有正确的样式
    html = html.replace(/<img[^>]*>/gi, (match) => {
      // 移除原有的宽高属性
      match = match.replace(/width="[^"]*"/gi, '');
      match = match.replace(/height="[^"]*"/gi, '');
      
      return match.replace(/<img/i, '<img style="max-width:100%;height:auto;display:block;margin:30rpx auto;border-radius:12rpx;box-shadow:0 4rpx 16rpx rgba(0,0,0,0.15);"');
    });
    
    return html;
  },
  
  // 移除HTML标签
  removeHtmlTags: function(text) {
    if (!text) return '';
    return text.replace(/<\/?[^>]+(>|$)/g, '');
  },

  // 复制链接到剪贴板
  copyLink: function() {
    if (this.data.news && this.data.news.url) {
      wx.setClipboardData({
        data: this.data.news.url,
        success: () => {
          wx.showToast({
            title: '链接已复制',
            icon: 'success'
          });
        }
      });
    }
  },

  // 返回上一页
  goBack: function() {
    wx.navigateBack();
  }
});
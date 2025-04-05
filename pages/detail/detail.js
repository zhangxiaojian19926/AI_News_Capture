Page({
  data: {
    news: null,
    formattedContent: ''
  },

  onLoad: function(options) {
    // 从URL参数获取基本信息
    const newsId = options.id;
    const title = decodeURIComponent(options.title || '');
    const source = decodeURIComponent(options.source || '');
    const time = decodeURIComponent(options.time || '');
    
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
        // 如果处理失败，使用URL参数的基本信息
        this.setData({
          news: {
            id: newsId,
            title: title,
            source: source,
            time: time
          },
          formattedContent: '无法加载完整内容'
        });
        
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
    
    // 移除CDATA和XML标记
    html = html.replace(/\]\]>/g, '');
    html = html.replace(/<!\[CDATA\[/g, '');
    
    // 确保图片标签有正确的样式
    html = html.replace(/<img[^>]*>/gi, (match) => {
      // 如果img标签没有style属性，添加style
      if (!match.includes('style=')) {
        return match.replace(/<img/i, '<img style="max-width:100%;height:auto;display:block;margin:20rpx auto;border-radius:8rpx;"');
      }
      // 如果已有style属性，添加max-width
      return match.replace(/style="([^"]*)"/i, 'style="$1;max-width:100%;height:auto;display:block;margin:20rpx auto;border-radius:8rpx;"');
    });
    
    // 处理链接
    html = html.replace(/<a[^>]*>/gi, (match) => {
      return match.replace(/<a/i, '<a style="color:#07C160;text-decoration:underline;"');
    });
    
    // 处理段落
    html = html.replace(/<p[^>]*>/gi, '<p style="margin-bottom:16rpx;text-indent:2em;">');
    
    // 处理标题
    html = html.replace(/<h([1-6])[^>]*>/gi, (match, level) => {
      const fontSize = 40 - (level * 4);
      return `<h${level} style="font-size:${fontSize}rpx;font-weight:bold;margin:24rpx 0 16rpx 0;">`;
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
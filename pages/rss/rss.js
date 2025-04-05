const newsService = require('../../services/news');
const util = require('../../utils/util');

Page({
  data: {
    rssSources: [],
    newSourceUrl: '',
    loading: false
  },

  onLoad: function() {
    this.loadRSSSources();
  },
  
  loadRSSSources: function() {
    this.setData({ loading: true });
    
    const rssSources = newsService.getConfiguredRSSSources();
    
    this.setData({
      rssSources,
      loading: false
    });
  },
  
  // 输入新RSS源URL
  inputSourceUrl: function(e) {
    this.setData({
      newSourceUrl: e.detail.value
    });
  },
  
  // 添加新RSS源
  addRSSSource: function() {
    const url = this.data.newSourceUrl.trim();
    
    if (!url) {
      util.showError('请输入RSS源URL');
      return;
    }
    
    if (!url.startsWith('http')) {
      util.showError('请输入有效的URL');
      return;
    }
    
    // 检查是否已存在
    const exists = this.data.rssSources.some(source => source.url === url);
    if (exists) {
      util.showError('该RSS源已存在');
      return;
    }
    
    wx.showLoading({
      title: '验证RSS源...',
      mask: true
    });
    
    // 验证RSS源是否有效
    this.validateRSSSource(url)
      .then(result => {
        wx.hideLoading();
        
        if (result.valid) {
          // 添加新源
          const newSource = {
            id: new Date().getTime().toString(),
            name: result.title || this.getSourceNameFromUrl(url),
            url: url,
            enabled: true
          };
          
          const rssSources = [...this.data.rssSources, newSource];
          this.setData({
            rssSources,
            newSourceUrl: ''
          });
          
          // 保存到存储
          newsService.saveRSSSources(rssSources);
          util.showSuccess('添加成功');
        } else {
          util.showError('无效的RSS源');
        }
      })
      .catch(error => {
        wx.hideLoading();
        util.showError('验证失败');
        console.error('验证RSS源失败:', error);
      });
  },
  
  // 验证RSS源
  validateRSSSource: function(url) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: url,
        success: res => {
          if (res.statusCode === 200 && res.data) {
            // 简单检查是否包含RSS相关标签
            const data = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
            const isRSS = data.includes('<rss') || data.includes('<feed') || data.includes('<channel');
            
            if (isRSS) {
              // 尝试提取标题
              let title = '';
              const titleMatch = data.match(/<title>(.*?)<\/title>/i);
              if (titleMatch && titleMatch[1]) {
                title = titleMatch[1];
              }
              
              resolve({ valid: true, title });
            } else {
              resolve({ valid: false });
            }
          } else {
            resolve({ valid: false });
          }
        },
        fail: reject
      });
    });
  },
  
  // 从URL中提取源名称
  getSourceNameFromUrl: function(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch (e) {
      return url.split('/')[2] || 'RSS源';
    }
  },
  
  // 切换RSS源启用状态
  toggleSourceEnabled: function(e) {
    const index = e.currentTarget.dataset.index;
    const rssSources = [...this.data.rssSources];
    
    rssSources[index].enabled = !rssSources[index].enabled;
    
    this.setData({ rssSources });
    newsService.saveRSSSources(rssSources);
  },
  
  // 删除RSS源
  deleteSource: function(e) {
    const index = e.currentTarget.dataset.index;
    const source = this.data.rssSources[index];
    
    wx.showModal({
      title: '删除确认',
      content: `确定要删除RSS源"${source.name}"吗？`,
      success: (res) => {
        if (res.confirm) {
          const rssSources = this.data.rssSources.filter((_, i) => i !== index);
          this.setData({ rssSources });
          newsService.saveRSSSources(rssSources);
          util.showSuccess('删除成功');
        }
      }
    });
  }
})
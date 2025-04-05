const api = require('./api');
const util = require('../utils/util');

// 获取统计数据和新闻列表
function getStats() {
  return new Promise((resolve) => {
    const allNews = getNewsFromStorage();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // 计算今日采集数量
    const todayCollected = allNews.filter(news => {
      const newsDate = new Date(news.collectTime);
      return newsDate >= today;
    }).length;
    
    // 计算待推送数量
    const pendingPush = allNews.filter(news => !news.isPushed).length;
    
    // 获取最近的新闻
    const newsList = allNews.slice(0, 20).map(news => ({
      id: news.id,
      title: news.title,
      content: util.truncateText(news.content, 30000), // 限制新闻字数
      source: news.source.name,
      time: util.formatTime(new Date(news.collectTime)),
      isPushed: news.isPushed
    }));
    
    resolve({
      todayCollected,
      pendingPush,
      newsList
    });
  });
}

// 从存储中获取所有新闻
function getNewsFromStorage() {
  return wx.getStorageSync('all_news') || [];
}

// 保存新闻到存储
function saveNewsToStorage(newsList) {
  wx.setStorageSync('all_news', newsList);
}

// 采集新闻
function collectNews() {
  return new Promise((resolve, reject) => {
    // 获取配置的RSS源
    const rssSources = getConfiguredRSSSources().filter(source => source.enabled);
    
    if (rssSources.length === 0) {
      resolve({ success: false, message: '没有启用的RSS源' });
      return;
    }
    
    // 获取已有的新闻，用于去重
    const existingNews = getNewsFromStorage();
    const existingUrls = new Set(existingNews.map(news => news.url));
    
    // 存储所有采集任务的Promise
    const fetchPromises = rssSources.map(source => 
      api.fetchRSSNews(source.url)
        .then(result => {
          if (result.status === 'ok' && result.articles && result.articles.length > 0) {
            return {
              source,
              articles: result.articles
            };
          }

          console.log(result.articles);

          return null;
        })
        .catch(error => {
          console.error(`从源${source.name}获取新闻失败:`, error);
          return null;
        })
    );
    
    // 等待所有采集任务完成
    Promise.all(fetchPromises)
      .then(results => {
        // 过滤掉失败的结果
        const validResults = results.filter(result => result !== null);
        
        // 合并所有新闻，并添加元数据
        let newArticles = [];
        
        validResults.forEach(result => {
          const { source, articles } = result;
          
          articles.forEach(article => {
            // 检查URL是否已存在
            if (!article.url || existingUrls.has(article.url)) {
              return;
            }
            
            // 添加新闻
            newArticles.push({
              id: util.generateId(),
              title: article.title,
              content: article.content,
              description: article.description,
              url: article.url,
              urlToImage: article.urlToImage,
              source: {
                id: source.id,
                name: source.name
              },
              author: article.author,
              publishedAt: article.publishedAt,
              collectTime: new Date().toISOString(),
              isPushed: false
            });
            
            // 添加到已存在URL集合，防止同一批次中的重复
            existingUrls.add(article.url);
          });
        });
        
        // 如果有新文章，保存到存储
        if (newArticles.length > 0) {
          // 将新文章添加到现有文章列表的前面
          const allNews = [...newArticles, ...existingNews];
          saveNewsToStorage(allNews);

          resolve({ success: true, count: newArticles.length });
        } else {
          resolve({ success: true, count: 0 });
        }
      })
      .catch(error => {
        console.error('采集新闻失败:', error);
        reject(error);
      });
  });
}

// 推送新闻到公众号
function pushNews() {
  return new Promise((resolve, reject) => {
    // 获取微信公众号设置
    const wechatSettings = getWechatSettings();
    const { appId, appSecret, templateId } = wechatSettings;
    
    if (!appId || !appSecret || !templateId) {
      resolve({ success: false, message: '微信公众号设置不完整' });
      return;
    }
    
    // 获取待推送的新闻
    const allNews = getNewsFromStorage();
    const pendingNews = allNews.filter(news => !news.isPushed);
    
    if (pendingNews.length === 0) {
      resolve({ success: false, message: '没有待推送的新闻' });
      return;
    }
    
    // 获取访问令牌
    api.getAccessToken(appId, appSecret)
      .then(accessToken => {
        // 获取关注用户列表
        return api.getFollowers(accessToken)
          .then(followers => {
            if (!followers.data || !followers.data.openid || followers.data.openid.length === 0) {
              return Promise.reject(new Error('没有关注用户'));
            }
            
            // 准备推送内容
            const today = new Date();
            const dateStr = util.formatDate(today);
            
            // 构建推送内容
            const newsDigest = pendingNews.slice(0, 5).map((news, index) => 
              `${index + 1}. ${news.title}`
            ).join('\n\n');
            
            const totalCount = pendingNews.length;
            const moreText = totalCount > 5 ? `\n\n...还有${totalCount - 5}条新闻` : '';
            
            // 构建模板消息数据
            const templateData = {
              first: {
                value: `${dateStr} AI资讯日报`,
                color: '#07C160'
              },
              keyword1: {
                value: `共${totalCount}条AI最新资讯`,
                color: '#333333'
              },
              keyword2: {
                value: util.formatTime(today),
                color: '#333333'
              },
              remark: {
                value: `${newsDigest}${moreText}\n\n点击查看详情`,
                color: '#666666'
              }
            };
            
            // 发送给所有关注用户
            const openids = followers.data.openid;
            const sendPromises = openids.map(openid => 
              api.sendTemplateMessage(accessToken, openid, templateId, templateData)
                .catch(error => {
                  console.error(`向用户${openid}发送消息失败:`, error);
                  return null;
                })
            );
            
            return Promise.all(sendPromises)
              .then(results => {
                // 过滤掉失败的结果
                const successCount = results.filter(result => result !== null).length;
                
                if (successCount > 0) {
                  // 更新新闻状态为已推送
                  const updatedNews = allNews.map(news => {
                    if (!news.isPushed) {
                      return { ...news, isPushed: true, pushTime: new Date().toISOString() };
                    }
                    return news;
                  });
                  
                  saveNewsToStorage(updatedNews);
                  
                  resolve({ 
                    success: true, 
                    count: pendingNews.length,
                    userCount: successCount
                  });
                } else {
                  resolve({ success: false, message: '发送消息失败' });
                }
              });
          });
      })
      .catch(error => {
        console.error('推送新闻失败:', error);
        reject(error);
      });
  });
}

// 获取定时任务设置
function getScheduleSettings() {
  const defaultSettings = {
    autoCollect: false,
    collectTime: '08:00',
    autoPush: false,
    pushTime: '12:00'
  };
  
  return wx.getStorageSync('schedule_settings') || defaultSettings;
}

// 保存定时任务设置
function saveScheduleSettings(settings) {
  wx.setStorageSync('schedule_settings', settings);
}

// 获取微信公众号设置
function getWechatSettings() {
  const defaultSettings = {
    appId: '',
    appSecret: '',
    templateId: ''
  };
  
  return wx.getStorageSync('wechat_settings') || defaultSettings;
}

// 保存微信公众号设置
function saveWechatSettings(settings) {
  wx.setStorageSync('wechat_settings', settings);
}

// 获取配置的RSS源
function getConfiguredRSSSources() {
  const defaultSources = [
    {
      id: '1',
      name: '机器之心',
      url: 'https://www.jiqizhixin.com/rss',
      enabled: true
    },
    {
      id: '2',
      name: 'MIT Technology Review',
      url: 'https://www.technologyreview.com/topic/artificial-intelligence/feed',
      enabled: true
    },
    {
      id: '3',
      name: 'VentureBeat',
      url: 'https://venturebeat.com/category/ai/feed/',
      enabled: true
    },
    {
      id: '4',
      name: 'AI News',
      url: 'https://artificialintelligence-news.com/feed/',
      enabled: true
    }
  ];
  
  return wx.getStorageSync('rss_sources') || defaultSources;
}

// 保存RSS源
function saveRSSSources(sources) {
  wx.setStorageSync('rss_sources', sources);
}

// 检查定时任务
function checkScheduledTasks() {
  const settings = getScheduleSettings();
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  // 检查上次执行时间
  const lastCollectTime = wx.getStorageSync('last_collect_time') || 0;
  const lastPushTime = wx.getStorageSync('last_push_time') || 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // 如果设置了自动采集
  if (settings.autoCollect) {
    const [collectHour, collectMinute] = settings.collectTime.split(':').map(Number);
    
    // 如果当前时间在采集时间之后，且今天还没有采集
    if ((currentHour > collectHour || (currentHour === collectHour && currentMinute >= collectMinute)) && 
        lastCollectTime < today.getTime()) {
      // 执行采集
      collectNews()
        .then(result => {
          if (result.success) {
            console.log(`自动采集成功，新增${result.count}条`);
            // 更新最后采集时间
            wx.setStorageSync('last_collect_time', now.getTime());
          } else {
            console.error('自动采集失败:', result.message);
          }
        })
        .catch(error => {
          console.error('自动采集出错:', error);
        });
    }
  }
  
  // 如果设置了自动推送
  if (settings.autoPush) {
    const [pushHour, pushMinute] = settings.pushTime.split(':').map(Number);
    
    // 如果当前时间在推送时间之后，且今天还没有推送
    if ((currentHour > pushHour || (currentHour === pushHour && currentMinute >= pushMinute)) && 
        lastPushTime < today.getTime()) {
      // 执行推送
      pushNews()
        .then(result => {
          if (result.success) {
            console.log(`自动推送成功，共${result.count}条`);
            // 更新最后推送时间
            wx.setStorageSync('last_push_time', now.getTime());
          } else {
            console.error('自动推送失败:', result.message);
          }
        })
        .catch(error => {
          console.error('自动推送出错:', error);
        });
    }
  }
}

// 获取原始新闻项
function getOriginalNewsItem(index) {
  const allNews = getNewsFromStorage();
  return allNews[index] || null;
}

// 清除所有新闻
function clearAllNews() {
  return new Promise((resolve) => {
    // 清空存储
    wx.setStorageSync('all_news', []);
    resolve({ success: true });
  });
}

module.exports = {
  getStats,
  collectNews,
  pushNews,
  getScheduleSettings,
  saveScheduleSettings,
  getWechatSettings,
  saveWechatSettings,
  getConfiguredRSSSources,
  saveRSSSources,
  checkScheduledTasks,
  getOriginalNewsItem,
  clearAllNews  // 添加这一行
};
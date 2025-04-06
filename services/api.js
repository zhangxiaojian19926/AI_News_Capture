// 微信公众号API接口封装
const util = require('../utils/util');

// 获取微信公众号访问令牌
function getAccessToken(appId, appSecret) {
  return new Promise((resolve, reject) => {
    // 检查本地存储中是否有有效的token
    const tokenInfo = wx.getStorageSync('wechat_access_token');
    const now = new Date().getTime();
    
    if (tokenInfo && tokenInfo.expireTime > now) {
      // 使用缓存的token
      resolve(tokenInfo.accessToken);
      return;
    }
    
    // 请求新token
    wx.request({
      url: `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`,
      method: 'GET',
      success: res => {
        if (res.statusCode === 200 && res.data.access_token) {
          const accessToken = res.data.access_token;
          const expiresIn = res.data.expires_in || 7200;
          
          // 保存token到本地存储，设置过期时间
          const tokenInfo = {
            accessToken,
            expireTime: now + (expiresIn * 1000) - 60000 // 提前1分钟过期
          };
          wx.setStorageSync('wechat_access_token', tokenInfo);
          
          resolve(accessToken);
        } else {
          reject(new Error('获取访问令牌失败: ' + JSON.stringify(res.data)));
        }
      },
      fail: err => {
        reject(err);
      }
    });
  });
}

// 发送模板消息
function sendTemplateMessage(accessToken, openId, templateId, data, url = '') {
  return new Promise((resolve, reject) => {
    const message = {
      touser: openId,
      template_id: templateId,
      url: url,
      data: data
    };
    
    wx.request({
      url: `https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=${accessToken}`,
      method: 'POST',
      data: message,
      success: res => {
        if (res.statusCode === 200 && res.data.errcode === 0) {
          resolve(res.data);
        } else {
          reject(new Error('发送模板消息失败: ' + JSON.stringify(res.data)));
        }
      },
      fail: err => {
        reject(err);
      }
    });
  });
}

// 获取关注用户列表
function getFollowers(accessToken, nextOpenId = '') {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `https://api.weixin.qq.com/cgi-bin/user/get?access_token=${accessToken}&next_openid=${nextOpenId}`,
      method: 'GET',
      success: res => {
        if (res.statusCode === 200 && res.data.data) {
          resolve(res.data);
        } else {
          reject(new Error('获取关注用户列表失败: ' + JSON.stringify(res.data)));
        }
      },
      fail: err => {
        reject(err);
      }
    });
  });
}

// 从RSS源获取新闻
function fetchRSSNews(sourceUrl) {
  return new Promise((resolve, reject) => {
    const serverUrl = wx.getStorageSync('server_url') || 'https://api.rss2json.com/v1/api.json';
    
    wx.request({
      url: serverUrl,
      method: 'GET',
      data: {
        rss_url: sourceUrl,
        api_key: 'API_KEY', // 可选，免费版有使用限制
        count: 20
      },
      success: res => {
        if (res.statusCode === 200 && res.data.status === 'ok') {
          // 将rss2json的响应格式转换为我们的标准格式
          const articles = res.data.items.map(item => ({
            source: { id: "rss", name: res.data.feed.title || "RSS Feed" },
            author: item.author || res.data.feed.title || "未知作者",
            title: item.title || "无标题",
            description: item.description || "",
            url: item.link || "",
            urlToImage: item.thumbnail || "",
            publishedAt: item.pubDate || new Date().toISOString(),
            content: item.content || item.description || "",
            full_content: true // 添加此参数请求完整内容
          }));

          resolve({
            status: "ok",
            totalResults: articles.length,
            articles
          });
        } else {
          // 如果API调用失败，使用模拟数据
          console.error('RSS解析失败:', res);
          resolve(getMockRSSNews());
        }
      },
      fail: err => {
        console.error('获取RSS新闻失败:', err);
        // 如果请求失败，使用模拟数据
        resolve(getMockRSSNews());
      }
    });
  });
}

// 获取模拟RSS新闻数据
function getMockRSSNews() {
  return {
    status: "ok",
    totalResults: 1,
    articles: [
      {
        source: { id: "rss", name: "模拟RSS源" },
        author: "模拟作者",
        title: "无法获取RSS源，这是模拟数据",
        description: "当前无法连接到RSS源，这是一条模拟的新闻数据。请检查网络连接或RSS源地址是否正确。",
        url: "",
        urlToImage: "",
        publishedAt: new Date().toISOString(),
        content: "当前无法连接到RSS源，这是一条模拟的新闻数据。请检查网络连接或RSS源地址是否正确。"
      }
    ]
  };
}

module.exports = {
  getAccessToken,
  sendTemplateMessage,
  getFollowers,
  fetchRSSNews
};
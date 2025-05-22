// 缓存键
const BANNER_CACHE_KEY = 'discovery_banners_cache';
const CACHE_EXPIRATION = 30 * 60 * 1000; // 30分钟缓存过期时间

// 备用轮播图数据（当API请求失败时使用）
const FALLBACK_BANNERS = [
  {
    id: 1,
    imageUrl: 'https://tse4-mm.cn.bing.net/th/id/OIP-C.26LtiAfs0C4xIM26xUZqzgAAAA',
    linkUrl: '../article/detail?id=1'
  },
  {
    id: 2,
    imageUrl: 'https://tse3-mm.cn.bing.net/th/id/OIP-C.55APjLGpMTwORYb0btwSdgHaE7',
    linkUrl: '../article/detail?id=2'
  }
];

/**
 * 获取轮播图数据
 * @param {boolean} forceRefresh 是否强制刷新
 * @returns {Promise<Array>} 轮播图数据
 */
function getBanners(forceRefresh = false) {
  return new Promise((resolve, reject) => {
    // 尝试从缓存获取数据
    if (!forceRefresh) {
      const cachedData = getCachedBanners();
      if (cachedData) {
        console.log('使用缓存的轮播图数据');
        return resolve(cachedData);
      }
    }

    // 从服务器获取数据
    wx.request({
      url: 'http://your-server-domain:8080/api/banners',  // 替换为实际的服务器地址
      method: 'GET',
      success: (res) => {
        if (res.statusCode === 200 && res.data && Array.isArray(res.data)) {
          // 缓存数据
          cacheBanners(res.data);
          resolve(res.data);
        } else {
          console.error('获取轮播图数据格式错误:', res);
          // 使用备用数据
          resolve(FALLBACK_BANNERS);
        }
      },
      fail: (err) => {
        console.error('获取轮播图失败:', err);
        // 使用备用数据
        resolve(FALLBACK_BANNERS);
      }
    });
  });
}

/**
 * 缓存轮播图数据
 * @param {Array} data 轮播图数据
 */
function cacheBanners(data) {
  try {
    wx.setStorageSync(BANNER_CACHE_KEY, {
      timestamp: Date.now(),
      data: data
    });
  } catch (e) {
    console.error('缓存轮播图数据失败:', e);
  }
}

/**
 * 获取缓存的轮播图数据
 * @returns {Array|null} 缓存的轮播图数据，如果没有缓存或缓存过期则返回null
 */
function getCachedBanners() {
  try {
    const cache = wx.getStorageSync(BANNER_CACHE_KEY);
    if (cache && cache.timestamp && cache.data) {
      // 检查缓存是否过期
      if (Date.now() - cache.timestamp < CACHE_EXPIRATION) {
        return cache.data;
      }
    }
    return null;
  } catch (e) {
    console.error('获取缓存轮播图数据失败:', e);
    return null;
  }
}

// 导出数据
module.exports = {
  getBanners: getBanners
}; 
/**
 * 通用工具库
 * 包含常用的功能函数，如日期格式化、数据验证、缓存管理等
 */

// 日期相关工具函数
const dateUtils = {
  /**
   * 格式化日期
   * @param {Date} date - 日期对象
   * @param {String} format - 格式化模板，如 'YYYY-MM-DD HH:mm:ss'
   * @returns {String} 格式化后的日期字符串
   */
  formatDate: (date = new Date(), format = 'YYYY-MM-DD') => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();

    const pad = (num) => (num < 10 ? '0' + num : num);

    return format
      .replace('YYYY', year)
      .replace('MM', pad(month))
      .replace('DD', pad(day))
      .replace('HH', pad(hours))
      .replace('mm', pad(minutes))
      .replace('ss', pad(seconds));
  },

  /**
   * 获取相对日期
   * @param {Number} days - 相对于今天的天数
   * @returns {Date} 相对日期
   */
  getRelativeDate: (days) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
  },

  /**
   * 格式化时长为易读字符串
   * @param {Number} minutes - 总分钟数
   * @returns {String} 格式化后的时长，如 "3小时20分钟"
   */
  formatDuration: (minutes) => {
    if (typeof minutes !== 'number' || isNaN(minutes)) {
      return '0分钟';
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}小时${mins > 0 ? mins + '分钟' : ''}` : `${mins}分钟`;
  }
};

// 数据验证工具函数
const validators = {
  /**
   * 检查字符串是否为空
   * @param {String} str - 要检查的字符串
   * @returns {Boolean} 是否为空
   */
  isEmpty: (str) => {
    return !str || str.trim().length === 0;
  },

  /**
   * 验证手机号格式
   * @param {String} phone - 手机号
   * @returns {Boolean} 是否是有效的手机号
   */
  isValidPhone: (phone) => {
    return /^1[3-9]\d{9}$/.test(phone);
  },

  /**
   * 验证邮箱格式
   * @param {String} email - 邮箱
   * @returns {Boolean} 是否是有效的邮箱
   */
  isValidEmail: (email) => {
    return /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/.test(email);
  }
};

// 缓存管理工具函数
const cacheUtils = {
  /**
   * 存储缓存数据
   * @param {String} key - 缓存键
   * @param {Any} data - 要存储的数据
   * @param {Number} expireTime - 过期时间（毫秒），默认7天
   */
  set: (key, data, expireTime = 7 * 24 * 60 * 60 * 1000) => {
    try {
      const cacheData = {
        data,
        expireTime: Date.now() + expireTime
      };
      wx.setStorageSync(key, cacheData);
      return true;
    } catch (error) {
      console.error('缓存存储失败:', error);
      return false;
    }
  },

  /**
   * 获取缓存数据
   * @param {String} key - 缓存键
   * @returns {Any} 缓存数据，如果不存在或已过期返回null
   */
  get: (key) => {
    try {
      const cacheData = wx.getStorageSync(key);
      if (!cacheData) return null;

      // 检查是否过期
      if (cacheData.expireTime && cacheData.expireTime < Date.now()) {
        wx.removeStorageSync(key);
        return null;
      }

      return cacheData.data;
    } catch (error) {
      console.error('获取缓存失败:', error);
      return null;
    }
  },

  /**
   * 清除指定缓存
   * @param {String} key - 缓存键
   */
  remove: (key) => {
    try {
      wx.removeStorageSync(key);
      return true;
    } catch (error) {
      console.error('清除缓存失败:', error);
      return false;
    }
  },

  /**
   * 清除所有缓存
   */
  clear: () => {
    try {
      wx.clearStorageSync();
      return true;
    } catch (error) {
      console.error('清除所有缓存失败:', error);
      return false;
    }
  }
};

// 错误处理工具函数
const errorHandler = {
  /**
   * 显示错误提示
   * @param {String} message - 错误信息
   * @param {Boolean} showToast - 是否显示toast
   */
  showError: (message, showToast = true) => {
    console.error(message);
    if (showToast) {
      wx.showToast({
        title: message,
        icon: 'none',
        duration: 2000
      });
    }
  },

  /**
   * 处理Promise错误
   * @param {Function} promise - Promise函数
   * @param {String} errorMessage - 错误信息前缀
   * @returns {Promise} 处理后的Promise
   */
  handlePromise: async (promise, errorMessage = '操作失败') => {
    try {
      return await promise;
    } catch (error) {
      const message = `${errorMessage}: ${error.message || '未知错误'}`;
      errorHandler.showError(message);
      throw error;
    }
  }
};

// 用户状态管理
const userManager = {
  /**
   * 检查用户是否已登录
   * @returns {Boolean} 是否已登录
   */
  isLoggedIn: () => {
    return !!wx.getStorageSync('openid');
  },

  /**
   * 获取用户信息
   * @returns {Object|null} 用户信息对象
   */
  getUserInfo: () => {
    return cacheUtils.get('userInfo') || null;
  },

  /**
   * 保存用户信息
   * @param {Object} userInfo - 用户信息对象
   */
  setUserInfo: (userInfo) => {
    return cacheUtils.set('userInfo', userInfo);
  },

  /**
   * 清除用户信息（退出登录）
   */
  logout: () => {
    cacheUtils.remove('openid');
    cacheUtils.remove('userInfo');
  },

  /**
   * 确保用户已登录，否则跳转到登录页
   * @returns {Boolean} 是否已登录
   */
  ensureLoggedIn: () => {
    if (!userManager.isLoggedIn()) {
      wx.navigateTo({
        url: '/pages/login/login'
      });
      return false;
    }
    return true;
  }
};

// 工具类导出
module.exports = {
  dateUtils,
  validators,
  cacheUtils,
  errorHandler,
  userManager,
  
  /**
   * 节流函数，限制函数调用频率
   * @param {Function} fn - 要执行的函数
   * @param {Number} delay - 延迟时间（毫秒）
   * @returns {Function} 节流后的函数
   */
  throttle: (fn, delay = 500) => {
    let lastCall = 0;
    return function(...args) {
      const now = Date.now();
      if (now - lastCall < delay) return;
      lastCall = now;
      return fn.apply(this, args);
    };
  },
  
  /**
   * 防抖函数，延迟函数调用
   * @param {Function} fn - 要执行的函数
   * @param {Number} delay - 延迟时间（毫秒）
   * @returns {Function} 防抖后的函数
   */
  debounce: (fn, delay = 300) => {
    let timer = null;
    return function(...args) {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        fn.apply(this, args);
      }, delay);
    };
  }
}; 
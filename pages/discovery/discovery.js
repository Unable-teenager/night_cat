// pages/discovery/discovery.js
const bannerData = require('./data_discovery.js');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    banners: [],
    isLoading: true,
    hasError: false,
    stories: [
      {
        title: '带你了解华佗的故事',
        image: 'https://tse4-mm.cn.bing.net/th/id/OIP-C.26LtiAfs0C4xIM26xUZqzgAAAA?w=310&h=161&c=7&r=0&o=5&dpr=1.3&pid=1.7',
        url: '../story/huatuo',
        description: '中国古代著名医学家，发明麻沸散'
      },
      {
        title: '李时珍的本草纲目',
        image: 'https://tse3-mm.cn.bing.net/th/id/OIP-C.55APjLGpMTwORYb0btwSdgHaE7?rs=1&pid=ImgDetMain',
        url: '../story/lishizhen',
        description: '中医药学巨著，记载药物1892种'
      }
    ],
    articles: [
      {
        title: '中医养生的五大原则',
        content: '中医养生强调顺应自然、平衡阴阳、调和气血、心身并重、预防为主的理念...',
        image: 'https://tse3-mm.cn.bing.net/th/id/OIP-C.55APjLGpMTwORYb0btwSdgHaE7?rs=1&pid=ImgDetMain',
        url: '../article/detail?id=1',
        views: 1280
      },
      {
        title: '四季养生小常识',
        content: '春生、夏长、秋收、冬藏，不同季节有不同的养生方法和重点...',
        image: 'https://tse4-mm.cn.bing.net/th/id/OIP-C.26LtiAfs0C4xIM26xUZqzgAAAA?w=310&h=161&c=7&r=0&o=5&dpr=1.3&pid=1.7',
        url: '../article/detail?id=2',
        views: 986
      }
    ],
    refreshing: false,
    currentStoryIndex: 0,
    autoSwitchStory: true
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.loadPageData();
    
    // 设置定时器，自动切换故事卡片
    if (this.data.autoSwitchStory && this.data.stories.length > 1) {
      this.startStoryAutoSwitch();
    }
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {
    // 页面渲染完成后，可以执行一些初始化操作
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 如果之前设置了自动切换，则恢复
    if (this.data.autoSwitchStory && this.data.stories.length > 1) {
      this.startStoryAutoSwitch();
    }
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {
    // 页面隐藏时清除定时器
    this.clearStoryAutoSwitch();
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {
    // 页面卸载时清除定时器
    this.clearStoryAutoSwitch();
  },

  /**
   * 开始自动切换故事
   */
  startStoryAutoSwitch() {
    // 清除可能存在的旧定时器
    this.clearStoryAutoSwitch();
    
    // 设置新定时器
    this.storyTimer = setInterval(() => {
      const nextIndex = (this.data.currentStoryIndex + 1) % this.data.stories.length;
      this.setData({
        currentStoryIndex: nextIndex
      });
    }, 5000); // 每5秒切换一次
  },

  /**
   * 清除故事自动切换定时器
   */
  clearStoryAutoSwitch() {
    if (this.storyTimer) {
      clearInterval(this.storyTimer);
      this.storyTimer = null;
    }
  },

  /**
   * 加载页面所有数据
   */
  loadPageData() {
    this.setData({
      isLoading: true,
      hasError: false
    });

    wx.showLoading({
      title: '加载中',
    });

    // 并行加载多个数据源
    Promise.all([
      this.loadBanners(),
      this.loadStories(),
      this.loadArticles()
    ])
      .catch(err => {
        console.error('加载数据失败:', err);
        this.setData({
          hasError: true
        });
        
        wx.showToast({
          title: '加载失败，请下拉刷新',
          icon: 'none',
          duration: 2000
        });
      })
      .finally(() => {
        wx.hideLoading();
        this.setData({
          isLoading: false,
          refreshing: false
        });
      });
  },

  /**
   * 加载轮播图数据
   */
  loadBanners() {
    return new Promise((resolve, reject) => {
      bannerData.getBanners()
        .then(banners => {
          this.setData({
            banners: banners
          });
          resolve(banners);
        })
        .catch(err => {
          console.error('加载轮播图失败:', err);
          reject(err);
        });
    });
  },

  /**
   * 加载故事数据
   * 注意：此处使用模拟数据，实际应用中应该从服务器获取
   */
  loadStories() {
    return new Promise((resolve) => {
      // 这里可以替换为实际的API请求
      // 目前使用本地数据，直接返回成功
      resolve(this.data.stories);
    });
  },

  /**
   * 加载文章数据
   * 注意：此处使用模拟数据，实际应用中应该从服务器获取
   */
  loadArticles() {
    return new Promise((resolve) => {
      // 这里可以替换为实际的API请求
      // 目前使用本地数据，直接返回成功
      resolve(this.data.articles);
    });
  },

  /**
   * 轮播图点击事件
   */
  bannerTap(e) {
    const url = e.currentTarget.dataset.url;
    if (url) {
      wx.navigateTo({
        url: url
      });
    }
  },

  /**
   * 故事点击事件
   */
  storyTap(e) {
    const index = e.currentTarget.dataset.index || this.data.currentStoryIndex;
    const story = this.data.stories[index];
    
    if (story && story.url) {
      wx.navigateTo({
        url: story.url
      });
    }
  },

  /**
   * 文章点击事件
   */
  articleTap(e) {
    const index = e.currentTarget.dataset.index;
    const article = this.data.articles[index];
    
    if (article && article.url) {
      // 增加浏览量（实际应用中应该通过API更新服务器数据）
      const updatedArticles = [...this.data.articles];
      updatedArticles[index] = {
        ...article,
        views: (article.views || 0) + 1
      };
      
      this.setData({
        articles: updatedArticles
      });
      
      wx.navigateTo({
        url: article.url
      });
    }
  },

  /**
   * 跳转到文章专区
   */
  gotoPage_eaasy() {
    wx.navigateTo({
      url: '../dc_essay/dc_essay',
    });
  },

  /**
   * 跳转到视频专区
   */
  gotoPage_video() {
    wx.navigateTo({
      url: '../dc_video/dc_video',
    });
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {
    this.setData({
      refreshing: true
    });
    this.loadPageData();
    wx.stopPullDownRefresh();
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {
    // 可以在这里实现加载更多文章的功能
    wx.showToast({
      title: '加载更多内容',
      icon: 'none',
      duration: 1000
    });
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {
    return {
      title: '发现更多健康养生知识',
      path: '/pages/discovery/discovery',
      imageUrl: this.data.banners.length > 0 ? this.data.banners[0].imageUrl : ''
    };
  }
})
// pages/dc_essay/dc_essay.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    essayList: [], // 文章列表
    originalEssayList: [], // 原始文章列表（用于搜索恢复）
    searchQuery: '', // 搜索关键词
    isLoading: false, // 加载状态
    hasError: false // 错误状态
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.loadEssayData();
  },

  /**
   * 加载文章数据
   */
  loadEssayData: function() {
    this.setData({
      isLoading: true,
      hasError: false
    });

    // 模拟数据加载
    // 实际项目中应该从服务器获取数据
    setTimeout(() => {
      const essayList = [
        {
          id: 1,
          title: '中医养生的五大原则',
          description: '中医养生强调顺应自然、平衡阴阳、调和气血、心身并重、预防为主的理念，本文详细解析这五大原则...',
          imageUrl: 'https://tse4-mm.cn.bing.net/th/id/OIP-C.MUiPnVsfM8-ENE6hSPpmEAHaE7?w=261&h=180&c=7&r=0&o=5&dpr=1.3&pid=1.7',
          author: '张三',
          views: 1280,
          publishDate: '2023-04-15'
        },
        {
          id: 2,
          title: '四季养生小常识',
          description: '春生、夏长、秋收、冬藏，不同季节有不同的养生方法和重点，让我们一起了解如何根据季节变化调整养生策略...',
          imageUrl: 'https://tse4-mm.cn.bing.net/th/id/OIP-C.MUiPnVsfM8-ENE6hSPpmEAHaE7?w=261&h=180&c=7&r=0&o=5&dpr=1.3&pid=1.7',
          author: '李四',
          views: 986,
          publishDate: '2023-05-20'
        },
        {
          id: 3,
          title: '带你了解华佗的故事',
          description: '华佗，东汉末年著名医学家，被誉为"神医"，发明了"麻沸散"，是世界上最早使用全身麻醉剂的医生...',
          imageUrl: 'https://tse4-mm.cn.bing.net/th/id/OIP-C.MUiPnVsfM8-ENE6hSPpmEAHaE7?w=261&h=180&c=7&r=0&o=5&dpr=1.3&pid=1.7',
          author: '王五',
          views: 1568,
          publishDate: '2023-06-10'
        }
      ];

      this.setData({
        essayList: essayList,
        originalEssayList: essayList,
        isLoading: false
      });
    }, 500);
  },

  /**
   * 搜索输入事件
   */
  onSearchInput: function(e) {
    this.setData({
      searchQuery: e.detail.value
    });
  },

  /**
   * 搜索确认事件
   */
  onSearchConfirm: function() {
    const query = this.data.searchQuery.trim().toLowerCase();
    
    if (!query) {
      // 如果搜索关键词为空，恢复原始列表
      this.setData({
        essayList: this.data.originalEssayList
      });
      return;
    }
    
    // 根据搜索关键词过滤文章列表
    const filteredList = this.data.originalEssayList.filter(item => 
      item.title.toLowerCase().includes(query) || 
      item.description.toLowerCase().includes(query) ||
      item.author.toLowerCase().includes(query)
    );
    
    this.setData({
      essayList: filteredList
    });

    // 如果没有搜索结果，显示提示
    if (filteredList.length === 0) {
      wx.showToast({
        title: '没有找到相关文章',
        icon: 'none',
        duration: 2000
      });
    }
  },

  /**
   * 文章点击事件
   */
  onEssayTap: function(e) {
    const id = e.currentTarget.dataset.id;
    // 跳转到文章详情页
    wx.navigateTo({
      url: `../article_detail/article_detail?id=${id}`
    });
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {
    this.loadEssayData();
    wx.stopPullDownRefresh();
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {
    // 可以在这里实现加载更多文章
    wx.showToast({
      title: '加载更多内容',
      icon: 'none',
      duration: 1000
    });
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {
    return {
      title: '文章专区 - 发现更多健康养生知识',
      path: '/pages/dc_essay/dc_essay'
    };
  },

  /**
   * 顶部刷新
   */
  upper: function () {
    wx.showNavigationBarLoading();
    this.loadEssayData();
    console.log("upper");
    setTimeout(function(){
      wx.hideNavigationBarLoading();
      wx.stopPullDownRefresh();
    }, 2000);
  },

  /**
   * 底部加载更多
   */
  lower: function() {
    // 可以在这里实现加载更多文章
    wx.showToast({
      title: '加载更多内容',
      icon: 'none',
      duration: 1000
    });
  }
})
//index.js

const util = require('../../utils/util.js')
const app = getApp()

Page({
  data: {
    feed: [],
    originalFeed: [], // 原始数据，用于搜索恢复
    feed_length: 0,
    searchQuery: '', // 搜索关键词
    isLoading: false, // 加载状态
    hasError: false, // 错误状态
    isRefreshing: false,
    loadingMore: false
  },
  //事件处理函数
  bindItemTap: function() {
    wx.navigateTo({
      url: '../answer/answer'
    })
  },
  bindQueTap: function() {
    wx.navigateTo({
      url: '../question/question'
    })
  },
  onLoad: function () {
    console.log('onLoad')
    this.loadData();
  },
  // 下拉刷新
  onPullDownRefresh: function() {
    this.refreshData();
    wx.stopPullDownRefresh();
  },
  // 上拉加载更多
  onReachBottom: function() {
    this.loadMoreData();
  },
  // 加载初始数据
  loadData: function() {
    this.setData({ isLoading: true, hasError: false });
    
    try {
      const feed = util.getData2();
      this.setData({
        feed: feed.data,
        originalFeed: feed.data,
        feed_length: feed.data.length,
        isLoading: false
      });
    } catch (error) {
      console.error('加载数据失败:', error);
      this.setData({
        isLoading: false,
        hasError: true
      });
      wx.showToast({
        title: '加载数据失败',
        icon: 'none'
      });
    }
  },
  // 刷新数据
  refreshData: function() {
    this.setData({ isRefreshing: true });
    
    wx.showNavigationBarLoading();
    
    try {
      const feed = util.getData2();
      
      this.setData({
        feed: feed.data,
        originalFeed: feed.data,
        feed_length: feed.data.length,
        isRefreshing: false
      });
      
      wx.showToast({
        title: '刷新成功',
        icon: 'success',
        duration: 1500
      });
    } catch (error) {
      console.error('刷新数据失败:', error);
      wx.showToast({
        title: '刷新失败',
        icon: 'none'
      });
    } finally {
      wx.hideNavigationBarLoading();
      this.setData({ isRefreshing: false });
    }
  },
  // 加载更多数据
  loadMoreData: function() {
    if (this.data.loadingMore) return;
    
    this.setData({ loadingMore: true });
    
    try {
      const next = util.getNext();
      
      this.setData({
        feed: this.data.feed.concat(next.data),
        feed_length: this.data.feed_length + next.data.length,
        loadingMore: false
      });
      
      // 如果处于搜索状态，也更新原始数据
      if (this.data.searchQuery) {
        this.setData({
          originalFeed: this.data.originalFeed.concat(next.data)
        });
      }
    } catch (error) {
      console.error('加载更多数据失败:', error);
      wx.showToast({
        title: '加载更多失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loadingMore: false });
    }
  },
  // 向上滚动刷新
  upper: function () {
    this.refreshData();
  },
  // 向下滚动加载更多
  lower: function (e) {
    wx.showNavigationBarLoading();
    var that = this;
    setTimeout(function(){wx.hideNavigationBarLoading();that.loadMoreData();}, 1000);
    console.log("lower")
  },

  /**
   * 搜索输入事件
   */
  onSearchInput: function(e) {
    this.setData({
      searchQuery: e.detail.value
    });
    
    // 如果搜索框被清空，恢复原始列表
    if (!e.detail.value.trim()) {
      this.setData({
        feed: this.data.originalFeed
      });
    }
  },

  /**
   * 搜索确认事件
   */
  onSearchConfirm: function() {
    const query = this.data.searchQuery.trim().toLowerCase();
    
    if (!query) {
      // 如果搜索关键词为空，恢复原始列表
      this.setData({
        feed: this.data.originalFeed
      });
      return;
    }
    
    // 根据搜索关键词过滤列表
    const filteredList = this.data.originalFeed.filter(item => 
      item.question.toLowerCase().includes(query) || 
      item.answer_ctnt.toLowerCase().includes(query) ||
      item.feed_source_name.toLowerCase().includes(query)
    );
    
    this.setData({
      feed: filteredList
    });

    // 如果没有搜索结果，显示提示
    if (filteredList.length === 0) {
      wx.showToast({
        title: '没有找到相关内容',
        icon: 'none',
        duration: 2000
      });
    }
  },

  //网络请求数据, 实现首页刷新
  refresh0: function(){
    var index_api = '';
    util.getData(index_api)
        .then(function(data){
          //this.setData({
          //
          //});
          console.log(data);
        });
  },

  // 点击发布按钮
  onPostTap: function() {
    wx.navigateTo({
      url: '../post/post'
    });
  },
  
  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {
    return {
      title: '社区 - 分享健康养生经验',
      path: '/pages/community/community'
    };
  }
})

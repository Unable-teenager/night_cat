// pages/dc_video/dc_video.js
Page({

  /**
   * 页面的初始数据
   */
    data: {
      list: [],
      searchQuery: '',
      originalList: [], // Store the original list for filtering
      isLoading: false, // 加载状态
      hasError: false, // 错误状态
      name: '苏苏',
      num: '1',
      title: '测试数据测试测试测试测测试数据测试测试测试测测试数据测试测试测试测测试数据测试测试测试测',
      url: 'https://ts1.tc.mm.bing.net/th/id/R-C.583d5c51dd956b0436232109a72478e6?rik=%2bQmK5PcTRPbfuw&riu=http%3a%2f%2fseopic.699pic.com%2fphoto%2f50110%2f4032.jpg_wh1200.jpg&ehk=4p4GBVGKpjXKtvvKqJrQvD3Bkqq4ESSjSRKhA63TLio%3d&risl=&pid=ImgRaw&r=0',
      avatar: 'https://ts1.tc.mm.bing.net/th/id/R-C.583d5c51dd956b0436232109a72478e6?rik=%2bQmK5PcTRPbfuw&riu=http%3a%2f%2fseopic.699pic.com%2fphoto%2f50110%2f4032.jpg_wh1200.jpg&ehk=4p4GBVGKpjXKtvvKqJrQvD3Bkqq4ESSjSRKhA63TLio%3d&risl=&pid=ImgRaw&r=0'
    },
  
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.loadData();
  },

  loadData: function() {
    this.setData({
      isLoading: true,
      hasError: false
    });
    
    // 模拟数据加载
    // 实际项目中应该从服务器获取数据
    setTimeout(() => {
      const list = [];
      
      // 示例数据
      for (let i = 1; i <= 10; i++) {
        list.push({
          url: "https://img.wxcha.com/m00/86/59/7c6242363084072b82b6957cacc335c7.jpg",
          avatar: "https://img.wxcha.com/m00/86/59/7c6242363084072b82b6957cacc335c7.jpg",
          title: "视频标题" + i,
          name: "作者" + i,
          num: Math.floor(Math.random() * 1000)
        });
      }
      
      this.setData({
        list: list,
        originalList: list,
        isLoading: false
      });
    }, 500);
  },

  onSearchInput: function(e) {
    this.setData({
      searchQuery: e.detail.value
    });
    
    // 如果搜索框被清空，恢复原始列表
    if (!e.detail.value.trim()) {
      this.setData({
        list: this.data.originalList
      });
    }
  },

  onSearchConfirm: function() {
    const query = this.data.searchQuery.trim().toLowerCase();
    
    if (!query) {
      // 如果搜索关键词为空，恢复原始列表
      this.setData({
        list: this.data.originalList
      });
      return;
    }
    
    // 根据搜索关键词过滤列表
    const filteredList = this.data.originalList.filter(item => 
      item.title.toLowerCase().includes(query) || 
      item.name.toLowerCase().includes(query)
    );
    
    this.setData({
      list: filteredList
    });

    // 如果没有搜索结果，显示提示
    if (filteredList.length === 0) {
      wx.showToast({
        title: '没有找到相关视频',
        icon: 'none',
        duration: 2000
      });
    }
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {
    
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {
    
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {
    
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {
    this.loadData();
    wx.stopPullDownRefresh();
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {
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
      title: '视频专区 - 发现更多健康养生视频',
      path: '/pages/dc_video/dc_video'
    };
  }
})

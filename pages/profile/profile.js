const app = getApp();

Page({
  data: {
    userInfo: null,
    defaultAvatar: '/images/default_avatar.png' // 定义默认头像路径
  },

  onShow: function () {
    // 页面显示时，从 globalData 或本地存储中获取用户信息
    this.loadUserInfo();
  },

  loadUserInfo: function() {
    const storedUserInfo = wx.getStorageSync('userInfo');
    if (storedUserInfo && storedUserInfo.nickName) { // 确保有昵称，表明是有效用户信息
      this.setData({
        userInfo: storedUserInfo
      });
    } else if (app.globalData.userInfo && app.globalData.userInfo.nickName) {
      this.setData({
        userInfo: app.globalData.userInfo
      });
    } else {
      // 如果都没有，可能用户未登录或信息异常，可以引导到登录页
      // 为简化，这里仅清空，并依赖 WXML 中的默认值显示
      this.setData({ userInfo: null });
      console.log('Profile page: No user info found, redirecting to login might be needed.');
      // wx.redirectTo({ url: '/pages/login/login' }); // 可以考虑跳转
    }
  },
  
  onAvatarError: function(e) {
    // 头像加载失败时，使用默认头像
    console.log('Avatar load error, using default avatar.', e.detail.errMsg);
    if (this.data.userInfo && this.data.userInfo.avatarUrl !== this.data.defaultAvatar) {
        this.setData({
            'userInfo.avatarUrl': this.data.defaultAvatar
        });
    } else if (!this.data.userInfo) { // 如果 userInfo 本身就是 null
        this.setData({
            userInfo: { avatarUrl: this.data.defaultAvatar, nickName: '夜猫访客' } // 确保有基本结构
        });
    }
  },

  editProfile: function () {
    // 跳转到编辑资料页面或弹出修改框
    // wx.showToast({
    //   title: '功能开发中...',
    //   icon: 'none'
    // });
    wx.navigateTo({ url: '/pages/profile-edit/profile-edit' });
  },

  logout: function () {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          console.log('用户点击确定退出登录');
          app.globalData.userInfo = null;
          wx.removeStorageSync('userInfo');
          // wx.removeStorageSync('token'); // 如果有token也一并清除
          
          // 跳转到登录页
          // 注意：如果是 tabBar 页面，需要使用 wx.reLaunch 或者 wx.switchTab，
          // 但登录页通常不是 tabBar 页面，所以 reLaunch 到 login 更合适。
          // 如果 login 是启动页，reLaunch 也会自动处理 tabBar 的隐藏。
          wx.reLaunch({
            url: '/pages/login/login' 
          });
        }
      }
    });
  },

  goToAdmin: function() {
    if (this.data.userInfo && this.data.userInfo.isAdmin) {
      wx.navigateTo({
        url: '/pages/admin/dashboard/dashboard' // 后台首页路径
      });
    } else {
      wx.showToast({
        title: '无权访问',
        icon: 'none'
      });
    }
  },
  
  // 跳转到地址列表页面
  goToAddressList: function() {
    // 检查用户是否登录
    if (!this.data.userInfo) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }
    
    wx.navigateTo({
      url: '/pages/address-list/address-list'
    });
  },
  
  // 跳转到订单页面
  goToOrder: function() {
    // 检查用户是否登录
    if (!this.data.userInfo) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }
    
    wx.navigateTo({
      url: '/pages/order/order'
    });
  }
}); 
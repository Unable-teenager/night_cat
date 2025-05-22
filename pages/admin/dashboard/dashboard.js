const app = getApp();

Page({
  data: {
    userInfo: null,
  },

  onLoad: function (options) {
    this.checkAdminAccess();
    if (app.globalData.userInfo) {
      this.setData({
        userInfo: app.globalData.userInfo
      });
    }
  },

  onShow: function() {
    // Optional: re-check access if user could have logged out and back in as non-admin
    // this.checkAdminAccess(); 
  },

  checkAdminAccess: function() {
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo || !userInfo.isAdmin) {
      wx.showToast({
        title: '无权访问后台',
        icon: 'error',
        duration: 2000,
        complete: () => {
          setTimeout(() => {
            wx.switchTab({ url: '/pages/profile/profile' });
          }, 2000);
        }
      });
      return false;
    }
    return true;
  },
  
  navigateToUserManage: function() {
    wx.showToast({ title: '用户管理开发中...', icon: 'none' });
    // wx.navigateTo({ url: '/pages/admin/user-manage/user-manage' });
  },

  navigateToProductManage: function() {
    wx.navigateTo({ url: '/pages/admin/product-manage/product-manage' });
  },

  navigateToOrderManage: function() {
    wx.showToast({ title: '订单管理开发中...', icon: 'none' });
    // wx.navigateTo({ url: '/pages/admin/order-manage/order-manage' });
  },

  navigateToCarouselManage: function() {
    wx.navigateTo({ url: '/pages/admin/carousel-manage/carousel-manage' });
  },

  navigateToCategoryManage: function() {
    wx.navigateTo({ url: '/pages/admin/category-manage/category-manage' });
  },

  navigateToSystemSettings: function() {
    wx.showToast({ title: '系统设置开发中...', icon: 'none' });
    // wx.navigateTo({ url: '/pages/admin/system-settings/system-settings' });
  }
}); 
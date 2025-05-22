const app = getApp();

Page({
  data: {
    carousels: [],
    // searchKeyword: '', // If search is needed later
    page: 1,
    pageSize: 20, // Carousels are usually fewer
    hasMoreCarousels: true,
    isLoadingMore: false,
    linkTypes: { // For display purposes
      none: '无链接',
      product: '商品详情页',
      category: '分类聚合页',
      page: '小程序内页',
      external: '外部链接(H5)'
    }
  },

  onLoad: function (options) {
    this.loadCarousels(true);
  },

  onShow: function() {
    // Optional: Refresh if returning from edit page
    // this.loadCarousels(true);
  },

  loadCarousels: async function (reset = false) {
    if (this.data.isLoadingMore && !reset) return;
    if (!this.data.hasMoreCarousels && !reset) return;

    this.setData({ isLoadingMore: true });
    if (reset) {
      this.setData({ carousels: [], page: 1, hasMoreCarousels: true });
    }

    wx.showLoading({ title: '加载中...' });
    try {
      const res = await wx.cloud.callFunction({
        name: 'adminGetCarouselList',
        data: {
          page: this.data.page,
          pageSize: this.data.pageSize,
          // filter: { title: this.data.searchKeyword || null } // Example filter if added
        }
      });
      wx.hideLoading();

      if (res.result && res.result.errCode === 0) {
        const newCarousels = res.result.data || [];
        this.setData({
          carousels: reset ? newCarousels : this.data.carousels.concat(newCarousels),
          page: this.data.page + 1,
          hasMoreCarousels: newCarousels.length === this.data.pageSize,
          isLoadingMore: false,
        });
      } else {
        wx.showToast({ title: res.result.errMsg || '加载失败', icon: 'none' });
        this.setData({ isLoadingMore: false, hasMoreCarousels: false });
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '网络错误', icon: 'none' });
      console.error("loadCarousels error", err);
      this.setData({ isLoadingMore: false, hasMoreCarousels: false });
    }
  },

  // onSearchInput: function(e) { ... },
  // onSearchConfirm: function() { ... },

  loadMoreCarousels: function() {
    if (!this.data.isLoadingMore && this.data.hasMoreCarousels) {
      this.loadCarousels();
    }
  },

  navigateToAddCarousel: function() {
    wx.navigateTo({ url: '/pages/admin/carousel-edit/carousel-edit' });
  },

  navigateToEditCarousel: function(e) {
    const carouselId = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/admin/carousel-edit/carousel-edit?id=${carouselId}` });
  },

  deleteCarousel: async function(e) {
    const carouselId = e.currentTarget.dataset.id;
    const carouselTitle = e.currentTarget.dataset.title;

    wx.showModal({
      title: '确认删除',
      content: `确定要删除轮播图 " ${carouselTitle} " 吗？此操作不可恢复。`,
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' });
          try {
            const result = await wx.cloud.callFunction({
              name: 'adminDeleteCarousel',
              data: { carouselId: carouselId }
            });
            wx.hideLoading();
            if (result.result && result.result.errCode === 0) {
              wx.showToast({ title: '删除成功', icon: 'success' });
              this.loadCarousels(true);
            } else {
              wx.showToast({ title: result.result.errMsg || '删除失败', icon: 'none' });
            }
          } catch (err) {
            wx.hideLoading();
            wx.showToast({ title: '删除操作失败', icon: 'none' });
            console.error("deleteCarousel error", err);
          }
        }
      }
    });
  },

  toggleCarouselStatus: async function(e) {
    const carouselId = e.currentTarget.dataset.id;
    const currentStatus = e.currentTarget.dataset.status;
    const targetStatus = !currentStatus;
    const actionText = targetStatus ? '启用' : '禁用';

    wx.showModal({
      title: `确认${actionText}`,
      content: `确定要${actionText}该轮播图吗？`,
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '处理中...' });
          try {
            const result = await wx.cloud.callFunction({
              name: 'adminUpdateCarousel',
              data: {
                carouselId: carouselId,
                updateData: { isActive: targetStatus }
              }
            });
            wx.hideLoading();
            if (result.result && result.result.errCode === 0) {
              wx.showToast({ title: `${actionText}成功`, icon: 'success' });
              const carousels = this.data.carousels.map(c => {
                if (c._id === carouselId) {
                  return { ...c, isActive: targetStatus };
                }
                return c;
              });
              this.setData({ carousels });
            } else {
              wx.showToast({ title: result.result.errMsg || `${actionText}失败`, icon: 'none' });
            }
          } catch (err) {
            wx.hideLoading();
            wx.showToast({ title: '操作失败', icon: 'none' });
            console.error("toggleCarouselStatus error", err);
          }
        }
      }
    });
  }
}); 
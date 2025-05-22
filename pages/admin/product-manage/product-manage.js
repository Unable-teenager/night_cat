const app = getApp();

Page({
  data: {
    products: [],
    searchKeyword: '',
    page: 1,
    pageSize: 10,
    hasMoreProducts: true,
    isLoadingMore: false,
  },

  onLoad: function (options) {
    this.loadProducts(true); // 初始加载，重置列表
  },

  onShow: function() {
    // 如果是从编辑页返回，可能需要刷新列表
    // this.loadProducts(true);
  },

  // 加载商品列表
  loadProducts: async function (reset = false) {
    if (this.data.isLoadingMore && !reset) return;
    if (!this.data.hasMoreProducts && !reset) return;

    this.setData({ isLoadingMore: true });

    if (reset) {
      this.setData({ 
        products: [], 
        page: 1, 
        hasMoreProducts: true 
      });
    }

    try {
      wx.showLoading({ title: '加载中...' });
      const res = await wx.cloud.callFunction({
        name: 'adminGetProductList',
        data: {
          page: this.data.page,
          pageSize: this.data.pageSize,
          filter: {
            name: this.data.searchKeyword || null,
            // isActive: true // 可以根据需要添加其他筛选条件
          }
        }
      });
      wx.hideLoading();

      if (res.result && res.result.errCode === 0) {
        const newProducts = res.result.data || [];
        this.setData({
          products: reset ? newProducts : this.data.products.concat(newProducts),
          page: this.data.page + 1,
          hasMoreProducts: newProducts.length === this.data.pageSize,
          isLoadingMore: false,
        });
      } else {
        wx.showToast({ title: res.result.errMsg || '加载失败', icon: 'none' });
        this.setData({ isLoadingMore: false, hasMoreProducts: false });
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '网络错误或调用失败', icon: 'none' });
      console.error("loadProducts error", err);
      this.setData({ isLoadingMore: false, hasMoreProducts: false });
    }
  },

  // 搜索相关
  onSearchInput: function(e) {
    this.setData({ searchKeyword: e.detail.value });
  },
  onSearchConfirm: function() {
    this.loadProducts(true); // 触发搜索，重置列表
  },

  // 上拉加载更多
  loadMoreProducts: function() {
    if (!this.data.isLoadingMore && this.data.hasMoreProducts) {
      this.loadProducts();
    }
  },

  // 跳转到添加商品页
  navigateToAddProduct: function() {
    wx.navigateTo({ url: '/pages/admin/product-edit/product-edit' });
  },

  // 跳转到编辑商品页
  navigateToEditProduct: function(e) {
    const productId = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/admin/product-edit/product-edit?id=${productId}` });
  },

  // 删除商品
  deleteProduct: async function(e) {
    const productId = e.currentTarget.dataset.id;
    const productName = e.currentTarget.dataset.name;

    wx.showModal({
      title: '确认删除',
      content: `确定要删除商品 " ${productName} " 吗？此操作不可恢复。`,
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '删除中...' });
            const result = await wx.cloud.callFunction({
              name: 'adminDeleteProduct',
              data: { productId: productId }
            });
            wx.hideLoading();
            if (result.result && result.result.errCode === 0) {
              wx.showToast({ title: '删除成功', icon: 'success' });
              this.loadProducts(true); // 刷新列表
            } else {
              wx.showToast({ title: result.result.errMsg || '删除失败', icon: 'none' });
            }
          } catch (err) {
            wx.hideLoading();
            wx.showToast({ title: '删除操作失败', icon: 'none' });
            console.error("deleteProduct error", err);
          }
        }
      }
    });
  },

  // 切换商品上下架状态
  toggleProductStatus: async function(e) {
    const productId = e.currentTarget.dataset.id;
    const currentStatus = e.currentTarget.dataset.status;
    const targetStatus = !currentStatus;
    const actionText = targetStatus ? '上架' : '下架';

    wx.showModal({
      title: `确认${actionText}`,
      content: `确定要${actionText}该商品吗？`,
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '处理中...' });
            const result = await wx.cloud.callFunction({
              name: 'adminUpdateProduct',
              data: {
                productId: productId,
                updateData: { isActive: targetStatus }
              }
            });
            wx.hideLoading();
            if (result.result && result.result.errCode === 0) {
              wx.showToast({ title: `${actionText}成功`, icon: 'success' });
              // 局部更新，避免整个列表刷新闪烁
              const products = this.data.products.map(p => {
                if (p._id === productId) {
                  return { ...p, isActive: targetStatus };
                }
                return p;
              });
              this.setData({ products });
              // 或者简单刷新: this.loadProducts(true);
            } else {
              wx.showToast({ title: result.result.errMsg || `${actionText}失败`, icon: 'none' });
            }
          } catch (err) {
            wx.hideLoading();
            wx.showToast({ title: '操作失败', icon: 'none' });
            console.error("toggleProductStatus error", err);
          }
        }
      }
    });
  },
}); 
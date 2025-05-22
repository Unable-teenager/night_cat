const app = getApp();

Page({
  data: {
    productId: null,
    productInfo: {
      // 基本信息
      name: '',
      price: 0.00,
      originalPrice: null, // 原价，可选
      stock: 0,
      salesCount: 0, // 销量
      mainImageUrl: '', // 主图，用于购物车等列表展示
      imageUrls: [], // 商品轮播图 fileIDs
      tags: [], // 商品标签，如 "新品", "热销"
      // 描述信息
      shortDescription: '', // 简短描述
      longDescription: '', // 详细描述，可以是纯文本或富文本字符串
      detailImages: [], // 详情图片 fileIDs
      // 规格与库存 (如果商品有多种规格，这部分会更复杂)
      // skus: [], // { skuId: 'xxx', name: '颜色:红色 尺码:M', price: 100, stock: 10, imageUrl: '' }
      // selectedSku: null,
      // selectedSkuInfo: {},
      // 服务与承诺
      services: [
        { name: '正品保障', description: '保证商品为正品' },
        { name: '7天无理由退换', description: '满足条件即可申请7天无理由退换货' },
        { name: '急速退款', description: '满足条件将快速处理退款申请' },
      ],
      // 物流信息
      shippingInfo: {
        provider: '合作快递',
        fee: 0.00, // 0 表示包邮
        estimatedDelivery: '付款后48小时内发货'
      },
      // 售后政策
      afterSalesPolicy: '支持7天无理由退换货（未使用、未破坏包装、不影响二次销售）。如有质量问题，请及时联系客服处理。'
    },
    currentSwiperIndex: 0,
    quantity: 1,
    activeTab: 'details', // 'details' or 'reviews'
    isFavorite: false,
    cartItemCount: 0,
    isLoading: true, // 页面加载状态
    showSkuSelector: false, // 是否显示规格选择弹窗 (如果需要)
  },

  onLoad: function (options) {
    if (options.id) {
      this.setData({ productId: options.id });
      this.loadProductDetail(options.id);
    } else {
      wx.showToast({ title: '参数错误', icon: 'none' });
      this.setData({ isLoading: false });
      // setTimeout(() => wx.navigateBack(), 1500);
    }
    this.updateCartItemCount();
  },

  onShow: function() {
    this.updateCartItemCount();
    if (this.data.productId) { // 如果已经加载过商品，可以考虑是否需要刷新收藏状态等
      this.checkFavoriteStatus();
    }
  },

  async loadProductDetail(productId) {
    this.setData({ isLoading: true });
    wx.showLoading({ title: '加载中...' });
    try {
      // 理想情况: 有一个 getProductById 的云函数
      // 临时方案: 使用 adminGetProductList 并通过 _id 筛选
      const res = await wx.cloud.callFunction({
        name: 'adminGetProductList',
        data: { 
          filter: { _id: productId, isActive: true }, // 确保商品是上架状态
          pageSize: 1, 
          pageNo: 1 
        }
      });
      wx.hideLoading();
      this.setData({ isLoading: false });

      if (res.result && res.result.errCode === 0 && res.result.data && res.result.data.length > 0) {
        const productData = res.result.data[0];
        // 为确保字段存在，做一些兼容处理
        this.setData({
          productInfo: {
            ...this.data.productInfo, // 保留默认服务等信息
            ...productData,
            imageUrls: productData.imageUrls && productData.imageUrls.length > 0 ? productData.imageUrls : [productData.mainImageUrl || '/images/default_product.png'],
            detailImages: productData.detailImages || [],
            tags: productData.tags || [],
            services: productData.services || this.data.productInfo.services, // 如果后台没传，用默认的
            shippingInfo: productData.shippingInfo || this.data.productInfo.shippingInfo,
            afterSalesPolicy: productData.afterSalesPolicy || this.data.productInfo.afterSalesPolicy,
          },
          quantity: 1, // 重置购买数量
        });
        wx.setNavigationBarTitle({ title: productData.name || '商品详情' });
        this.checkFavoriteStatus();
      } else {
        wx.showToast({ title: res.result.errMsg || '商品不存在或已下架', icon: 'none' });
        // setTimeout(() => wx.navigateBack(), 1500);
      }
    } catch (err) {
      wx.hideLoading();
      this.setData({ isLoading: false });
      wx.showToast({ title: '加载商品详情失败', icon: 'none' });
      console.error("loadProductDetail error:", err);
      // setTimeout(() => wx.navigateBack(), 1500);
    }
  },

  onSwiperChange: function (e) {
    this.setData({ currentSwiperIndex: e.detail.current });
  },

  previewImage: function (e) {
    const currentUrl = e.currentTarget.dataset.url;
    wx.previewImage({
      current: currentUrl,
      urls: this.data.productInfo.imageUrls,
    });
  },
  previewDetailImage: function(e) {
    const currentUrl = e.currentTarget.dataset.url;
    wx.previewImage({
        current: currentUrl,
        urls: this.data.productInfo.detailImages
    });
  },

  onQuantityChange: function (e) {
    const action = e.currentTarget.dataset.action;
    let quantity = this.data.quantity;
    const stock = this.data.productInfo.stock || 0;

    if (action === 'increase') {
      if (quantity < stock) {
        quantity++;
      } else {
        wx.showToast({ title: '已达到最大库存', icon: 'none' });
      }
    } else if (action === 'decrease') {
      if (quantity > 1) {
        quantity--;
      }
    }
    this.setData({ quantity: quantity });
  },

  onQuantityInput: function(e) {
    let quantity = parseInt(e.detail.value) || 1;
    const stock = this.data.productInfo.stock || 0;
    if (quantity > stock) {
        quantity = stock;
        wx.showToast({ title: '超过最大库存', icon: 'none' });
    }
    if (quantity < 1 && stock > 0) {
        quantity = 1;
    }
    if (stock === 0) quantity = 0;

    this.setData({ quantity: quantity });
  },

  switchTab: function (e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
  },

  // --- 收藏功能 (基于本地存储) ---
  checkFavoriteStatus: function () {
    if (!this.data.productId) return;
    const favorites = wx.getStorageSync('favorites') || [];
    const isFavorite = favorites.includes(this.data.productId);
    this.setData({ isFavorite: isFavorite });
  },

  toggleFavorite: function () {
    if (this.data.isLoading || !this.data.productId) return;
    let favorites = wx.getStorageSync('favorites') || [];
    const productId = this.data.productId;
    const index = favorites.indexOf(productId);

    if (index > -1) {
      favorites.splice(index, 1); // 取消收藏
      wx.showToast({ title: '已取消收藏', icon: 'none', duration: 1000 });
    } else {
      favorites.push(productId); // 添加收藏
      wx.showToast({ title: '收藏成功', icon: 'success', duration: 1000 });
    }
    wx.setStorageSync('favorites', favorites);
    this.setData({ isFavorite: !this.data.isFavorite });
  },
  // --- 购物车相关 ---
  updateCartItemCount: function () {
    const cart = wx.getStorageSync('cart') || [];
    let count = 0;
    cart.forEach(item => count += item.quantity);
    this.setData({ cartItemCount: count });
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
        // 商品详情页不是 TabBar 页面，但如果需要全局更新 TabBar 角标，需保留
        this.getTabBar().setData({ cartItemCount: count });
    }
  },

  addToCart: function () {
    if (this.data.isLoading || !this.data.productInfo || !this.data.productInfo._id) {
      wx.showToast({ title: '商品信息加载中', icon: 'none' });
      return;
    }
    const product = this.data.productInfo;
    const quantityToAdd = this.data.quantity;

    if (product.stock <= 0) {
      wx.showToast({ title: '该商品已售罄', icon: 'none' });
      return;
    }
    if (quantityToAdd <= 0) {
      wx.showToast({ title: '请选择购买数量', icon: 'none' });
      return;
    }
    if (quantityToAdd > product.stock) {
      wx.showToast({ title: `库存不足，仅剩 ${product.stock} 件`, icon: 'none' });
      return;
    }

    let cart = wx.getStorageSync('cart') || [];
    const existingItemIndex = cart.findIndex(item => item._id === product._id /* && item.selectedSkuId === (this.data.selectedSkuInfo._id || null) */);

    if (existingItemIndex > -1) {
      const newQuantity = cart[existingItemIndex].quantity + quantityToAdd;
      if (newQuantity > product.stock) {
        wx.showToast({ title: `购物车中该商品已达库存上限 (${product.stock}件)`, icon: 'none' });
        cart[existingItemIndex].quantity = product.stock; // 设置为最大库存
      } else {
        cart[existingItemIndex].quantity = newQuantity;
      }
    } else {
      cart.push({
        _id: product._id,
        name: product.name,
        imageUrl: product.mainImageUrl || (product.imageUrls && product.imageUrls[0]) || '/images/default_product.png',
        price: product.price, // 后续应考虑规格价格 product.selectedSkuInfo.price
        quantity: quantityToAdd,
        stock: product.stock, // 加入时记录当前选择的商品库存，或总库存
        // selectedSkuId: this.data.selectedSkuInfo._id || null,
        // selectedSkuName: this.data.selectedSkuInfo.name || '',
        checked: true, // 默认选中
      });
    }
    wx.setStorageSync('cart', cart);
    this.updateCartItemCount();
    wx.showToast({ title: '已加入购物车', icon: 'success' });
  },

  buyNow: function () {
    if (this.data.isLoading || !this.data.productInfo || !this.data.productInfo._id) {
      wx.showToast({ title: '商品信息加载中', icon: 'none' });
      return;
    }
    const product = this.data.productInfo;
    const quantityToBuy = this.data.quantity;

    if (product.stock <= 0) {
      wx.showToast({ title: '该商品已售罄', icon: 'none' });
      return;
    }
    if (quantityToBuy <= 0) {
      wx.showToast({ title: '请选择购买数量', icon: 'none' });
      return;
    }
    if (quantityToBuy > product.stock) {
      wx.showToast({ title: `库存不足，仅剩 ${product.stock} 件`, icon: 'none' });
      return;
    }

    // 立即购买通常是直接将当前商品（及选择的规格、数量）带到订单确认页
    const orderProduct = [{
        _id: product._id,
        name: product.name,
        imageUrl: product.mainImageUrl || (product.imageUrls && product.imageUrls[0]) || '/images/default_product.png',
        price: product.price, // sku price
        quantity: quantityToBuy,
        stock: product.stock,
        // selectedSkuId: this.data.selectedSkuInfo._id || null,
        // selectedSkuName: this.data.selectedSkuInfo.name || '',
    }];
    wx.setStorageSync('orderProducts', orderProduct); // 存储待下单商品信息
    wx.navigateTo({ url: '/pages/order-confirm/order-confirm?from=buyNow' }); // 假设有此订单确认页
  },

  // --- 其他辅助方法 ---
  goToCart: function () {
    wx.switchTab({ url: '/pages/cart/cart' });
  },

  // 如果有客服功能，跳转到客服会话或相关页面
  contactService: function() {
    // wx.openCustomerServiceChat({...})
    wx.showToast({ title: '客服功能暂未开放', icon: 'none' });
  },

  onShareAppMessage: function () {
    const product = this.data.productInfo;
    return {
      title: product.name || '发现一个好物，推荐给你！',
      path: `/pages/product-detail/product-detail?id=${this.data.productId}`,
      imageUrl: product.mainImageUrl || (product.imageUrls && product.imageUrls[0]) || '' // 分享图
    };
  },
  onShareTimeline: function() {
    const product = this.data.productInfo;
    return {
        title: product.name || '发现一个好物，推荐给你！',
        query: `id=${this.data.productId}`,
        imageUrl: product.mainImageUrl || (product.imageUrls && product.imageUrls[0]) || ''
    };
  },

  // 新增：返回上一页的方法
  goBack: function() {
    wx.navigateBack({
      delta: 1
    });
  }
  // TODO: 规格选择相关方法 (openSkuSelector, closeSkuSelector, onSkuSelect, confirmSku)
  // TODO: 评论加载和显示相关方法 (loadReviews)
}); 
// pages/order-confirm/order-confirm.js
const app = getApp();

Page({

  /**
   * 页面的初始数据
   */
  data: {
    orderItems: [],        // 从购物车或立即购买传递过来的商品列表
    selectedAddress: null, // 选择的收货地址
    productTotalAmount: 0, // 商品总额
    shippingFee: 0.00,     // 运费，暂时固定或根据逻辑计算
    couponDiscount: 0.00,  // 优惠金额
    actualPayment: 0,      // 实付款
    remark: '',            // 订单备注
    isLoading: false,      // 是否正在提交订单
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 页面加载时，从本地存储获取待结算商品
    const itemsToCheckout = wx.getStorageSync('itemsToCheckout');
    if (itemsToCheckout && itemsToCheckout.length > 0) {
      // 处理商品数据，确保价格字段正确格式化
      const processedItems = itemsToCheckout.map(item => {
        // 处理价格，确保是数字
        const price = parseFloat(item.price);
        return {
          ...item,
          price: isNaN(price) ? '0.00' : price.toFixed(2)
        };
      });
      
      this.setData({
        orderItems: processedItems
      });
      this.calculateTotals();
    } else {
      // 如果没有商品，提示并返回上一页
      wx.showToast({
        title: '没有需要结算的商品',
        icon: 'none',
        duration: 2000,
        complete: () => {
          setTimeout(() => {
            wx.navigateBack();
          }, 2000);
        }
      });
    }
    // 加载默认或上次选择的收货地址
    this.loadUserAddress();
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 如果支持从地址列表页选择地址后返回，可以在这里更新地址
    const currentPages = getCurrentPages();
    const currentPage = currentPages[currentPages.length - 1];
    if (currentPage.data.addressDataFromSelectList) {
        this.setData({ selectedAddress: currentPage.data.addressDataFromSelectList });
        delete currentPage.data.addressDataFromSelectList; // 清除，避免下次 onShow 误用
    } 
    this.calculateTotals(); // 地址可能会影响运费，重新计算总额
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  },

  loadUserAddress: function() {
    // 显示加载中提示
    wx.showLoading({
      title: '加载地址中...',
      mask: true
    });
    
    // 首先尝试从缓存中获取上次选择的地址
    const lastUsedAddress = wx.getStorageSync('lastUsedAddress');
    if (lastUsedAddress) {
      this.setData({ selectedAddress: lastUsedAddress });
      wx.hideLoading();
      return;
    }
    
    // 如果没有缓存的地址，从云数据库获取默认地址
    wx.cloud.callFunction({
      name: 'getAddressList',
      success: (res) => {
        wx.hideLoading();
        if (res.result && res.result.code === 0 && res.result.data && res.result.data.length > 0) {
          // 先查找一个默认地址
          let defaultAddress = res.result.data.find(addr => addr.isDefault);
          
          // 如果没有默认地址，使用第一个地址
          if (!defaultAddress && res.result.data.length > 0) {
            defaultAddress = res.result.data[0];
          }
          
          if (defaultAddress) {
            // 将地址数据格式转换为订单页需要的格式
            const formattedAddress = {
              userName: defaultAddress.name,
              telNumber: defaultAddress.phone,
              isDefault: defaultAddress.isDefault,
              provinceName: defaultAddress.province,
              cityName: defaultAddress.city,
              countyName: defaultAddress.district,
              detailInfo: defaultAddress.detail,
              addressId: defaultAddress._id
            };
            
            this.setData({ selectedAddress: formattedAddress });
            // 缓存到本地
            wx.setStorageSync('lastUsedAddress', formattedAddress);
          }
        } else {
          console.log('未找到用户地址，提示用户选择');
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('获取地址列表失败', err);
      }
    });
  },

  selectAddress: function () {
    // 跳转到地址选择列表页面
    wx.navigateTo({ 
      url: '/pages/address-list/address-list?from=orderConfirm',
      events: {
        // 监听地址选择事件
        selectAddress: (address) => {
          console.log('Selected address:', address);
          if (address) {
            // 将地址数据格式转换为订单页需要的格式
            this.setData({
              selectedAddress: {
                userName: address.name,
                telNumber: address.phone,
                isDefault: address.isDefault,
                provinceName: address.province,
                cityName: address.city,
                countyName: address.district,
                detailInfo: address.detail,
                addressId: address._id // 保存地址ID用于提交订单
              }
            });
            this.calculateTotals();
          }
        }
      }
    });
  },

  calculateTotals: function () {
    let productTotalAmount = 0;
    
    // 计算商品总价
    this.data.orderItems.forEach(item => {
      // 确保价格和数量是数字类型
      const price = parseFloat(item.price);
      const quantity = parseInt(item.quantity);
      
      if (!isNaN(price) && !isNaN(quantity) && price >= 0 && quantity > 0) {
        const itemTotal = price * quantity;
        productTotalAmount += itemTotal;
        console.log(`商品[${item.name}]: 单价=${price}, 数量=${quantity}, 小计=${itemTotal.toFixed(2)}`);
      }
    });

    // 运费逆辑 (示例：满额包邮)
    // let shippingFee = productTotalAmount >= 99 ? 0.00 : 10.00;
    // if (this.data.orderItems.length === 0) shippingFee = 0; // 没有商品则运费为0
    let shippingFee = 0.00; // 暂时都包邮

    // 优惠券金额
    const couponDiscount = parseFloat(this.data.couponDiscount) || 0;
    
    // 计算实际支付金额
    const actualPayment = productTotalAmount + shippingFee - couponDiscount;
    const finalPayment = actualPayment < 0 ? 0 : actualPayment; // 确保实付款不为负
    
    // 格式化为两位小数的字符串
    const formattedProductTotal = productTotalAmount.toFixed(2);
    const formattedShippingFee = shippingFee.toFixed(2);
    const formattedActualPayment = finalPayment.toFixed(2);
    
    console.log(`商品总额: ${formattedProductTotal}, 运费: ${formattedShippingFee}, 实付款: ${formattedActualPayment}`);

    this.setData({
      productTotalAmount: formattedProductTotal,
      shippingFee: formattedShippingFee,
      actualPayment: formattedActualPayment
    });
  },

  onRemarkInput: function (e) {
    this.setData({
      remark: e.detail.value
    });
  },

  submitOrder: function () {
    if (!this.data.selectedAddress) {
      wx.showToast({ title: '请选择收货地址', icon: 'none' });
      return;
    }
    if (this.data.orderItems.length === 0) {
      wx.showToast({ title: '订单中没有商品', icon: 'none' });
      return;
    }

    this.setData({ isLoading: true });

    // 模拟支付提示
    wx.showModal({
      title: '提示',
      content: '付款功能正在开发中，等待获得售卖资质后开放。是否确认提交此订单（模拟）？',
      confirmText: '确认提交',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.createMockOrder();
        } else {
          this.setData({ isLoading: false });
        }
      },
      fail: () => {
        this.setData({ isLoading: false });
      }
    });
  },

  createMockOrder: function() {
    // 显示加载中提示
    wx.showLoading({
      title: '提交订单中...',
      mask: true
    });
    
    // 准备订单数据
    const orderData = {
      userId: app.globalData.openid || 'testUser',
      addressId: this.data.selectedAddress.addressId, // 保存地址ID
      address: {
        name: this.data.selectedAddress.userName,
        phone: this.data.selectedAddress.telNumber,
        province: this.data.selectedAddress.provinceName,
        city: this.data.selectedAddress.cityName,
        district: this.data.selectedAddress.countyName,
        detail: this.data.selectedAddress.detailInfo
      },
      items: this.data.orderItems,
      productTotal: this.data.productTotalAmount,
      shipping: this.data.shippingFee,
      discount: this.data.couponDiscount,
      grandTotal: this.data.actualPayment,
      remark: this.data.remark,
      status: 'PENDING_PAYMENT', // 模拟状态：待付款
      createdAt: new Date()
    };

    console.log('模拟创建订单:', orderData);

    // 模拟订单创建成功后的操作
    // 1. 清除本地存储的待结算商品
    wx.removeStorageSync('itemsToCheckout');

    // 2. 从购物车中移除已下单的商品（如果商品来自购物车）
    //    这里需要更完善的选辣，比如商品有 uniqueId 来匹配
    let cart = wx.getStorageSync('cart') || [];
    const orderItemIds = this.data.orderItems.map(item => item.uniqueId || item._id); // 使用 uniqueId 优先
    const updatedCart = cart.filter(cartItem => !orderItemIds.includes(cartItem.uniqueId || cartItem._id));
    wx.setStorageSync('cart', updatedCart);
    // 更新购物车角标 (如果购物车页面在 TabBar)
    const cartPageInstance = getCurrentPages().find(p => p.route === 'pages/cart/cart');
    if (cartPageInstance && typeof cartPageInstance.updateTabBarBadge === 'function') {
        cartPageInstance.updateTabBarBadge();
    } else { // 如果找不到购物车页面实例，尝试直接调用tabbar方法
        let totalCartItems = 0;
        updatedCart.forEach(item => { totalCartItems += item.quantity; });
        if (totalCartItems > 0) {
            wx.setTabBarBadge({ index: 2, text: String(totalCartItems > 99 ? '99+' : totalCartItems) });
        } else {
            wx.removeTabBarBadge({ index: 2 });
        }
    }

    wx.hideLoading();
    wx.showToast({
      title: '订单提交成功 (模拟)',
      icon: 'success',
      duration: 2000
    });

    this.setData({ isLoading: false });

    // 跳转到订单列表页或订单详情页 (示例跳转到订单列表)
    setTimeout(() => {
      wx.redirectTo({ // 使用 redirectTo，避免返回到订单确认页
        url: '/pages/order/order?status=pending_payment' // 可以带参数高亮新订单
      });
    }, 2000);
  }
})
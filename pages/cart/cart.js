const app = getApp();

Page({
  data: {
    cartItems: [], // 购物车商品列表
    totalPrice: 0, // 总价
    totalItems: 0, // 总件数 (修正字段名以匹配WXML)
    isEmpty: true, // 购物车是否为空
  },

  onShow: function () {
    this.loadCartData();
  },

  loadCartData: function () {
    const cart = wx.getStorageSync('cart') || [];
    // 为每个商品项添加唯一标识符，并格式化价格显示
    const processedCart = cart.map((item, index) => {
      // 确保价格格式化为两位小数
      const price = parseFloat(item.price || 0);
      const formattedPrice = isNaN(price) ? '0.00' : price.toFixed(2);
      
      return {
        ...item,
        price: formattedPrice, // 使用格式化后的价格
        uniqueId: item.uniqueId || `${item._id}_${index}` // 如果已有uniqueId则保留，否则生成一个新的
      };
    });
    
    this.setData({
      cartItems: processedCart,
      isEmpty: processedCart.length === 0,
    });
    this.calculateTotal();
    this.updateTabBarBadge(); // 更新底部tabBar角标
  },

  calculateTotal: function () {
    let totalPrice = 0;
    let totalItems = 0;
    
    // 确保有购物车商品时才计算
    if (this.data.cartItems && this.data.cartItems.length > 0) {
      this.data.cartItems.forEach(item => {
        // 确保price和quantity是数字类型
        // 注意：现在item.price已经是格式化的字符串，需要重新转换为数字
        const price = parseFloat(item.price || 0);
        const quantity = parseInt(item.quantity || 0);
        
        if (!isNaN(price) && !isNaN(quantity) && price >= 0 && quantity > 0) {
          const itemTotal = price * quantity;
          console.log(`商品[${item.name}]: 单价=${price}, 数量=${quantity}, 小计=${itemTotal}`);
          totalPrice += itemTotal;
          totalItems += quantity;
        }
      });
    }
    
    // 格式化总价为两位小数的字符串
    const formattedTotalPrice = totalPrice.toFixed(2);
    console.log(`合计金额: ${formattedTotalPrice}, 总件数: ${totalItems}`);
    
    this.setData({
      totalPrice: formattedTotalPrice,
      totalItems: totalItems,
    });
  },

  // 统一的数量变更处理函数 (替代原有的 increase/decrease/onQuantityInput)
  handleQuantityChange: function(uniqueId, newQuantity) {
    let cartItems = this.data.cartItems;
    const itemIndex = cartItems.findIndex(item => item.uniqueId === uniqueId);

    if (itemIndex > -1) {
      const item = cartItems[itemIndex];
      if (isNaN(newQuantity) || newQuantity < 1) {
        // 数量非法，提示用户并不作改变
        wx.showToast({ title: '请输入有效数量', icon: 'none' });
        this.setData({ cartItems: cartItems }); 
        return;
      }
      
      // 检查库存
      const stock = parseInt(item.stock || 999); // 如果没有stock字段，默认设置为足够大的数值
      
      if (newQuantity > stock) {
        wx.showToast({ title: `超过库存上限 (${stock}件)`, icon: 'none' });
        cartItems[itemIndex].quantity = stock; // 设置为最大库存
      } else {
        cartItems[itemIndex].quantity = newQuantity;
      }
      
      // 立即更新购物车和重新计算金额
      this.updateCart(cartItems);
      
      // 输出日志以便于调试
      console.log(`商品[${item.name}] 数量更新为: ${newQuantity}`);
    } else {
      console.warn("handleQuantityChange: Item not found with uniqueId", uniqueId);
    }
  },

  // 点击加减按钮
  changeItemQuantity: function (e) {
    const { uniqueId, amount } = e.currentTarget.dataset;
    let cartItems = this.data.cartItems;
    const itemIndex = cartItems.findIndex(item => item.uniqueId === uniqueId);
    if (itemIndex > -1) {
      let newQuantity = cartItems[itemIndex].quantity + parseInt(amount);
      if (newQuantity < 1) {
        // 如果减到0，则询问是否删除
        wx.showModal({
          title: '提示',
          content: '确定要从购物车移除该商品吗？',
          success: (res) => {
            if (res.confirm) {
              this.removeItemFromCart(e); // 使用正确的删除方法和参数
            }
          }
        });
        return; // 提前返回，不执行后续的 handleQuantityChange
      }
      this.handleQuantityChange(uniqueId, newQuantity);
    }
  },

  // 输入框数量改变
  onItemQuantityInput: function (e) {
    const { uniqueId } = e.currentTarget.dataset;
    const newQuantity = parseInt(e.detail.value, 10);
    this.handleQuantityChange(uniqueId, newQuantity);
  },
  
  // 移除商品
  removeItemFromCart: function (e) {
    const { uniqueId } = e.currentTarget.dataset;
    let cartItems = this.data.cartItems;
    const updatedCartItems = cartItems.filter(item => item.uniqueId !== uniqueId);
    
    if (cartItems.length !== updatedCartItems.length) {
      this.updateCart(updatedCartItems);
      wx.showToast({
        title: '已移除商品',
        icon: 'none'
      });
    } else {
      console.warn("removeItemFromCart: Item not found or not removed", uniqueId);
    }
  },

  updateCart: function (cartItems) {
    wx.setStorageSync('cart', cartItems);
    this.setData({
      cartItems: cartItems,
      isEmpty: cartItems.length === 0,
    });
    this.calculateTotal();
    this.updateTabBarBadge(); // 更新底部tabBar角标
    // 其他页面的角标更新已在各自页面的 onShow 中处理，或通过全局事件总线更佳
  },

  updateTabBarBadge: function() {
    let totalItems = 0;
    (wx.getStorageSync('cart') || []).forEach(item => {
        totalItems += item.quantity;
    });
    if (totalItems > 0) {
        wx.setTabBarBadge({
            index: 2, // 假设购物车是第3个tab (0-indexed)
            text: String(totalItems > 99 ? '99+' : totalItems)
        });
    } else {
        wx.removeTabBarBadge({ index: 2 });
    }
  },

  clearCart: function () {
    wx.showModal({
      title: '确认操作',
      content: '确定要清空购物车吗？',
      success: (res) => {
        if (res.confirm) {
          this.updateCart([]); 
          wx.showToast({
            title: '购物车已清空',
            icon: 'success'
          });
        }
      }
    });
  },

  goToCheckout: function () {
    if (this.data.cartItems.length === 0) {
      wx.showToast({ title: '购物车是空的哦', icon: 'none' });
      return;
    }
    // 假设购物车中所有商品都用于结算
    const itemsToCheckout = this.data.cartItems;
    wx.setStorageSync('itemsToCheckout', itemsToCheckout); // 存储待结算商品
    wx.navigateTo({
      url: '/pages/order-confirm/order-confirm' // 跳转到订单确认页
    });
  },

  goShopping: function () { // WXML中是 goShopping
    wx.switchTab({
      url: '/pages/mall/mall'
    });
  }
}); 
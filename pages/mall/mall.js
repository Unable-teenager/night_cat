const app = getApp();

Page({
  data: {
    // Swiper
    swiperList: [],

    // Categories
    categories: [], 
    selectedCategoryId: 'all', // Default to 'all'

    // Products
    productList: [],
    pageNum: 1,
    pageSize: 10, // Or your preferred page size
    hasMoreData: true,
    loading: true,        // For initial load or category change load
    loadingMore: false,   // For loading next page (onReachBottom)
    searchText: '',

    // UI states
    showEmptyTip: false,
    showNoMoreDataTip: false,

    // Cart
    cartItemCount: 0,

    // Default image
    defaultProductImage: '/images/default_product_image.png' // Define your default image path
  },

  onLoad: function (options) {
    this.setData({ loading: true }); // Set initial loading state for the whole page
    this.loadSwiperData();
    this.loadCategoryData().then(() => {
        // Load products after categories are loaded, or if category load fails, still load all products.
        this.loadProductData(true);
    });
    this.updateCartItemCount();
  },

  onShow: function() {
    this.updateCartItemCount(); // Update cart count when page is shown
  },

  loadSwiperData: async function() {
    try {
      const res = await wx.cloud.callFunction({ 
        name: 'adminGetCarouselList', 
        data: { 
          filter: { isActive: true }, 
          sortBy: { field: 'sortOrder', direction: 'asc' } 
        }
      });
      if (res && res.result && res.result.success === true) {
        this.setData({ swiperList: res.result.data || [] });
      } else {
        console.error("加载轮播图失败，云函数原始返回: ", res);
        const errMsg = (res && res.result && res.result.message) ? 
                       res.result.message : 
                       (res && res.result && res.result.errMsg) ? 
                       res.result.errMsg : 
                       '获取轮播图数据失败，请检查云函数状态';
        console.error("加载轮播图失败处理后的消息: ", errMsg);
        wx.showToast({ title: errMsg, icon: 'none' });
        this.setData({ swiperList: [] });
      }
    } catch (error) {
      console.error("调用云函数adminGetCarouselList失败 (catch): ", error);
      wx.showToast({ title: '轮播图加载异常', icon: 'none' });
      this.setData({ swiperList: [] });
    }
  },

  loadCategoryData: async function() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'adminGetCategoryList',
        data: { 
          isActive: true, 
          source: 'front-end-public'
        }
      });
      if (res.result && res.result.success) {
        const fetchedCategories = res.result.data;
        const categoriesWithAll = [{ _id: 'all', name: '全部', sortOrder: -1 }, ...fetchedCategories]; // Ensure 'All' is first
        this.setData({
          categories: categoriesWithAll
        });
      } else {
        console.error("加载分类列表失败: ", res.result.message);
        this.setData({ categories: [{ _id: 'all', name: '全部', sortOrder: -1 }] });
      }
    } catch (error) {
      console.error("调用云函数adminGetCategoryList失败: ", error);
      this.setData({ categories: [{ _id: 'all', name: '全部', sortOrder: -1 }] });
    }
  },

  loadProductData: async function (reset = false) {
    if (reset) {
      this.setData({
        productList: [],
        pageNum: 1,
        hasMoreData: true,
        loading: true, // Show main loading indicator
        loadingMore: false,
        showNoMoreDataTip: false,
        showEmptyTip: false
      });
    } else { // Loading more for pagination
      if (this.data.loadingMore || !this.data.hasMoreData) return;
      this.setData({ loadingMore: true });
    }

    const { pageNum, pageSize, searchText, selectedCategoryId } = this.data;
    const filter = { isActive: true };
    if (searchText) {
      filter.name = { $regex: '.*' + searchText + '.*', $options: 'i' };
    }
    if (selectedCategoryId && selectedCategoryId !== 'all') {
      filter.categoryId = selectedCategoryId;
    }

    try {
      const res = await wx.cloud.callFunction({
        name: 'adminGetProductList',
        data: {
          page: pageNum,
          pageSize: pageSize,
          filter: filter,
          sortBy: { field: 'sortOrder', direction: 'desc' } // Example: sort by sortOrder or other fields like creationDate
        }
      });

      let currentProductList = this.data.productList;
      if (res.result && res.result.errCode === 0) {
        const newProducts = res.result.data || [];
        currentProductList = reset ? newProducts : currentProductList.concat(newProducts);
        
        this.setData({
          productList: currentProductList,
          pageNum: newProducts.length < pageSize ? this.data.pageNum : this.data.pageNum + 1, // Only increment if full page was fetched
          hasMoreData: newProducts.length === pageSize,
          showEmptyTip: currentProductList.length === 0 && !this.data.loadingMore && !this.data.loading, // Show if list is empty after all loading
          showNoMoreDataTip: currentProductList.length > 0 && newProducts.length < pageSize && !reset && !this.data.loading // Show if not first load, data exists, and less than page size returned
        });
      } else {
        console.error("加载商品列表失败: ", res.result.errMsg);
        wx.showToast({ title: res.result.errMsg || '加载商品失败', icon: 'none' });
        if(reset) this.setData({ showEmptyTip: true, productList: [] });
      }
    } catch (error) {
      console.error("调用adminGetProductList云函数失败: ", error);
      wx.showToast({ title: '加载商品出错', icon: 'none' });
      if(reset) this.setData({ showEmptyTip: true, productList: [] });
    } finally {
      this.setData({ 
        loading: false, 
        loadingMore: false 
      });
      wx.stopPullDownRefresh();
    }
  },

  onPullDownRefresh: function () {
    this.setData({
      searchText: '' // Clear search on refresh
    });
    wx.showNavigationBarLoading();
    Promise.all([
        this.loadSwiperData(),
        this.loadCategoryData()
    ]).then(() => {
        this.loadProductData(true);
    }).finally(() => {
        wx.hideNavigationBarLoading();
        wx.stopPullDownRefresh();
    });
  },

  onReachBottom: function () {
    if (this.data.hasMoreData && !this.data.loadingMore && !this.data.loading) {
      this.loadProductData(false); // false, meaning load next page
    }
  },

  onSearchInput: function(e) {
    this.setData({ searchText: e.detail.value });
    // Optional: Implement live search or debounce search
  },

  onSearchConfirm: function(e) {
    // const searchText = e.detail.value.trim(); // searchText is already updated by onSearchInput
    // If onSearchInput is not used, then uncomment the line above.
    this.setData({
      productList: [], 
      pageNum: 1, 
      hasMoreData: true, 
      loading: true,
      loadingMore: false,
      showNoMoreDataTip: false,
      showEmptyTip: false 
    });
    this.loadProductData(true); 
  },
  
  onCategoryTap: function(e) {
    const categoryId = e.currentTarget.dataset.id;
    if (this.data.selectedCategoryId === categoryId && !this.data.loading) {
      return; 
    }
    this.setData({
      selectedCategoryId: categoryId,
      productList: [],      
      pageNum: 1,           
      hasMoreData: true,    
      loading: true,        
      loadingMore: false,
      showNoMoreDataTip: false,
      showEmptyTip: false
    });
    this.loadProductData(true); 
  },

  onSwiperTap: function(e) {
    const item = e.currentTarget.dataset.item;
    if (item && item.linkType && item.linkValue) {
      switch (item.linkType) {
        case 'product':
          wx.navigateTo({ url: '/pages/product-detail/product-detail?id=' + item.linkValue });
          break;
        case 'page': // For internal page navigations
          if (item.linkValue.startsWith('/')) { // Basic check for valid page path
            wx.navigateTo({ url: item.linkValue });
          } else {
            console.warn('Invalid page link for swiper:', item.linkValue)
          }
          break;
        case 'category': // Navigate to mall page with category pre-selected
            this.setData({
                selectedCategoryId: item.linkValue,
                productList: [],      
                pageNum: 1,           
                hasMoreData: true,    
                loading: true,        
                loadingMore: false,
                showNoMoreDataTip: false,
                showEmptyTip: false
            });
            this.loadProductData(true);
            // Scroll to categories or products section if possible
            wx.pageScrollTo({ scrollTop: 200, duration: 300 }); // Adjust scrollTop as needed
            break;
        // case 'external': // wx.navigateToMiniProgram or web-view for external links, requires config
        //   break;
        default:
          console.log('Swiper tap, no specific action for linkType:', item.linkType);
      }
    }
  },

  onProductTap: function(e) {
    const productId = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/product-detail/product-detail?id=' + productId });
  },

  onProductImageError: function(e) {
    // console.log('Image load error:', e.detail.errMsg);
    // console.log('Error for product at index:', e.currentTarget.dataset.index);
    const index = e.currentTarget.dataset.index;
    const productList = this.data.productList;
    // Optional: set a default/placeholder image if one fails to load
    // if (productList[index]) {
    //   productList[index].mainImageUrl = '/images/image_load_fail.png'; // Your placeholder image
    //   this.setData({ productList: productList });
    // }
  },

  addToCart: function(e) {
    const productId = e.currentTarget.dataset.id;
    if (!productId) {
        wx.showToast({ title: '商品ID不存在', icon: 'none' });
        return;
    }
    // Find product in current list to get its details (name, price, image, stock)
    const productToAdd = this.data.productList.find(p => p._id === productId);

    if (!productToAdd) {
        wx.showToast({ title: '无法找到商品信息', icon: 'none' });
      return;
    }

    if (productToAdd.stock <= 0) {
      wx.showToast({ title: '该商品已售罄', icon: 'none' });
        return;
    }

    let cart = wx.getStorageSync('cart') || [];
    const existingItemIndex = cart.findIndex(item => item._id === productId);

    if (existingItemIndex > -1) {
      // Item already in cart, increase quantity if stock allows
      if (cart[existingItemIndex].quantity < productToAdd.stock) {
        cart[existingItemIndex].quantity++;
      } else {
        wx.showToast({ title: '已达库存上限', icon: 'none' });
        return; // Do not add if already at max stock
      }
    } else {
      // Add new item to cart
      cart.push({
        _id: productToAdd._id,
        name: productToAdd.name,
        imageUrl: productToAdd.mainImageUrl || (productToAdd.imageUrls && productToAdd.imageUrls[0]) || this.data.defaultProductImage,
        price: productToAdd.price,
        quantity: 1,
        stock: productToAdd.stock, // For checking in cart page
        checked: true, // Default checked state
      });
    }

    wx.setStorageSync('cart', cart);
    this.updateCartItemCount();
    wx.showToast({ title: '已加入购物车', icon: 'success' });
  },

  preventBubble: function(e) {
    // This function does nothing but catches the event to prevent it from bubbling up.
    // Used on the add-to-cart button wrapper inside the product card.
  },
  
  goToCart: function() {
    wx.navigateTo({
      url: '/pages/cart/cart'
    });
  },

  goToProductDetail: function(e) {
    const productId = e.currentTarget.dataset.id;
    if (productId) {
      wx.navigateTo({
        url: '/pages/product-detail/product-detail?id=' + productId
      });
    } else {
      wx.showToast({
        title: '商品ID不存在',
        icon: 'none'
      });
    }
  },

  updateCartItemCount: function() {
    const cart = wx.getStorageSync('cart') || [];
    let count = 0;
    cart.forEach(item => count += item.quantity);
    this.setData({ cartItemCount: count });
    if (count > 0) {
      wx.setTabBarBadge({
        index: 2, // Mall tab index (0-indexed)
        text: String(count)
      });
    } else {
      wx.removeTabBarBadge({ index: 2 });
    }
  }
}); 
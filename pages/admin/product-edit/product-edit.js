const app = getApp();

Page({
  data: {
    productId: null,
    isEdit: false,
    categories: [],
    categoryIndex: -1, // -1 表示未选择
    product: {
      name: '',
      price: '',
      originalPrice: '',
      stock: '',
      categoryId: null, // 初始化为 null
      tagsString: '',
      mainImageUrl: '',
      imageUrls: [],
      shortDescription: '',
      longDescription: '',
      detailImages: [],
      isActive: true,
      sortOrder: 0,
    },
    isSubmitting: false,
    originalMainImageUrl: '',
    originalImageUrls: [],
    originalDetailImages: [],
    adminAccessed: false,
    uploading: false,
    progress: 0
  },

  onLoad: async function (options) {
    const adminAccessed = await this.checkAdminAccess();
    if (!adminAccessed) return;

    this.setData({ isEdit: !!options.id });
    await this.loadCategories(); // 等待分类加载完成

    if (options.id) {
      this.setData({ productId: options.id });
      wx.setNavigationBarTitle({ title: '编辑商品' });
      this.loadProductDetails(options.id); // loadProductDetails 内部会调用 setCategoryPickerSelection
    } else {
      wx.setNavigationBarTitle({ title: '添加商品' });
      // 新增商品时，确保 product 对象被正确初始化（包括 categoryId: null）
      // 并且 categoryIndex 设置为 -1
      this.setData({
        product: {
          name: '',
          price: '',
          originalPrice: '',
          stock: '',
          categoryId: null,
          tagsString: '',
          mainImageUrl: '',
          imageUrls: [],
          shortDescription: '',
          longDescription: '',
          detailImages: [],
          isActive: true,
          sortOrder: 0,
        },
        categoryIndex: -1 
      });
    }
  },

  checkAdminAccess: async function() {
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo || !userInfo.isAdmin) {
      wx.showToast({
        title: '无权访问',
        icon: 'error',
        duration: 2000,
        complete: () => setTimeout(() => wx.switchTab({ url: '/pages/profile/profile' }), 2000)
      });
      this.setData({ adminAccessed: false });
      return false;
    }
    this.setData({ adminAccessed: true });
    return true;
  },

  loadCategories: async function() {
    if (!this.data.adminAccessed) return;
    try {
      wx.showLoading({ title: '加载分类...' });
      const res = await wx.cloud.callFunction({
        name: 'adminGetCategoryList',
        data: { isActive: true }
      });
      wx.hideLoading();
      if (res.result && res.result.success) {
        this.setData({
          categories: res.result.data,
        });
        // 如果不是在 loadProductDetails 之后调用（例如，新增商品时），
        // 并且 formData 中已经有 categoryId（不太可能在新增时），则设置 picker。
        // 主要的 picker 设置应该在 product 加载后进行。
        if (this.data.product.categoryId && this.data.categories.length > 0) {
             this.setCategoryPickerSelection();
        }
      } else {
        wx.showToast({ title: res.result.message || '加载分类失败', icon: 'none' });
      }
    } catch (error) {
      wx.hideLoading();
      console.error("加载分类列表失败：", error);
      wx.showToast({ title: '加载分类出错', icon: 'none' });
    }
  },

  loadProductDetails: async function(productId) {
    if (!this.data.adminAccessed) return;
    wx.showLoading({ title: '加载中...' });
    try {
      const res = await wx.cloud.callFunction({
        name: 'adminGetProductList',
        data: { pageSize: 1, filter: { _id: productId } }
      });
      wx.hideLoading();
      if (res.result && res.result.errCode === 0 && res.result.data && res.result.data.length > 0) {
        const productData = res.result.data[0];
        this.setData({
          product: {
            ...productData,
            tagsString: productData.tags ? productData.tags.join(',') : '',
          },
          originalMainImageUrl: productData.mainImageUrl || '',
          originalImageUrls: [...(productData.imageUrls || [])],
          originalDetailImages: [...(productData.detailImages || [])],
        });
        this.setCategoryPickerSelection(); // 在商品数据填充后，根据 categoryId 设置 picker
      } else {
        wx.showToast({ title: res.result.errMsg || '加载商品失败', icon: 'none' });
        setTimeout(() => wx.navigateBack(), 1500);
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '加载异常', icon: 'none' });
      console.error("loadProductDetails error", err);
      setTimeout(() => wx.navigateBack(), 1500);
    }
  },

  setCategoryPickerSelection: function() {
    const { categories, product } = this.data;
    if (categories.length > 0 && product.categoryId) {
      const selectedIndex = categories.findIndex(cat => cat._id === product.categoryId);
      this.setData({
        categoryIndex: selectedIndex > -1 ? selectedIndex : -1
      });
    } else {
      this.setData({ categoryIndex: -1 });
    }
  },

  handleInputChange: function(e) {
    const field = e.currentTarget.dataset.field; // e.g., "product.name", "product.price"
    let value = e.detail.value;
    this.setData({ [field]: value });
  },

  onCategoryChange: function(e) {
    const selectedIndex = parseInt(e.detail.value);
    const categories = this.data.categories;
    if (selectedIndex >= 0 && selectedIndex < categories.length) {
      this.setData({
        categoryIndex: selectedIndex,
        'product.categoryId': categories[selectedIndex]._id
      });
    } else {
      this.setData({
        categoryIndex: -1,
        'product.categoryId': null
      });
    }
  },

  chooseImage: function(e) {
    const type = e.currentTarget.dataset.type;
    const maxCount = type === 'mainImageUrl' ? 1 : 9;
    let currentCount = 0;
    if (type === 'imageUrls') currentCount = this.data.product.imageUrls.length;
    if (type === 'detailImages') currentCount = this.data.product.detailImages.length;
    wx.chooseMedia({
      count: maxCount - currentCount,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: (res) => {
        const tempFiles = res.tempFiles;
        if (type === 'mainImageUrl') {
          this.setData({ 'product.mainImageUrl': tempFiles[0].tempFilePath });
        } else if (type === 'imageUrls') {
          this.setData({ 'product.imageUrls': this.data.product.imageUrls.concat(tempFiles.map(f => f.tempFilePath)) });
        } else if (type === 'detailImages') {
          this.setData({ 'product.detailImages': this.data.product.detailImages.concat(tempFiles.map(f => f.tempFilePath)) });
        }
      }
    });
  },

  deleteImage: function(e) {
    const type = e.currentTarget.dataset.type;
    const index = e.currentTarget.dataset.index;
    if (type === 'mainImageUrl') {
      this.setData({ 'product.mainImageUrl': '' });
    } else if (type === 'imageUrls') {
      let imageUrls = [...this.data.product.imageUrls];
      imageUrls.splice(index, 1);
      this.setData({ 'product.imageUrls': imageUrls });
    } else if (type === 'detailImages') {
      let detailImages = [...this.data.product.detailImages];
      detailImages.splice(index, 1);
      this.setData({ 'product.detailImages': detailImages });
    }
  },

  previewImage: function(e) {
    const type = e.currentTarget.dataset.type;
    const currentUrl = e.currentTarget.dataset.url;
    let urls = [];
    if (type === 'mainImageUrl') {
      urls = [currentUrl];
    } else if (type === 'imageUrls') {
      urls = this.data.product.imageUrls;
    } else if (type === 'detailImages') {
      urls = this.data.product.detailImages;
    }
    wx.previewImage({ current: currentUrl, urls: urls });
  },

  onFormSubmit: async function(e) {
    const formData = e.detail.value; // formData from <form bindsubmit="onFormSubmit">
    if (this.data.isSubmitting) return;
    this.setData({ isSubmitting: true });
    wx.showLoading({ title: '提交中...' });

    if (!formData.name || formData.name.trim() === '') {
      wx.showToast({ title: '请输入商品名称', icon: 'none' });
      this.setData({ isSubmitting: false }); wx.hideLoading(); return;
    }
    // Price and stock are directly bound to product.price and product.stock via handleInputChange
    // So, validation should use this.data.product values if not using form's direct values
    // For simplicity, we assume form values are primary and handleInputChange updates this.data.product as well.
    // Let's ensure that handleInputChange correctly binds to product.price etc.
    // If not, then formData.price might be undefined if not explicitly named in WXML.
    // The current WXML likely uses name="name", name="price", etc. so formData.price is fine.

    if (!formData.price || isNaN(parseFloat(formData.price)) || parseFloat(formData.price) <= 0) {
      wx.showToast({ title: '请输入有效的商品价格', icon: 'none' });
      this.setData({ isSubmitting: false }); wx.hideLoading(); return;
    }
    if (!formData.stock || isNaN(parseInt(formData.stock)) || parseInt(formData.stock) < 0) {
      wx.showToast({ title: '请输入有效的库存数量', icon: 'none' });
      this.setData({ isSubmitting: false }); wx.hideLoading(); return;
    }
    if (!this.data.product.categoryId) { // Check categoryId from this.data.product
      wx.showToast({ title: '请选择商品分类', icon: 'none' });
      this.setData({ isSubmitting: false }); wx.hideLoading(); return;
    }

    try {
      const newMainImageFileId = await this.uploadFileIfNeeded(this.data.product.mainImageUrl, this.data.originalMainImageUrl);
      const newImageUrlsFileIds = await this.uploadMultipleFilesIfNeeded(this.data.product.imageUrls, this.data.originalImageUrls);
      const newDetailImagesFileIds = await this.uploadMultipleFilesIfNeeded(this.data.product.detailImages, this.data.originalDetailImages);

      const productToSave = {
        name: formData.name.trim(),
        price: parseFloat(formData.price),
        originalPrice: formData.originalPrice ? parseFloat(formData.originalPrice) : null,
        stock: parseInt(formData.stock),
        categoryId: this.data.product.categoryId, // Use internal state for categoryId
        tags: formData.tagsString ? formData.tagsString.split(',').map(t => t.trim()).filter(t => t) : [],
        shortDescription: formData.shortDescription || '',
        longDescription: formData.longDescription || '',
        isActive: typeof formData.isActive === 'boolean' ? formData.isActive : (formData.isActive === 'true'),
        sortOrder: parseInt(formData.sortOrder) || 0,
        mainImageUrl: newMainImageFileId,
        imageUrls: newImageUrlsFileIds,
        detailImages: newDetailImagesFileIds,
      };

      let cloudFunctionName = this.data.productId ? 'adminUpdateProduct' : 'adminAddProduct';
      let callData = { productData: productToSave };
      if (this.data.productId) {
        callData = { productId: this.data.productId, updateData: productToSave };
      }

      const res = await wx.cloud.callFunction({
        name: cloudFunctionName,
        data: callData
      });

      wx.hideLoading();
      if (res.result && res.result.errCode === 0) {
        wx.showToast({ title: this.data.productId ? '更新成功' : '添加成功', icon: 'success' });
        if (this.data.productId) {
            await this.deleteOldFiles();
        }
        const pages = getCurrentPages();
        const prevPage = pages[pages.length - 2];
        if (prevPage && prevPage.loadProducts) {
            prevPage.loadProducts(true);
        }
        setTimeout(() => wx.navigateBack(), 1500);
      } else {
        wx.showToast({ title: res.result.errMsg || res.result.message || '操作失败', icon: 'none' });
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '提交异常: ' + err.message, icon: 'none' });
      console.error("onFormSubmit error", err);
    } finally {
      this.setData({ isSubmitting: false });
    }
  },

  uploadFileIfNeeded: async function(filePath, originalFilePath) {
    if (!filePath) return '';
    if (filePath === originalFilePath && filePath.startsWith('cloud://')) return filePath;
    if (filePath.startsWith('cloud://')) return filePath;
    if (!filePath.startsWith('wxfile://') && !filePath.startsWith('http://tmp/') && !filePath.startsWith('blob:')) return '';
    const fileExt = filePath.split('.').pop() || 'png';
    const fileName = `product_images/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
    try {
      const uploadResult = await wx.cloud.uploadFile({
        cloudPath: fileName,
        filePath: filePath
      });
      return uploadResult.fileID;
    } catch (e) {
      console.error('Upload file failed:', e);
      throw new Error('图片上传失败');
    }
  },

  uploadMultipleFilesIfNeeded: async function(filePaths, originalFilePaths) {
    if (!filePaths || filePaths.length === 0) return [];
    const uploadedFileIds = [];
    for (let i = 0; i < filePaths.length; i++) {
      const filePath = filePaths[i];
      const originalFilePath = originalFilePaths && originalFilePaths[i] ? originalFilePaths[i] : null;
      const fileId = await this.uploadFileIfNeeded(filePath, originalFilePath);
      if (fileId) {
        uploadedFileIds.push(fileId);
      }
    }
    return uploadedFileIds;
  },

  deleteOldFiles: async function() {
    const filesToDelete = [];
    if (this.data.originalMainImageUrl && this.data.originalMainImageUrl !== this.data.product.mainImageUrl && this.data.originalMainImageUrl.startsWith('cloud://')) {
      filesToDelete.push(this.data.originalMainImageUrl);
    }
    this.data.originalImageUrls.forEach(originalUrl => {
      if (originalUrl.startsWith('cloud://') && !this.data.product.imageUrls.includes(originalUrl)) {
        filesToDelete.push(originalUrl);
      }
    });
    this.data.originalDetailImages.forEach(originalUrl => {
      if (originalUrl.startsWith('cloud://') && !this.data.product.detailImages.includes(originalUrl)) {
        filesToDelete.push(originalUrl);
      }
    });
    if (filesToDelete.length > 0) {
      try {
        console.log("Deleting old files: ", filesToDelete);
        await wx.cloud.deleteFile({ fileList: filesToDelete });
      } catch (e) {
        console.error('Failed to delete old files:', e);
      }
    }
  },

  cancelEdit: function() {
    wx.navigateBack();
  }
}); 
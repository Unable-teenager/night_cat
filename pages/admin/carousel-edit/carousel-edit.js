const app = getApp();

Page({
  data: {
    carouselId: null, // For edit mode
    carousel: {
      imageUrl: '', // Cloud fileID or temp path
      title: '',
      description: '',
      linkType: 'none', // 'none', 'product', 'category', 'page', 'external'
      linkValue: '',
      isActive: true,
      sortOrder: 0,
      startDate: '', // YYYY-MM-DD
      endDate: ''    // YYYY-MM-DD
    },
    originalImageUrl: '', // To track if image changed
    isSubmitting: false,

    linkTypeOptions: [
      { value: 'none', label: '无链接' },
      { value: 'product', label: '商品详情页', placeholder: '请输入商品ID' },
      { value: 'category', label: '分类聚合页', placeholder: '请输入分类ID' }, // Future use
      { value: 'page', label: '小程序内页', placeholder: '例如: /pages/mall/mall' },
      { value: 'external', label: '外部链接(H5)', placeholder: '请输入https开头的完整URL' }
    ],
    linkTypeIndex: 0, // Default to '无链接'
    linkValuePlaceholder: '无需填写',
  },

  onLoad: function (options) {
    this.updateLinkValuePlaceholder(); // Set initial placeholder
    if (options.id) {
      this.setData({ carouselId: options.id });
      wx.setNavigationBarTitle({ title: '编辑轮播图' });
      this.loadCarouselDetails(options.id);
    } else {
      wx.setNavigationBarTitle({ title: '添加轮播图' });
      this.setData({ // Defaults for new carousel
        'carousel.isActive': true,
        'carousel.sortOrder': 0,
        linkTypeIndex: this.data.linkTypeOptions.findIndex(lt => lt.value === 'none')
      });
    }
  },

  loadCarouselDetails: async function(carouselId) {
    wx.showLoading({ title: '加载中...' });
    try {
      // Assuming adminGetCarouselList can fetch by _id if passed in filter
      // Ideally, a dedicated adminGetCarouselById cloud function would be better.
      const res = await wx.cloud.callFunction({
        name: 'adminGetCarouselList', 
        data: { pageSize: 1, filter: { _id: carouselId } } 
      });
      wx.hideLoading();
      if (res.result && res.result.errCode === 0 && res.result.data && res.result.data.length > 0) {
        const carouselData = res.result.data[0];
        const linkTypeIndex = this.data.linkTypeOptions.findIndex(lt => lt.value === carouselData.linkType) || 0;
        this.setData({
          carousel: carouselData,
          originalImageUrl: carouselData.imageUrl || '',
          linkTypeIndex: linkTypeIndex,
        });
        this.updateLinkValuePlaceholder();
      } else {
        wx.showToast({ title: res.result.errMsg || '加载轮播图失败', icon: 'none' });
        setTimeout(() => wx.navigateBack(), 1500);
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '加载异常', icon: 'none' });
      console.error("loadCarouselDetails error", err);
      setTimeout(() => wx.navigateBack(), 1500);
    }
  },

  onLinkTypeChange: function(e) {
    const index = e.detail.value;
    this.setData({
      linkTypeIndex: index,
      'carousel.linkType': this.data.linkTypeOptions[index].value,
      'carousel.linkValue': '' // Reset linkValue when type changes
    });
    this.updateLinkValuePlaceholder();
  },

  updateLinkValuePlaceholder: function() {
    const currentLinkType = this.data.linkTypeOptions[this.data.linkTypeIndex];
    this.setData({ linkValuePlaceholder: currentLinkType.placeholder || '无需填写' });
  },
  
  onDateChange: function(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({
      [`carousel.${field}`]: e.detail.value
    });
  },

  chooseImage: function() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: (res) => {
        this.setData({ 'carousel.imageUrl': res.tempFiles[0].tempFilePath });
      }
    });
  },

  deleteImage: function() {
    this.setData({ 'carousel.imageUrl': '' });
  },

  previewImage: function(e) {
    if (this.data.carousel.imageUrl) {
      wx.previewImage({ urls: [this.data.carousel.imageUrl] });
    }
  },

  onFormSubmit: async function(e) {
    const formData = e.detail.value;
    if (this.data.isSubmitting) return;
    this.setData({ isSubmitting: true });
    wx.showLoading({ title: '提交中...' });

    if (!this.data.carousel.imageUrl) {
      wx.showToast({ title: '请上传轮播图片', icon: 'none' });
      this.setData({ isSubmitting: false }); wx.hideLoading(); return;
    }
    const selectedLinkType = this.data.linkTypeOptions[this.data.linkTypeIndex].value;
    if (selectedLinkType !== 'none' && (!formData.linkValue || formData.linkValue.trim() === '')) {
      wx.showToast({ title: '请输入链接目标', icon: 'none' });
      this.setData({ isSubmitting: false }); wx.hideLoading(); return;
    }
    if (selectedLinkType === 'external' && !formData.linkValue.startsWith('https://')) {
        wx.showToast({ title: '外部链接必须以https://开头', icon: 'none' });
        this.setData({ isSubmitting: false }); wx.hideLoading(); return;
    }

    try {
      let imageUrlToSave = this.data.carousel.imageUrl;
      if (imageUrlToSave && !imageUrlToSave.startsWith('cloud://') && (imageUrlToSave !== this.data.originalImageUrl)) {
        const fileName = `carousel_images/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${imageUrlToSave.split('.').pop()}`;
        const uploadResult = await wx.cloud.uploadFile({
          cloudPath: fileName,
          filePath: imageUrlToSave,
        });
        imageUrlToSave = uploadResult.fileID;
      }

      const carouselToSave = {
        title: formData.title || '',
        description: formData.description || '',
        linkType: selectedLinkType,
        linkValue: selectedLinkType === 'none' ? '' : formData.linkValue.trim(),
        isActive: formData.isActive,
        sortOrder: parseInt(formData.sortOrder) || 0,
        imageUrl: imageUrlToSave,
        startDate: this.data.carousel.startDate || null, // Store as null if empty
        endDate: this.data.carousel.endDate || null,
      };
      // Convert date strings to timestamp if they exist for storage, or ensure backend handles string conversion
      if (carouselToSave.startDate) carouselToSave.startDate = new Date(carouselToSave.startDate).getTime();
      if (carouselToSave.endDate) carouselToSave.endDate = new Date(carouselToSave.endDate).getTime();


      let cloudFunctionName = this.data.carouselId ? 'adminUpdateCarousel' : 'adminAddCarousel';
      let callData = { carouselData: carouselToSave };
      if (this.data.carouselId) {
        callData = { carouselId: this.data.carouselId, updateData: carouselToSave };
      }

      const res = await wx.cloud.callFunction({ name: cloudFunctionName, data: callData });

      wx.hideLoading();
      if (res.result && res.result.errCode === 0) {
        wx.showToast({ title: this.data.carouselId ? '更新成功' : '添加成功', icon: 'success' });

        // Delete old image if it changed and was a cloud file
        if (this.data.carouselId && this.data.originalImageUrl && this.data.originalImageUrl.startsWith('cloud://') && this.data.originalImageUrl !== imageUrlToSave) {
          try {
            await wx.cloud.deleteFile({ fileList: [this.data.originalImageUrl] });
            console.log('Old carousel image deleted:', this.data.originalImageUrl);
          } catch (delErr) {
            console.error('Failed to delete old carousel image:', delErr);
          }
        }
        
        const pages = getCurrentPages();
        const prevPage = pages[pages.length - 2];
        if (prevPage && prevPage.loadCarousels) {
            prevPage.loadCarousels(true);
        }
        setTimeout(() => wx.navigateBack(), 1500);
      } else {
        wx.showToast({ title: res.result.errMsg || '操作失败', icon: 'none' });
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '提交异常', icon: 'none' });
      console.error("onFormSubmit error", err);
    } finally {
      this.setData({ isSubmitting: false });
    }
  },

  cancelEdit: function() {
    wx.navigateBack();
  }
}); 
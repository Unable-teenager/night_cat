const app = getApp();

Page({
  data: {
    categories: [],
    loading: true,
    adminAccessed: false,
    showAddForm: false,
    newCategory: {
      name: '',
      sortOrder: null,
      isActive: true
    },
    isSubmittingNewCategory: false
  },

  onLoad: function (options) {
    this.checkAdminAccess();
  },

  onShow: function () {
    if (this.data.adminAccessed) {
        this.loadCategories();
    }
  },

  async checkAdminAccess() {
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo || !userInfo.isAdmin) {
      wx.showToast({
        title: '无管理员权限',
        icon: 'error',
        duration: 2000,
        complete: () => {
          wx.switchTab({ url: '/pages/profile/profile' });
        }
      });
      this.setData({ adminAccessed: false });
      return;
    }
    this.setData({ adminAccessed: true });
  },

  loadCategories: async function () {
    this.setData({ loading: true });
    try {
      const res = await wx.cloud.callFunction({
        name: 'adminGetCategoryList',
        data: {}
      });
      if (res.result && res.result.success) {
        this.setData({
          categories: res.result.data,
          loading: false
        });
      } else {
        this.setData({ loading: false, categories: [] });
        wx.showToast({ title: res.result.message || '加载分类列表失败', icon: 'none'});
        console.error("加载分类列表失败: ", res.result.message || '未知错误');
      }
    } catch (error) {
      this.setData({ loading: false, categories: [] });
      wx.showToast({
        title: '加载分类失败: ' + error.message,
        icon: 'none'
      });
      console.error("加载分类列表失败: ", error);
    }
  },

  onSortOrderChange: async function(e) {
    const categoryId = e.currentTarget.dataset.id;
    const newSortOrder = parseInt(e.detail.value, 10);

    if (isNaN(newSortOrder)) {
        wx.showToast({ title: '排序值必须是数字', icon: 'none' });
        const originalCategory = this.data.categories.find(cat => cat._id === categoryId);
        if (originalCategory) {
            const categories = this.data.categories.map(cat => {
                if (cat._id === categoryId) {
                    return { ...cat, sortOrder: originalCategory.sortOrder }; 
                }
                return cat;
            });
            this.setData({ categories }); 
        }
        return;
    }

    wx.showLoading({ title: '更新中...' });
    try {
      const res = await wx.cloud.callFunction({
        name: 'adminUpdateCategory',
        data: {
          categoryId: categoryId,
          sortOrder: newSortOrder
        }
      });
      if (res.result && res.result.success) {
        wx.showToast({ title: '排序已更新', icon: 'success' });
        this.loadCategories();
      } else {
        throw new Error(res.result.message || '更新失败');
      }
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: '更新排序失败: ' + error.message,
        icon: 'none'
      });
      this.loadCategories();
    }
  },

  toggleCategoryStatus: async function (e) {
    const categoryId = e.currentTarget.dataset.id;
    const currentStatus = e.currentTarget.dataset.currentStatus;
    const newStatus = !currentStatus;

    wx.showLoading({ title: '更新中...' });
    try {
      const res = await wx.cloud.callFunction({
        name: 'adminUpdateCategory',
        data: {
          categoryId: categoryId,
          isActive: newStatus
        }
      });
      if (res.result && res.result.success) {
        wx.showToast({ title: newStatus ? '已激活' : '已禁用', icon: 'success' });
        const categories = this.data.categories.map(cat => {
          if (cat._id === categoryId) {
            return { ...cat, isActive: newStatus, sortOrder: cat.sortOrder };
          }
          return cat;
        });
        this.setData({ categories });
      } else {
        throw new Error(res.result.message || '更新失败');
      }
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: '更新状态失败: ' + error.message,
        icon: 'none'
      });
    } finally {
        wx.hideLoading();
    }
  },

  onPullDownRefresh: function () {
    if (this.data.adminAccessed) {
        this.loadCategories();
    }
    wx.stopPullDownRefresh();
  },

  toggleAddForm: function() {
    this.setData({
      showAddForm: !this.data.showAddForm,
      newCategory: {
        name: '',
        sortOrder: null,
        isActive: true
      }
    });
  },

  onNewCategoryInput: function(e) {
    const field = e.currentTarget.dataset.field;
    let value = e.detail.value;
    if (field === 'sortOrder') {
      value = value === '' ? null : parseInt(value, 10);
    }
    this.setData({
      [`newCategory.${field}`]: value
    });
  },

  onNewCategorySwitchChange: function(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({
      [`newCategory.${field}`]: e.detail.value
    });
  },

  submitAddCategory: async function() {
    if (!this.data.newCategory.name || this.data.newCategory.name.trim() === '') {
      wx.showToast({ title: '分类名称不能为空', icon: 'none' });
      return;
    }

    this.setData({ isSubmittingNewCategory: true });
    wx.showLoading({ title: '添加中...' });

    try {
      const res = await wx.cloud.callFunction({
        name: 'adminAddCategory',
        data: {
          name: this.data.newCategory.name.trim(),
          sortOrder: this.data.newCategory.sortOrder === null || isNaN(this.data.newCategory.sortOrder) ? 0 : this.data.newCategory.sortOrder,
          isActive: this.data.newCategory.isActive
        }
      });
      wx.hideLoading();
      this.setData({ isSubmittingNewCategory: false });

      if (res.result && res.result.success) {
        wx.showToast({ title: '添加成功', icon: 'success' });
        this.setData({
          showAddForm: false,
          newCategory: { name: '', sortOrder: null, isActive: true }
        });
        this.loadCategories();
      } else {
        wx.showToast({ title: res.result.message || '添加失败', icon: 'none' });
      }
    } catch (error) {
      wx.hideLoading();
      this.setData({ isSubmittingNewCategory: false });
      wx.showToast({ title: '添加异常: ' + error.message, icon: 'none' });
      console.error("添加分类异常: ", error);
    }
  },

  // 暂时不实现新增和编辑
  /* 
  addCategory: function () {
    // wx.navigateTo({ url: '/pages/admin/category-edit/category-edit' });
    wx.showToast({ title: '功能开发中', icon: 'none' });
  },

  editCategory: function (e) {
    const categoryId = e.currentTarget.dataset.id;
    // wx.navigateTo({ url: `/pages/admin/category-edit/category-edit?id=${categoryId}` });
    wx.showToast({ title: '功能开发中', icon: 'none' });
  },

  deleteCategory: async function (e) {
    // const categoryId = e.currentTarget.dataset.id;
    // wx.showModal({...}); // 删除前确认
    wx.showToast({ title: '功能开发中', icon: 'none' });
  }
  */
}); 
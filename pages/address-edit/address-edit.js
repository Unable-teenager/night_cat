// pages/address-edit/address-edit.js
const app = getApp();

Page({

  /**
   * 页面的初始数据
   */
  data: {
    isEdit: false,
    addressId: '',
    address: {
      name: '',
      phone: '',
      province: '',
      city: '',
      district: '',
      detail: '',
      isDefault: false
    }
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    if (options.id) {
      this.setData({
        isEdit: true,
        addressId: options.id
      });
      this.fetchAddressDetail(options.id);
      wx.setNavigationBarTitle({
        title: '编辑地址'
      });
    } else {
      wx.setNavigationBarTitle({
        title: '新增地址'
      });
    }
  },

  /**
   * 获取地址详情
   */
  fetchAddressDetail: function(id) {
    wx.showLoading({
      title: '加载中',
      mask: true
    });

    wx.cloud.callFunction({
      name: 'getAddressDetail',
      data: { id },
      success: res => {
        console.log("地址详情获取成功", res.result);
        if (res.result && res.result.data) {
          const address = res.result.data;
          this.setData({
            address
          });
        }
      },
      fail: err => {
        console.error("获取地址详情失败", err);
        wx.showToast({
          title: '获取地址失败',
          icon: 'none'
        });
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  },

  /**
   * 输入更新处理
   */
  onInputChange: function(e) {
    const { field } = e.currentTarget.dataset;
    const value = e.detail.value;
    
    this.setData({
      [`address.${field}`]: value
    });
  },

  /**
   * 提交表单
   */
  submitForm: function(e) {
    const formData = e.detail.value;
    
    // 表单验证
    if (!formData.name || !formData.name.trim()) {
      wx.showToast({
        title: '请输入收货人姓名',
        icon: 'none'
      });
      return;
    }

    if (!formData.phone || !/^1\d{10}$/.test(formData.phone)) {
      wx.showToast({
        title: '请输入正确的手机号码',
        icon: 'none'
      });
      return;
    }

    if (!formData.province || !formData.province.trim()) {
      wx.showToast({
        title: '请输入省份',
        icon: 'none'
      });
      return;
    }

    if (!formData.city || !formData.city.trim()) {
      wx.showToast({
        title: '请输入城市',
        icon: 'none'
      });
      return;
    }

    if (!formData.district || !formData.district.trim()) {
      wx.showToast({
        title: '请输入区/县',
        icon: 'none'
      });
      return;
    }

    if (!formData.detail || !formData.detail.trim()) {
      wx.showToast({
        title: '请输入详细地址',
        icon: 'none'
      });
      return;
    }

    // 组装地址数据
    const address = {
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      province: formData.province.trim(),
      city: formData.city.trim(),
      district: formData.district.trim(),
      detail: formData.detail.trim(),
      isDefault: formData.isDefault
    };

    wx.showLoading({
      title: '保存中',
      mask: true
    });

    // 确定是新增还是编辑
    const cloudFuncName = this.data.isEdit ? 'updateAddress' : 'addAddress';
    const data = this.data.isEdit ? { id: this.data.addressId, address } : { address };

    wx.cloud.callFunction({
      name: cloudFuncName,
      data,
      success: res => {
        console.log(`${this.data.isEdit ? '更新' : '添加'}地址成功`, res);
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        });
        
        // 返回上一页
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      },
      fail: err => {
        console.error(`${this.data.isEdit ? '更新' : '添加'}地址失败`, err);
        wx.showToast({
          title: '保存失败',
          icon: 'none'
        });
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  },

  /**
   * 删除地址
   */
  deleteAddress: function() {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个地址吗？',
      success: res => {
        if (res.confirm) {
          wx.showLoading({
            title: '删除中',
            mask: true
          });

          wx.cloud.callFunction({
            name: 'deleteAddress',
            data: { id: this.data.addressId },
            success: res => {
              console.log("删除地址成功", res);
              wx.showToast({
                title: '删除成功',
                icon: 'success'
              });
              
              // 返回上一页
              setTimeout(() => {
                wx.navigateBack();
              }, 1500);
            },
            fail: err => {
              console.error("删除地址失败", err);
              wx.showToast({
                title: '删除失败',
                icon: 'none'
              });
            },
            complete: () => {
              wx.hideLoading();
            }
          });
        }
      }
    });
  }
});

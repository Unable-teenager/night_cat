// pages/address-list/address-list.js
const app = getApp();

Page({

  /**
   * 页面的初始数据
   */
  data: {
    addressList: [],
    loading: true,
    isFromOrder: false,  // 是否从订单确认页跳转来的
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 检查是否从订单确认页跳转而来
    if (options.from && options.from === 'orderConfirm') {
      this.setData({ isFromOrder: true });
    }
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    this.fetchAddressList();
  },

  /**
   * 获取地址列表
   */
  fetchAddressList: function() {
    this.setData({ loading: true });
    
    // 调用云函数获取用户地址列表
    wx.cloud.callFunction({
      name: 'getAddressList',
      success: res => {
        console.log("地址列表获取成功", res.result);
        this.setData({
          addressList: res.result.data || [],
          loading: false
        });
      },
      fail: err => {
        console.error("获取地址列表失败", err);
        this.setData({ loading: false });
        wx.showToast({
          title: '获取地址失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 选择地址 (用于从订单确认页跳转过来的情况)
   */
  selectAddress: function(e) {
    const id = e.currentTarget.dataset.id;
    const selectedAddress = this.data.addressList.find(addr => addr._id === id);
    
    if (selectedAddress) {
      if (this.data.isFromOrder) {
        // 使用事件通道与订单确认页面通信
        const eventChannel = this.getOpenerEventChannel();
        if (eventChannel && eventChannel.emit) {
          // 将选中的地址传回上一个页面
          eventChannel.emit('selectAddress', selectedAddress);
          console.log('已选择地址，通过事件通道发送：', selectedAddress);
          
          // 缓存到本地便于下次直接使用
          wx.setStorageSync('lastUsedAddress', {
            userName: selectedAddress.name,
            telNumber: selectedAddress.phone,
            provinceName: selectedAddress.province,
            cityName: selectedAddress.city,
            countyName: selectedAddress.district,
            detailInfo: selectedAddress.detail,
            isDefault: selectedAddress.isDefault,
            addressId: selectedAddress._id
          });
          
          // 返回上一页
          wx.navigateBack();
        } else {
          console.error('事件通道不可用，无法选择地址');
          wx.showToast({
            title: '选择地址失败',
            icon: 'none'
          });
        }
      } else {
        // 如果不是从订单页跳过来的，可以标记为默认地址等操作
        wx.showToast({
          title: '地址已选择',
          icon: 'success'
        });
      }
    }
  },

  /**
   * 添加新地址
   */
  addNewAddress: function() {
    wx.navigateTo({
      url: '/pages/address-edit/address-edit'
    });
  },

  /**
   * 编辑地址
   */
  editAddress: function(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/address-edit/address-edit?id=${id}`
    });
  },

  /**
   * 删除地址
   */
  deleteAddress: function(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个地址吗？',
      success: res => {
        if (res.confirm) {
          wx.cloud.callFunction({
            name: 'deleteAddress',
            data: { id },
            success: res => {
              console.log("删除地址成功", res);
              wx.showToast({
                title: '删除成功',
                icon: 'success'
              });
              this.fetchAddressList(); // 重新加载列表
            },
            fail: err => {
              console.error("删除地址失败", err);
              wx.showToast({
                title: '删除失败',
                icon: 'none'
              });
            }
          });
        }
      }
    });
  }
});

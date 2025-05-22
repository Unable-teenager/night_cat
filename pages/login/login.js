const app = getApp();

Page({
  data: {
    hasUserInfo: false,
    canIUseGetUserProfile: wx.canIUse('getUserProfile'), // 新版API
    canIUseOpenData: wx.canIUse('open-data.type.userAvatarUrl') && wx.canIUse('open-data.type.userNickName'), // 老版API兼容
    isAgreed: false, // 是否同意协议
  },

  onLoad: function () {
    this.checkLoginStatus();
  },

  checkLoginStatus: function () {
    wx.showLoading({
      title: '检查登录状态...',
      mask: true
    });

    wx.cloud.callFunction({
      name: 'checkUserLogin',
      data: {},
    })
    .then(res => {
      wx.hideLoading();
      console.log('checkUserLogin 调用成功', res);
      if (res.result && res.result.isRegistered && res.result.userInfo) {
        console.log('用户已注册，直接登录');
        app.globalData.userInfo = res.result.userInfo;
        wx.setStorageSync('userInfo', res.result.userInfo); // 更新本地缓存
        this.setData({
          hasUserInfo: true,
        });
        wx.switchTab({
          url: '/pages/home/home'
        });
      } else {
        console.log('用户未注册或信息不完整，停留在登录页');
        this.setData({
          hasUserInfo: false
        });
        wx.removeStorageSync('userInfo'); // 清除可能存在的旧缓存
      }
    })
    .catch(err => {
      wx.hideLoading();
      console.error('checkUserLogin 调用失败', err);
      wx.showToast({
        title: '检查登录状态失败，请重试',
        icon: 'none'
      });
      this.setData({
        hasUserInfo: false
      });
    });
  },

  getUserProfile: function (e) {
    if (!this.data.isAgreed) {
      wx.showToast({
        title: '请先同意用户协议和隐私政策',
        icon: 'none'
      });
      return;
    }
    // 推荐使用wx.getUserProfile获取用户信息，开发者每次通过该接口获取用户个人信息均需用户确认
    // 开发者妥善保管用户快速填写的头像昵称，避免重复弹窗
    wx.getUserProfile({
      desc: '用于完善会员资料', // 声明获取用户个人信息后的用途，后续会展示在弹窗中，请谨慎填写
      success: (res) => {
        const userInfoFromWx = res.userInfo;
        console.log('微信获取用户信息成功:', userInfoFromWx);

        // 询问用户是否使用微信昵称和头像
        wx.showModal({
          title: '授权提示',
          content: '是否使用您的微信昵称和头像作为店铺资料？',
          confirmText: '使用',
          cancelText: '不使用',
          success: (modalRes) => {
            let useWxProfile = true;
            if (modalRes.cancel) {
              // 用户选择不使用
              useWxProfile = false;
              console.log('用户选择不使用微信资料');
            } else {
              console.log('用户选择使用微信资料');
            }
            this.handleLoginSuccess(userInfoFromWx, useWxProfile);
          },
          fail: () => {
            // Modal调用失败，默认使用微信资料或给出提示
            wx.showToast({ title: '操作失败，请重试', icon: 'none' });
            // 或者，作为一种处理方式，默认继续使用微信资料
            // this.handleLoginSuccess(userInfoFromWx, true);
          }
        });
      },
      fail: (err) => {
        console.log('获取用户信息失败:', err);
        wx.showToast({
          title: '授权失败，请重试',
          icon: 'none'
        });
      }
    });
  },

  getUserInfoFallback: function(e) {
    if (!this.data.isAgreed) {
      wx.showToast({
        title: '请先同意用户协议和隐私政策',
        icon: 'none'
      });
      return;
    }
    // 老版本兼容处理
    if (e.detail.userInfo) {
      const userInfoFromWx = e.detail.userInfo;
      // 对于老API，也同样询问 (或者简化处理，例如默认使用)
       wx.showModal({
        title: '授权提示',
        content: '是否使用您的微信昵称和头像作为店铺资料？',
        confirmText: '使用',
        cancelText: '不使用',
        success: (modalRes) => {
          let useWxProfile = true;
          if (modalRes.cancel) {
            useWxProfile = false;
          }
          this.handleLoginSuccess(userInfoFromWx, useWxProfile);
        },
        fail: () => {
          this.handleLoginSuccess(userInfoFromWx, true); //  fallback
        }
      });
    } else {
      console.log('获取用户信息失败 (fallback):', e);
      wx.showToast({
        title: '授权失败，请重试',
        icon: 'none'
      });
    }
  },

  handleLoginSuccess: function(userInfoFromWx, useWxProfile) {
    // app.globalData.userInfo = userInfoFromWx; // 暂时不在这里设置 globalData，等待云函数返回完整信息

    wx.showLoading({
      title: '登录中...',
      mask: true
    });

    wx.cloud.callFunction({
      name: 'doLogin',
      data: {
        userInfo: userInfoFromWx,
        useWxProfile: useWxProfile // 传递用户的选择
      }
    })
    .then(res => {
      wx.hideLoading();
      console.log('doLogin 调用成功', res);
      if (res.result && res.result.success && res.result.userInfo) {
        // 云函数成功处理后，会返回包含 openid 和其他数据库信息的完整 userInfo
        app.globalData.userInfo = res.result.userInfo;
        wx.setStorageSync('userInfo', res.result.userInfo); // 存储完整的用户信息
        this.setData({
          hasUserInfo: true
        });
        wx.showToast({
          title: '登录成功',
          icon: 'success',
          duration: 1500,
          complete: () => {
            wx.switchTab({
              url: '/pages/home/home'
            });
          }
        });
      } else {
        throw new Error(res.result.errMsg || '登录处理失败');
      }
    })
    .catch(err => {
      wx.hideLoading();
      console.error('doLogin 调用失败', err);
      wx.showToast({
        title: err.message || '登录失败，请稍后重试',
        icon: 'none'
      });
      this.setData({ hasUserInfo: false });
      wx.removeStorageSync('userInfo');
      app.globalData.userInfo = null;
    });
  },

  onAgreeChange: function(e) {
    this.setData({
      isAgreed: e.detail.value.includes('agree')
    });
  },

  openAgreement: function() {
    // 跳转到用户服务协议页面，或弹出modal显示
    wx.showModal({
      title: '用户服务协议',
      content: '这里是用户服务协议内容...（请自行替换）',
      showCancel: false
    });
  },

  openPrivacyPolicy: function() {
    // 跳转到隐私政策页面，或弹出modal显示
    wx.showModal({
      title: '隐私政策',
      content: '这里是隐私政策内容...（请自行替换）',
      showCancel: false
    });
  }
}); 
const app = getApp();

Page({
  data: {
    avatarUrl: '', // Current avatar URL for preview
    nickName: '',
    originalNickName: '', // To check if nickname actually changed
    originalAvatarUrl: '', // To check if avatar actually changed
    tempFilePath: '', // Path for a newly chosen avatar image
    isSaving: false,
    defaultAvatar: '/images/default_avatar.png'
  },

  onLoad: function (options) {
    const currentUserInfo = wx.getStorageSync('userInfo');
    if (currentUserInfo) {
      this.setData({
        avatarUrl: currentUserInfo.avatarUrl || this.data.defaultAvatar,
        nickName: currentUserInfo.nickName || '',
        originalAvatarUrl: currentUserInfo.avatarUrl || this.data.defaultAvatar,
        originalNickName: currentUserInfo.nickName || ''
      });
    } else {
      // Should not happen if user is logged in, but as a fallback:
      wx.showToast({ title: '请先登录', icon: 'none' });
      wx.navigateBack();
    }
  },

  onNicknameInput: function (e) {
    this.setData({
      nickName: e.detail.value.trim()
    });
  },

  chooseAvatar: function () {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'], // Compress the image
      success: (res) => {
        if (res.tempFiles && res.tempFiles.length > 0) {
          this.setData({
            avatarUrl: res.tempFiles[0].tempFilePath, // Preview new avatar
            tempFilePath: res.tempFiles[0].tempFilePath // Store path for upload
          });
        }
      },
      fail: (err) => {
        console.log('Choose avatar failed', err);
        if (err.errMsg !== "chooseMedia:fail cancel") {
            wx.showToast({ title: '选择头像失败', icon: 'none' });
        }
      }
    });
  },

  saveProfile: async function () {
    if (this.data.isSaving) return;

    const newNickName = this.data.nickName;
    const newAvatarTempPath = this.data.tempFilePath;

    if (!newNickName) {
      wx.showToast({ title: '昵称不能为空', icon: 'none' });
      return;
    }
    
    // Check if anything actually changed
    const nickNameChanged = newNickName !== this.data.originalNickName;
    const avatarChanged = !!newAvatarTempPath; // Avatar changed if there's a new temp path

    if (!nickNameChanged && !avatarChanged) {
        wx.showToast({ title: '资料未作修改', icon: 'none' });
        return;
    }

    this.setData({ isSaving: true });
    wx.showLoading({ title: '保存中...', mask: true });

    let cloudAvatarUrl = this.data.originalAvatarUrl; // Assume original avatar URL if not changed

    try {
      // 1. Upload avatar if changed
      if (avatarChanged) {
        const uploadResult = await wx.cloud.uploadFile({
          cloudPath: `user_avatars/${app.globalData.userInfo.openid || 'unknown_user'}/${Date.now()}-${Math.floor(Math.random() * 1000)}.png`,
          filePath: newAvatarTempPath,
        });
        if (uploadResult.fileID) {
          cloudAvatarUrl = uploadResult.fileID; // Store File ID (Cloud ID)
        } else {
          throw new Error('头像上传失败');
        }
      }

      // 2. Call cloud function to update user profile in DB
      const updateResult = await wx.cloud.callFunction({
        name: 'updateUserProfile',
        data: {
          nickName: nickNameChanged ? newNickName : null, // Send null if not changed to avoid unnecessary DB update
          avatarUrl: avatarChanged ? cloudAvatarUrl : null, // Send null if not changed
        }
      });

      wx.hideLoading();
      this.setData({ isSaving: false });

      if (updateResult.result && updateResult.result.success) {
        wx.showToast({ title: '保存成功', icon: 'success' });

        // Update local storage and globalData
        const updatedUserInfo = updateResult.result.userInfo;
        app.globalData.userInfo = updatedUserInfo;
        wx.setStorageSync('userInfo', updatedUserInfo);

        // Navigate back to profile page after a short delay
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        throw new Error(updateResult.result.errMsg || '保存失败');
      }
    } catch (error) {
      wx.hideLoading();
      this.setData({ isSaving: false });
      console.error('Save profile error:', error);
      wx.showToast({ title: error.message || '保存失败，请重试', icon: 'none' });
    }
  },

  cancelEdit: function () {
    wx.navigateBack();
  }
}); 
// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const usersCollection = db.collection('users');
const _ = db.command; // 获取数据库操作符

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!openid) {
    return { success: false, errMsg: '获取 OpenID 失败' };
  }

  const { nickName, avatarUrl } = event; // nickName or avatarUrl can be null if not changed

  if (nickName === null && avatarUrl === null) {
    return { success: false, errMsg: '没有提供任何更新信息' };
  }

  try {
    const userRecord = await usersCollection.where({ _openid: openid }).limit(1).get();
    if (userRecord.data.length === 0) {
      return { success: false, errMsg: '用户不存在' };
    }

    const userId = userRecord.data[0]._id;
    const updateData = {};

    if (nickName !== null) {
      updateData.nickName = nickName;
    }
    if (avatarUrl !== null) {
      // If the new avatarUrl is a cloud file ID (starts with cloud://)
      // and the old one was also a cloud ID but different,
      // we might want to delete the old avatar from cloud storage to save space.
      const oldAvatarUrl = userRecord.data[0].avatarUrl;
      if (oldAvatarUrl && oldAvatarUrl.startsWith('cloud://') && 
          avatarUrl.startsWith('cloud://') && oldAvatarUrl !== avatarUrl) {
        try {
          await cloud.deleteFile({ fileList: [oldAvatarUrl] });
          console.log('Old avatar deleted:', oldAvatarUrl);
        } catch (delErr) {
          console.error('Failed to delete old avatar:', delErr);
          // Continue even if deletion fails, as it's not critical for profile update
        }
      }
      updateData.avatarUrl = avatarUrl; // This will be the cloud file ID
    }
    
    updateData.lastProfileUpdateTime = db.serverDate();

    if (Object.keys(updateData).length === 0) {
        return { success: true, userInfo: userRecord.data[0], message: '数据无变化' }; // No actual fields to update
    }

    await usersCollection.doc(userId).update({
      data: updateData
    });

    // Fetch the updated user info to return
    const updatedUserInfo = await usersCollection.doc(userId).get();

    // Construct the userInfo to return to client, similar to doLogin
    const returnUserInfo = {
        openid: updatedUserInfo.data._openid,
        nickName: updatedUserInfo.data.nickName,
        avatarUrl: updatedUserInfo.data.avatarUrl,
        level: updatedUserInfo.data.level,
        points: updatedUserInfo.data.points
        // Add any other fields you consistently return
    };

    console.log('User profile updated successfully for:', openid);
    return { success: true, userInfo: returnUserInfo };

  } catch (e) {
    console.error('Update user profile failed', e);
    return { success: false, errMsg: '更新资料失败: ' + e.message };
  }
}; 
// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const usersCollection = db.collection('users');

// 生成随机昵称的辅助函数
function getRandomNickname() {
  const adjectives = ['快乐的', '勇敢的', '聪明的', '好奇的', '幸运的'];
  const nouns = ['小猫', '小狗', '小鸟', '探险家', '梦想家', '夜猫子'];
  const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
  const randomNumber = Math.floor(Math.random() * 1000);
  return `${randomAdjective}${randomNoun}${randomNumber}`;
}

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { userInfo: userInfoFromWx, useWxProfile } = event; // 获取 useWxProfile

  if (!openid) {
    return { success: false, errMsg: '获取 OpenID 失败' };
  }
  if (!userInfoFromWx) {
    return { success: false, errMsg: '缺少微信用户信息' };
  }

  try {
    const userQuery = await usersCollection.where({ _openid: openid }).limit(1).get();
    let finalUserInfo;

    // 准备要存储或更新的用户信息
    let newNickName = '夜猫访客'; // 默认昵称基础
    let newAvatarUrl = ''; // 默认头像路径，前端应有对应默认图

    if (useWxProfile) {
      newNickName = userInfoFromWx.nickName || getRandomNickname();
      newAvatarUrl = userInfoFromWx.avatarUrl || ''; // 如果微信头像为空，则也使用默认
    } else {
      newNickName = getRandomNickname(); // 用户选择不使用微信昵称，则生成随机昵称
      // newAvatarUrl 保持为空，前端会用默认图
    }

    if (userQuery.data.length > 0) {
      // 用户已存在，更新用户信息
      const userId = userQuery.data[0]._id;
      const updateData = {
        lastLoginTime: db.serverDate(),
      };
      // 只有当用户选择使用微信资料时，才用微信资料更新，否则保留数据库中已有的或新生成的
      if (useWxProfile) {
        updateData.nickName = newNickName;
        updateData.avatarUrl = newAvatarUrl;
        updateData.gender = userInfoFromWx.gender;
        updateData.country = userInfoFromWx.country;
        updateData.province = userInfoFromWx.province;
        updateData.city = userInfoFromWx.city;
        updateData.language = userInfoFromWx.language;
      } else if (!userQuery.data[0].nickName) { // 如果用户之前就没有昵称，且这次选择不使用微信昵称，则设置随机昵称
        updateData.nickName = newNickName;
      }
      // avatarUrl 如果用户选择不使用，则不更新，保留数据库中已有的或者默认的空值
      
      await usersCollection.doc(userId).update({ data: updateData });
      console.log('用户信息更新成功 for openid:', openid);
      const updatedUser = await usersCollection.doc(userId).get();
      finalUserInfo = updatedUser.data;
    } else {
      // 用户不存在，创建新用户
      const newUser = {
        _openid: openid,
        nickName: newNickName,
        avatarUrl: newAvatarUrl,
        gender: useWxProfile ? userInfoFromWx.gender : 0, // 如果不使用微信资料，性别给个默认值
        country: useWxProfile ? userInfoFromWx.country : '',
        province: useWxProfile ? userInfoFromWx.province : '',
        city: useWxProfile ? userInfoFromWx.city : '',
        language: useWxProfile ? userInfoFromWx.language : '',
        registrationTime: db.serverDate(),
        lastLoginTime: db.serverDate(),
        points: 0,
        level: 1,
        isAdmin: false // 新用户默认为非管理员
      };
      const addRes = await usersCollection.add({ data: newUser });
      console.log('新用户创建成功, id:', addRes._id, 'openid:', openid);
      finalUserInfo = { ...newUser, _id: addRes._id };
    }

    const returnUserInfo = {
      openid: finalUserInfo._openid,
      nickName: finalUserInfo.nickName,
      avatarUrl: finalUserInfo.avatarUrl,
      level: finalUserInfo.level,
      points: finalUserInfo.points,
      isAdmin: finalUserInfo.isAdmin || false // 确保返回 isAdmin 字段
    };

    return {
      success: true,
      userInfo: returnUserInfo,
      message: userQuery.data.length > 0 ? '用户更新成功' : '用户注册成功'
    };

  } catch (e) {
    console.error('登录/注册用户失败', e);
    return { success: false, errMsg: '处理用户数据失败: ' + e.message };
  }
}; 
// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV // 表示在当前云环境内运行
});

const db = cloud.database();
const usersCollection = db.collection('users'); // 假设你的用户表名为 'users'

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!openid) {
    return {
      success: false,
      isRegistered: false,
      errMsg: '获取 OpenID 失败'
    };
  }

  try {
    // 查询用户是否已存在
    const userRecord = await usersCollection.where({
      _openid: openid // 注意：在云函数中查询用户自身的记录时，通常使用 _openid
    }).limit(1).get();

    if (userRecord.data.length > 0) {
      // 用户已存在/已注册
      console.log('用户已存在:', userRecord.data[0]);
      const userInfo = userRecord.data[0];
      // 你可以在这里添加逻辑，比如检查用户信息是否完整，是否需要更新等
      // 为了简化，我们直接返回用户信息
      return {
        success: true,
        isRegistered: true,
        userInfo: {
          openid: userInfo._openid, // 通常不直接将 _openid 返回给前端，但此处为演示
          nickName: userInfo.nickName,
          avatarUrl: userInfo.avatarUrl,
          lastLoginTime: new Date(),
          isAdmin: userInfo.isAdmin || false // 确保返回 isAdmin 字段
          // ... 其他你存储的用户信息
        }
      };
    } else {
      // 用户不存在/未注册
      console.log('用户不存在，判定为首次登录或未授权');
      return {
        success: true, // 操作本身是成功的，只是用户未注册
        isRegistered: false,
        userInfo: null
      };
    }
  } catch (e) {
    console.error('查询用户数据失败', e);
    return {
      success: false,
      isRegistered: false,
      errMsg: '查询用户数据失败'
    };
  }
}; 
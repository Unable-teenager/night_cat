const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  // 简单的管理员权限校验示例，实际项目中应有更完善的机制
  // 对于前端公共调用（如商城首页加载分类），可以设置 event.source = 'front-end-public' 来跳过管理员校验
  //if (event.source !== 'front-end-public') {
  //  const adminRes = await db.collection('users').where({ _openid: openid, isAdmin: true }).count();
  //  if (adminRes.total === 0) {
  //    return {
  //      success: false,
  //      message: '无管理员权限',
  //      code: 401
  //    };
  //  }
  //}

  const { isActive } = event; // 新增：获取 isActive 参数

  try {
    let query = db.collection('categories');
    if (typeof isActive === 'boolean') { // 新增：如果 isActive 参数存在且为布尔值
      query = query.where({ isActive: isActive });
    }

    const categoryRes = await query.orderBy('sortOrder', 'asc').get();

    return {
      success: true,
      message: '获取分类列表成功',
      data: categoryRes.data,
      code: 200
    };
  } catch (error) {
    console.error('获取分类列表失败:', error);
    return {
      success: false,
      message: '获取分类列表失败: ' + error.message,
      error: error,
      code: 500
    };
  }
}; 
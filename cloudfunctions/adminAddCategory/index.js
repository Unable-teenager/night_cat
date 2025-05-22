const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  // 管理员权限校验
  const adminRes = await db.collection('users').where({ _openid: openid, isAdmin: true }).count();
  if (adminRes.total === 0) {
    return {
      success: false,
      message: '无管理员权限',
      code: 401
    };
  }

  const { name, sortOrder, isActive } = event;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return {
      success: false,
      message: '分类名称不能为空',
      code: 400
    };
  }

  // 检查分类名称是否已存在 (可选，但推荐)
  const existingCategory = await db.collection('categories').where({ name: name.trim() }).count();
  if (existingCategory.total > 0) {
    return {
      success: false,
      message: '分类名称 \'' + name.trim() + '\' 已存在',
      code: 409 // Conflict
    };
  }

  const categoryData = {
    name: name.trim(),
    sortOrder: typeof sortOrder === 'number' ? sortOrder : 0, // 默认为0
    isActive: typeof isActive === 'boolean' ? isActive : true, // 默认激活
    createdAt: db.serverDate(),
    updatedAt: db.serverDate()
  };

  try {
    const addResult = await db.collection('categories').add({
      data: categoryData
    });
    return {
      success: true,
      message: '分类添加成功',
      code: 201,
      _id: addResult._id,
      data: { _id: addResult._id, ...categoryData }
    };
  } catch (error) {
    console.error('添加分类失败:', error);
    return {
      success: false,
      message: '添加分类失败: ' + error.message,
      error: error,
      code: 500
    };
  }
}; 
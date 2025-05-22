const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});
const db = cloud.database();
const _ = db.command;

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

  const { categoryId, isActive, sortOrder } = event;

  if (!categoryId) {
    return {
      success: false,
      message: '缺少 categoryId 参数',
      code: 400
    };
  }

  const updateData = {};
  if (typeof isActive === 'boolean') {
    updateData.isActive = isActive;
  }
  if (typeof sortOrder === 'number') {
    updateData.sortOrder = sortOrder;
  }

  if (Object.keys(updateData).length === 0) {
    return {
      success: false,
      message: '没有提供任何更新数据 (isActive 或 sortOrder)',
      code: 400
    };
  }

  try {
    const result = await db.collection('categories').doc(categoryId).update({
      data: updateData
    });

    if (result.stats.updated > 0) {
      return {
        success: true,
        message: '分类信息更新成功',
        code: 200,
        data: { categoryId, ...updateData }
      };
    } else {
      // 可能是 categoryId 不存在，或者数据没有实际变化
      const checkExist = await db.collection('categories').doc(categoryId).get();
      if (!checkExist.data) {
        return { success: false, message: '分类不存在', code: 404 };
      }
      // 如果存在但未更新，可能是因为提供的值与数据库中的值相同
      // 检查是否是因为值相同而没有更新
      let noChange = true;
      if (updateData.hasOwnProperty('isActive') && checkExist.data.isActive !== updateData.isActive) noChange = false;
      if (updateData.hasOwnProperty('sortOrder') && checkExist.data.sortOrder !== updateData.sortOrder) noChange = false;
      
      if(noChange){
        return { success: true, message: '数据无变化，未执行更新', code: 200, data: { categoryId, ...updateData } };
      }

      return {
        success: false,
        message: '更新失败，可能分类不存在或数据无变化',
        code: 500 // 或者更具体的错误码
      };
    }
  } catch (error) {
    console.error('更新分类信息失败:', error);
    return {
      success: false,
      message: '更新分类信息失败: ' + error.message,
      error: error,
      code: 500
    };
  }
}; 
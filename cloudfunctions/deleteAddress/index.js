// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  if (!openid) {
    return {
      code: -1,
      msg: '用户未登录'
    }
  }

  if (!event.id) {
    return {
      code: -1,
      msg: '地址ID不能为空'
    }
  }

  try {
    // 验证地址是否存在且属于当前用户
    const addressDoc = await db.collection('userAddress')
      .doc(event.id)
      .get()
    
    if (!addressDoc.data || addressDoc.data._openid !== openid) {
      return {
        code: -1,
        msg: '地址不存在或无权限删除'
      }
    }

    // 检查是否为默认地址
    const isDefault = addressDoc.data.isDefault || false

    // 删除地址
    await db.collection('userAddress')
      .doc(event.id)
      .remove()

    // 如果删除的是默认地址，需要重新设置一个默认地址
    if (isDefault) {
      const addresses = await db.collection('userAddress')
        .where({
          _openid: openid
        })
        .orderBy('createTime', 'desc')
        .limit(1)
        .get()

      if (addresses.data.length > 0) {
        await db.collection('userAddress')
          .doc(addresses.data[0]._id)
          .update({
            data: {
              isDefault: true
            }
          })
      }
    }

    return {
      code: 0,
      msg: '删除地址成功'
    }
  } catch (error) {
    console.error('删除地址失败', error)
    return {
      code: -1,
      msg: '删除地址失败',
      error
    }
  }
}

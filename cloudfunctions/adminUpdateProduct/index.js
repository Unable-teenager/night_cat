// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  // 权限校验
  const adminRecord = await db.collection('users').where({ _openid: wxContext.OPENID, isAdmin: true }).count()
  if (adminRecord.total === 0) {
    return { errCode: 403, errMsg: '权限不足' }
  }

  const { productId, updateData } = event

  if (!productId) {
    return { errCode: 400, errMsg: '缺少商品ID' }
  }
  if (!updateData || Object.keys(updateData).length === 0) {
    return { errCode: 400, errMsg: '缺少需要更新的商品信息' }
  }

  // 防止关键或不应由前端直接修改的字段被篡改
  delete updateData._id // 不允许直接修改_id
  delete updateData.createdAt // 创建时间不应被修改
  delete updateData.salesCount // 销量通常由其他逻辑控制
  // delete updateData._openid; // 如果有记录创建者，通常也不允许修改

  try {
    const updatedProduct = {
      ...updateData,
      updatedAt: db.serverDate()
    }

    await db.collection('products').doc(productId).update({
      data: updatedProduct
    })

    return {
      errCode: 0,
      errMsg: '商品更新成功'
    }

  } catch (e) {
    console.error('adminUpdateProduct error', e)
    // 检查是否因为记录不存在而更新失败
    if (e.errCode === -502004 || (e.errMsg && e.errMsg.includes('document not exists'))) {
        return {
            errCode: 404,
            errMsg: '商品不存在或已被删除'
        }
    }
    return {
      errCode: 500,
      errMsg: '商品更新失败',
      error: e
    }
  }
} 
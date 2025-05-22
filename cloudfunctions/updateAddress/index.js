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

  if (!event.id || !event.address) {
    return {
      code: -1,
      msg: '参数不完整'
    }
  }

  const { id, address } = event
  
  // 基本验证
  if (!address.name || !address.phone || !address.province || !address.city || !address.district || !address.detail) {
    return {
      code: -1,
      msg: '地址信息不完整'
    }
  }

  const transaction = await db.startTransaction()

  try {
    // 验证地址是否存在且属于当前用户
    const addressDoc = await transaction.collection('userAddress')
      .doc(id)
      .get()
    
    if (!addressDoc.data || addressDoc.data._openid !== openid) {
      return {
        code: -1,
        msg: '地址不存在或无权限修改'
      }
    }

    // 如果是默认地址，先将其他默认地址取消
    if (address.isDefault) {
      await transaction.collection('userAddress')
        .where({
          _openid: openid,
          isDefault: true,
          _id: db.command.neq(id) // 排除当前修改的地址
        })
        .update({
          data: {
            isDefault: false
          }
        })
    }

    // 更新地址
    await transaction.collection('userAddress')
      .doc(id)
      .update({
        data: {
          name: address.name,
          phone: address.phone,
          province: address.province,
          city: address.city,
          district: address.district,
          detail: address.detail,
          isDefault: address.isDefault,
          updateTime: db.serverDate()
        }
      })

    await transaction.commit()

    return {
      code: 0,
      msg: '更新地址成功'
    }
  } catch (error) {
    await transaction.rollback()
    console.error('更新地址失败', error)
    return {
      code: -1,
      msg: '更新地址失败',
      error
    }
  }
}

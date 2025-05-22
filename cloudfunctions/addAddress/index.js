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

  if (!event.address) {
    return {
      code: -1,
      msg: '地址信息不能为空'
    }
  }

  const { address } = event
  
  // 基本验证
  if (!address.name || !address.phone || !address.province || !address.city || !address.district || !address.detail) {
    return {
      code: -1,
      msg: '地址信息不完整'
    }
  }

  const transaction = await db.startTransaction()

  try {
    // 如果是默认地址，先将其他默认地址取消
    if (address.isDefault) {
      await transaction.collection('userAddress')
        .where({
          _openid: openid,
          isDefault: true
        })
        .update({
          data: {
            isDefault: false
          }
        })
    }

    // 插入新地址
    const result = await transaction.collection('userAddress').add({
      data: {
        _openid: openid,
        name: address.name,
        phone: address.phone,
        province: address.province,
        city: address.city,
        district: address.district,
        detail: address.detail,
        isDefault: address.isDefault || false,
        createTime: db.serverDate()
      }
    })

    await transaction.commit()

    return {
      code: 0,
      msg: '添加地址成功',
      data: {
        addressId: result._id
      }
    }
  } catch (error) {
    await transaction.rollback()
    console.error('添加地址失败', error)
    return {
      code: -1,
      msg: '添加地址失败',
      error
    }
  }
}

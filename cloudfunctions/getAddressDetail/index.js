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
    // 查询指定ID的地址信息
    const address = await db.collection('userAddress')
      .doc(event.id)
      .get()
      
    // 验证地址是否属于当前用户
    if (address.data && address.data._openid !== openid) {
      return {
        code: -1,
        msg: '地址不存在或无权限访问'
      }
    }

    if (!address.data) {
      return {
        code: -1,
        msg: '地址不存在或无权限访问'
      }
    }

    return {
      code: 0,
      msg: '获取成功',
      data: address.data
    }
  } catch (error) {
    console.error('获取地址详情失败', error)
    return {
      code: -1,
      msg: '获取地址详情失败',
      error
    }
  }
}

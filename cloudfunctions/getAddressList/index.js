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

  try {
    // 查询当前用户的地址列表，按默认地址优先排序
    const addressList = await db.collection('userAddress')
      .where({
        _openid: openid
      })
      .orderBy('isDefault', 'desc') // 默认地址优先
      .orderBy('createTime', 'desc') // 然后按创建时间倒序
      .get()

    return {
      code: 0,
      msg: '获取成功',
      data: addressList.data
    }
  } catch (error) {
    console.error('获取地址列表失败', error)
    return {
      code: -1,
      msg: '获取地址列表失败',
      error
    }
  }
}

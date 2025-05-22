// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()

  // 检查是否为管理员，如果不是，则返回错误
  //此处我们先假设调用者是管理员，实际项目中需要严格的权限校验
  //const adminRecord = await db.collection('users').where({ _openid: wxContext.OPENID, isAdmin: true }).count()
  //if (adminRecord.total === 0) {
  //   return {
  //     errCode: 403,
  //     errMsg: '权限不足'
  //   }
  // }

  const { page = 1, pageSize = 10, filter = {} } = event
  const skip = (page - 1) * pageSize

  let query = {}

  // 构建查询条件 (示例)
  if (filter.name) {
    query.name = db.RegExp({ regexp: filter.name, options: 'i' }) // 模糊搜索商品名称
  }
  if (typeof filter.isActive === 'boolean') {
    query.isActive = filter.isActive
  }
  if (filter.categoryId) {
    query.categoryId = filter.categoryId
  }

  try {
    const productsRes = await db.collection('products')
      .where(query)
      .orderBy('createdAt', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get()

    const totalRes = await db.collection('products').where(query).count()

    return {
      errCode: 0,
      errMsg: '获取商品列表成功',
      data: productsRes.data,
      total: totalRes.total,
      page: page,
      pageSize: pageSize
    }
  } catch (e) {
    console.error('adminGetProductList error', e)
    return {
      errCode: 500,
      errMsg: '获取商品列表失败',
      error: e
    }
  }
} 
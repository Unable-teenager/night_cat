// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  // 对于公共获取数据的云函数，通常不需要管理员权限校验
  // 如果确实需要，则取消以下注释
  /*
  if (event.source !== 'front-end-public') { // 假设从前端调用时会传递 source
    const adminRes = await db.collection('users').where({ _openid: openid, isAdmin: true }).count()
    if (adminRes.total === 0) {
      return {
        success: false,
        message: '无管理员权限',
        code: 401
      }
    }
  }
  */

  const { filter, sortBy } = event // 获取传入的筛选和排序条件

  try {
    let query = db.collection('carousels') // 确保集合名称是 'carousels'

    if (filter) { // 应用筛选条件
      if (typeof filter.isActive === 'boolean') {
        query = query.where({ isActive: filter.isActive })
      }
      // TODO: 根据需要可以添加其他筛选条件, 例如 filter.title, filter.linkType 等
    }

    if (sortBy && sortBy.field && sortBy.direction) { // 应用排序条件
      query = query.orderBy(sortBy.field, sortBy.direction.toLowerCase()) //确保 direction 是小写 (asc, desc)
    } else {
      query = query.orderBy('sortOrder', 'asc') // 默认排序
    }
    
    const carouselRes = await query.get()

    // 这是关键的返回部分
    return {
      success: true, // <--- 必须是这个字段名，值为 true
      message: '获取轮播图列表成功',
      data: carouselRes.data || [], // 确保即使没有数据也返回空数组
      total: carouselRes.data ? carouselRes.data.length : 0, // 返回获取到的数量
      code: 200 // 可选的状态码
    }

  } catch (error) {
    console.error('adminGetCarouselList - 获取轮播图列表失败:', error)
    // 检查是否是集合不存在的错误
    if (error.message && error.message.includes('collection not exists') || (error.errCode && error.errCode === -502005)) {
      return {
        success: false,
        message: '轮播图集合(carousels)不存在，请先在数据库中创建。',
        code: 5001, // 自定义错误码，表示特定错误
        error: error.message
      }
    }
    return {
      success: false, // <--- 必须是这个字段名，值为 false
      message: '获取轮播图列表失败: ' + error.message,
      error: error.message, // 只传递错误消息，避免整个错误对象传递到前端
      code: 500 // 可选的状态码
    }
  }
} 
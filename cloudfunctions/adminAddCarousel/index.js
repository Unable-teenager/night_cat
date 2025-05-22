// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  // 权限校验
  const adminRecord = await db.collection('users').where({ _openid: wxContext.OPENID, isAdmin: true }).count()
  if (adminRecord.total === 0) {
    return { errCode: 403, errMsg: '权限不足' }
  }

  const { carouselData } = event

  if (!carouselData || !carouselData.imageUrl || !carouselData.linkType) {
    return {
      errCode: 400,
      errMsg: '缺少必要的轮播图信息 (图片URL, 链接类型)',
    }
  }

  // 根据 linkType 可能需要校验 linkValue
  if (carouselData.linkType !== 'none' && !carouselData.linkValue) {
     return {
      errCode: 400,
      errMsg: '选择了链接类型但未提供链接目标 (linkValue)',
    }
  }

  try {
    const newCarousel = {
      ...carouselData,
      sortOrder: carouselData.sortOrder || 0,
      isActive: typeof carouselData.isActive === 'boolean' ? carouselData.isActive : true,
      createdAt: db.serverDate(),
      updatedAt: db.serverDate(),
    }

    const addRes = await db.collection('carousels').add({
      data: newCarousel
    })

    return {
      errCode: 0,
      errMsg: '轮播图添加成功',
      carouselId: addRes._id
    }

  } catch (e) {
    console.error('adminAddCarousel error', e)
    return {
      errCode: 500,
      errMsg: '轮播图添加失败',
      error: e
    }
  }
} 
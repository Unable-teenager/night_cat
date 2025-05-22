// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  // 权限校验
  // ...

  const { carouselId, updateData } = event

  if (!carouselId) {
    return { errCode: 400, errMsg: '缺少轮播图ID' }
  }
  if (!updateData || Object.keys(updateData).length === 0) {
    return { errCode: 400, errMsg: '缺少需要更新的轮播图信息' }
  }

  // 防止关键字段被篡改
  delete updateData._id
  delete updateData.createdAt

  try {
    const updatedCarousel = {
      ...updateData,
      updatedAt: db.serverDate()
    }

    await db.collection('carousels').doc(carouselId).update({
      data: updatedCarousel
    })

    return {
      errCode: 0,
      errMsg: '轮播图更新成功'
    }

  } catch (e) {
    console.error('adminUpdateCarousel error', e)
    if (e.errCode === -502004 || (e.errMsg && e.errMsg.includes('document not exists'))) {
        return {
            errCode: 404,
            errMsg: '轮播图不存在或已被删除'
        }
    }
    return {
      errCode: 500,
      errMsg: '轮播图更新失败',
      error: e
    }
  }
} 
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

  const { carouselId } = event

  if (!carouselId) {
    return { errCode: 400, errMsg: '缺少轮播图ID' }
  }

  try {
    // 1. 查询轮播图获取图片 fileID
    const carouselRes = await db.collection('carousels').doc(carouselId).field({ imageUrl: true }).get()
    
    if (carouselRes.data && carouselRes.data.imageUrl && carouselRes.data.imageUrl.startsWith('cloud://')) {
      console.log('Attempting to delete file:', carouselRes.data.imageUrl)
      const deleteStorageRes = await cloud.deleteFile({
        fileList: [carouselRes.data.imageUrl],
      })
      console.log('deleteStorageRes', deleteStorageRes)
      // 可以根据 deleteStorageRes.fileList 结果判断是否成功
    } else if (!carouselRes.data) {
        // 轮播图记录本身不存在
        return {
            errCode: 404,
            errMsg: '轮播图不存在'
        }
    }

    // 2. 删除数据库记录
    const deleteRes = await db.collection('carousels').doc(carouselId).remove()

    if (deleteRes.stats.removed === 0 && !carouselRes.data) {
      return {
        errCode: 404,
        errMsg: '轮播图不存在或已被删除'
      }
    } else if (deleteRes.stats.removed === 0 && carouselRes.data) {
        console.warn('Carousel found but DB remove returned 0 for carouselId:', carouselId)
    }

    return {
      errCode: 0,
      errMsg: '轮播图删除成功 (关联文件尝试删除)'
    }

  } catch (e) {
    console.error('adminDeleteCarousel error', e)
    return {
      errCode: 500,
      errMsg: '轮播图删除失败',
      error: e
    }
  }
} 
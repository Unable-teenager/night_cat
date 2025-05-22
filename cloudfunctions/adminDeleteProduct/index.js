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

  const { productId } = event

  if (!productId) {
    return { errCode: 400, errMsg: '缺少商品ID' }
  }

  try {
    // 1. 查询商品获取图片 fileID 列表
    const productRes = await db.collection('products').doc(productId)
                           .field({ mainImageUrl: true, imageUrls: true, detailImages: true })
                           .get()
    
    let fileIDsToDelete = []
    if (productRes.data) {
      if (productRes.data.mainImageUrl && productRes.data.mainImageUrl.startsWith('cloud://')) {
        fileIDsToDelete.push(productRes.data.mainImageUrl)
      }
      if (productRes.data.imageUrls && Array.isArray(productRes.data.imageUrls)) {
        productRes.data.imageUrls.forEach(url => {
          if (url && url.startsWith('cloud://')) {
            fileIDsToDelete.push(url)
          }
        })
      }
      if (productRes.data.detailImages && Array.isArray(productRes.data.detailImages)) {
        productRes.data.detailImages.forEach(url => {
          if (url && url.startsWith('cloud://')) {
            fileIDsToDelete.push(url)
          }
        })
      }
      
      // 去重 fileIDs
      fileIDsToDelete = [...new Set(fileIDsToDelete)]

      if (fileIDsToDelete.length > 0) {
        console.log('Attempting to delete files:', fileIDsToDelete)
        const deleteStorageRes = await cloud.deleteFile({
          fileList: fileIDsToDelete,
        })
        console.log('deleteStorageRes', deleteStorageRes)
        // 可以根据 deleteStorageRes.fileList 的结果判断哪些成功删除了，这里简单处理，不阻止后续数据库删除
      }
    } else {
      // 商品记录本身不存在，直接返回
      return {
        errCode: 404,
        errMsg: '商品不存在'
      }
    }

    // 2. 删除数据库记录
    const deleteRes = await db.collection('products').doc(productId).remove()

    // remove 操作在记录不存在时不会报错，而是 removed 为 0
    if (deleteRes.stats.removed === 0 && !productRes.data) {
        // 如果到这里 productRes.data 也是 null，说明一开始就没查到记录
        return {
            errCode: 404,
            errMsg: '商品不存在或已被删除'
        }
    } else if (deleteRes.stats.removed === 0 && productRes.data) {
        // 查到了商品但删除数量为0，这通常不应该发生，除非并发操作
        console.warn('Product found but DB remove returned 0 for productId:', productId)
        // 即使这样也认为操作成功了，因为文件可能已删，且记录可能已被其他进程删除
    }

    return {
      errCode: 0,
      errMsg: '商品删除成功 (关联文件尝试删除)'
    }

  } catch (e) {
    console.error('adminDeleteProduct error', e)
    return {
      errCode: 500,
      errMsg: '商品删除失败',
      error: e
    }
  }
} 
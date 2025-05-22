// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()

  // 权限校验
  const adminRecord = await db.collection('users').where({ _openid: wxContext.OPENID, isAdmin: true }).count()
  if (adminRecord.total === 0) {
    return { errCode: 403, errMsg: '权限不足' }
  }

  const { productData } = event // productData 应包含所有必要字段

  if (!productData || !productData.name || typeof productData.price === 'undefined' || typeof productData.stock === 'undefined') {
    return {
      errCode: 400,
      errMsg: '缺少必要的商品信息 (名称、价格、库存)',
    }
  }

  try {
    const newProduct = {
      ...productData, // 展开前端传递的商品数据
      salesCount: productData.salesCount || 0,
      isActive: typeof productData.isActive === 'boolean' ? productData.isActive : true, // 默认为上架
      createdAt: db.serverDate(),
      updatedAt: db.serverDate(),
      // _openid: wxContext.OPENID, // 可选：记录创建者，但管理操作通常不需要与用户openid绑定
    }

    const addRes = await db.collection('products').add({
      data: newProduct
    })

    return {
      errCode: 0,
      errMsg: '商品添加成功',
      productId: addRes._id
    }

  } catch (e) {
    console.error('adminAddProduct error', e)
    return {
      errCode: 500,
      errMsg: '商品添加失败',
      error: e
    }
  }
} 
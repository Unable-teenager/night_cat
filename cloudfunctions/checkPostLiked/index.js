const cloud = require("wx-server-sdk");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { postId } = event;

  if (!postId) {
    return {
      success: false,
      message: "Missing post ID",
    };
  }

  try {
    // 检查用户是否已点赞
    const likeRes = await db
      .collection("post_likes")
      .where({
        postId,
        _openid: openid,
      })
      .get();

    return {
      success: true,
      liked: likeRes.data.length > 0,
    };
  } catch (error) {
    console.error("Error checking like status:", error);
    return {
      success: false,
      message: "Failed to check like status",
      error,
    };
  }
}; 
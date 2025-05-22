const cloud = require("wx-server-sdk");

cloud.init({
	env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();
const _ = db.command;

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
		// 检查帖子是否存在
		const postRes = await db.collection("posts").doc(postId).get();
		if (!postRes.data) {
			return {
				success: false,
				message: "Post not found",
			};
		}

		// 检查用户是否已点赞
		const likeCollection = db.collection("post_likes");
		const existingLike = await likeCollection
			.where({
				postId,
				_openid: openid,
			})
			.get();

		// 如果已点赞，则取消点赞
		if (existingLike.data.length > 0) {
			await likeCollection.doc(existingLike.data[0]._id).remove();

			// 更新帖子点赞数减1
			await db
				.collection("posts")
				.doc(postId)
				.update({
					data: {
						likes: _.inc(-1),
					},
				});

			return {
				success: true,
				liked: false,
				message: "Successfully unliked post",
			};
		}
		// 如果未点赞，则添加点赞
		else {
			await likeCollection.add({
				data: {
					postId,
					_openid: openid,
					createdAt: db.serverDate(),
				},
			});

			// 更新帖子点赞数加1
			await db
				.collection("posts")
				.doc(postId)
				.update({
					data: {
						likes: _.inc(1),
					},
				});

			return {
				success: true,
				liked: true,
				message: "Successfully liked post",
			};
		}
	} catch (error) {
		console.error("Error liking/unliking post:", error);
		return {
			success: false,
			message: "Failed to like/unlike post",
			error,
		};
	}
};

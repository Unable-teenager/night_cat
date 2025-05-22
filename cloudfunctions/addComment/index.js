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
	const { postId, content } = event;

	if (!postId || !content) {
		return {
			success: false,
			message: "Missing required parameters",
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

		// 获取用户信息
		const userRes = await db
			.collection("users")
			.where({ _openid: openid })
			.get();
		let userInfo = {
			nickName: "用户",
			avatarUrl: "",
		};

		if (userRes.data.length > 0) {
			userInfo = {
				nickName: userRes.data[0].nickName || "用户",
				avatarUrl: userRes.data[0].avatarUrl || "",
			};
		}

		// 添加评论
		const commentRes = await db.collection("comments").add({
			data: {
				postId,
				content,
				_openid: openid,
				authorInfo: userInfo,
				createdAt: db.serverDate(),
			},
		});

		// 更新帖子评论数
		await db
			.collection("posts")
			.doc(postId)
			.update({
				data: {
					commentsCount: _.inc(1),
				},
			});

		return {
			success: true,
			commentId: commentRes._id,
			message: "Comment added successfully",
		};
	} catch (error) {
		console.error("Error adding comment:", error);
		return {
			success: false,
			message: "Failed to add comment",
			error,
		};
	}
};

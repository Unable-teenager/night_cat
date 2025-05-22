const cloud = require("wx-server-sdk");

cloud.init({
	env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();
const _ = db.command;

// 云函数入口函数
exports.main = async (event, context) => {
	const { postId, page = 1, pageSize = 20 } = event;
	const skip = (page - 1) * pageSize;

	if (!postId) {
		return {
			success: false,
			message: "Missing post ID",
		};
	}

	try {
		// 获取评论列表
		const commentsRes = await db
			.collection("comments")
			.where({ postId })
			.orderBy("createdAt", "desc")
			.skip(skip)
			.limit(pageSize)
			.get();

		// 获取总数
		const totalRes = await db.collection("comments").where({ postId }).count();

		return {
			success: true,
			data: commentsRes.data,
			pagination: {
				currentPage: page,
				pageSize: pageSize,
				total: totalRes.total,
				totalPages: Math.ceil(totalRes.total / pageSize),
			},
		};
	} catch (error) {
		console.error("Error fetching comments:", error);
		return {
			success: false,
			message: "Failed to fetch comments",
			error,
		};
	}
};

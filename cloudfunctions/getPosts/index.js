const cloud = require("wx-server-sdk");

cloud.init({
	env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();
const _ = db.command;

// 云函数入口函数
exports.main = async (event, context) => {
	const { page = 1, pageSize = 10, topic = null, userId = null } = event;
	const skip = (page - 1) * pageSize;

	let query = { status: "approved" }; // Only fetch approved posts by default

	if (topic) {
		query.topic = topic;
	}

	if (userId) {
		// To fetch posts by a specific user
		query._openid = userId;
	}

	try {
		const postsRes = await db
			.collection("posts")
			.where(query)
			.orderBy("createdAt", "desc")
			.skip(skip)
			.limit(pageSize)
			.get();

		const totalRes = await db.collection("posts").where(query).count();

		return {
			success: true,
			data: postsRes.data,
			pagination: {
				currentPage: page,
				pageSize: pageSize,
				total: totalRes.total,
				totalPages: Math.ceil(totalRes.total / pageSize),
			},
		};
	} catch (e) {
		console.error("Error fetching posts:", e);
		return {
			success: false,
			message: "Failed to fetch posts.",
			error: e,
			errCode: "DATABASE_ERROR",
		};
	}
};

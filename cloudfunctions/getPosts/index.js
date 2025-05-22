const cloud = require("wx-server-sdk");

cloud.init({
	env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();
const _ = db.command;

// 云函数入口函数
exports.main = async (event, context) => {
	const {
		page = 1,
		pageSize = 10,
		topic = null,
		userId = null,
		category = null,
		searchQuery = null,
		postId = null,
	} = event;
	const skip = (page - 1) * pageSize;

	// 如果提供了帖子ID，直接获取特定帖子
	if (postId) {
		try {
			const postRes = await db.collection("posts").doc(postId).get();

			if (!postRes.data) {
				return {
					success: false,
					message: "Post not found",
				};
			}

			// 获取作者信息
			let post = postRes.data;
			if (!post.authorInfo && post._openid) {
				const userRes = await db
					.collection("users")
					.where({
						_openid: post._openid,
					})
					.get();

				if (userRes.data.length > 0) {
					post.authorInfo = {
						nickName: userRes.data[0].nickName || "用户",
						avatarUrl: userRes.data[0].avatarUrl || "",
					};
				} else {
					post.authorInfo = {
						nickName: "用户",
						avatarUrl: "",
					};
				}
			}

			return {
				success: true,
				data: [post],
				pagination: {
					currentPage: 1,
					pageSize: 1,
					total: 1,
					totalPages: 1,
				},
			};
		} catch (e) {
			console.error("Error fetching post by ID:", e);
			return {
				success: false,
				message: "Failed to fetch post",
				error: e,
			};
		}
	}

	let query = { status: "approved" }; // Only fetch approved posts by default

	if (topic) {
		query.topic = topic;
	}

	if (userId) {
		// To fetch posts by a specific user
		query._openid = userId;
	}

	if (category) {
		// 按分类筛选
		query.category = category;
	}

	if (searchQuery) {
		// 搜索功能 - 在标题和内容中搜索
		query = _.and([
			query,
			_.or([
				{
					title: db.RegExp({
						regexp: searchQuery,
						options: "i", // 不区分大小写
					}),
				},
				{
					content: db.RegExp({
						regexp: searchQuery,
						options: "i", // 不区分大小写
					}),
				},
			]),
		]);
	}

	try {
		// 获取帖子列表
		const postsRes = await db
			.collection("posts")
			.where(query)
			.orderBy("createdAt", "desc")
			.skip(skip)
			.limit(pageSize)
			.get();

		// 获取总数
		const totalRes = await db.collection("posts").where(query).count();

		// 处理帖子数据，确保每个帖子都有authorInfo
		const posts = postsRes.data;

		// 如果有帖子没有作者信息，尝试获取并添加
		const postsNeedAuthorInfo = posts.filter((post) => !post.authorInfo);
		if (postsNeedAuthorInfo.length > 0) {
			const authorIds = [
				...new Set(postsNeedAuthorInfo.map((post) => post._openid)),
			];

			// 批量获取作者信息
			const usersRes = await db
				.collection("users")
				.where({
					_openid: _.in(authorIds),
				})
				.get();

			// 创建用户映射
			const userMap = {};
			usersRes.data.forEach((user) => {
				userMap[user._openid] = {
					nickName: user.nickName || "用户",
					avatarUrl: user.avatarUrl || "",
				};
			});

			// 为帖子添加作者信息
			posts.forEach((post) => {
				if (!post.authorInfo && userMap[post._openid]) {
					post.authorInfo = userMap[post._openid];
				} else if (!post.authorInfo) {
					// 如果找不到作者信息，使用默认值
					post.authorInfo = {
						nickName: "用户",
						avatarUrl: "",
					};
				}
			});
		}

		return {
			success: true,
			data: posts,
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

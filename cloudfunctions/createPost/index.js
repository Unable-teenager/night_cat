const cloud = require("wx-server-sdk");

cloud.init({
	env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

// 云函数入口函数
exports.main = async (event, context) => {
	const wxContext = cloud.getWXContext();
	const { title, content, category, images = [] } = event; // 添加category和images参数

	if (!title || title.trim() === "") {
		return {
			success: false,
			message: "Post title cannot be empty.",
			errCode: "INVALID_TITLE",
		};
	}

	if (!content || content.trim() === "") {
		return {
			success: false,
			message: "Post content cannot be empty.",
			errCode: "INVALID_CONTENT",
		};
	}

	try {
		// 获取用户信息
		let authorInfo = {};
		try {
			const userRes = await db
				.collection("users")
				.where({
					_openid: wxContext.OPENID,
				})
				.get();

			if (userRes.data.length > 0) {
				const user = userRes.data[0];
				authorInfo = {
					nickName: user.nickName || "用户",
					avatarUrl: user.avatarUrl || "",
				};
			}
		} catch (err) {
			console.error("Error fetching user info:", err);
			// 继续执行，使用默认值
			authorInfo = {
				nickName: "用户",
				avatarUrl: "",
			};
		}

		const newPost = await db.collection("posts").add({
			data: {
				_openid: wxContext.OPENID, // User's openid
				authorId: wxContext.OPENID, // Or a custom user ID if you have one
				authorInfo: authorInfo, // 添加作者信息
				title: title.trim(),
				content: content.trim(),
				category: category || "share", // 添加分类，默认为分享
				images: images || [], // 添加图片数组
				videos: [], // Default to empty array for now
				topic: null, // Default to null for now
				createdAt: db.serverDate(),
				updatedAt: db.serverDate(),
				status: "approved", // Default status, can be 'pending_review' for admin approval
				likes: 0,
				commentsCount: 0,
				views: 0,
			},
		});

		return {
			success: true,
			message: "Post created successfully.",
			postId: newPost._id,
		};
	} catch (e) {
		console.error("Error creating post:", e);
		return {
			success: false,
			message: "Failed to create post.",
			error: e,
			errCode: "DATABASE_ERROR",
		};
	}
};

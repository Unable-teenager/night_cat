const cloud = require("wx-server-sdk");

cloud.init({
	env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

// 云函数入口函数
exports.main = async (event, context) => {
	const wxContext = cloud.getWXContext();
	const { content } = event; // Only expect content for now

	if (!content || content.trim() === "") {
		return {
			success: false,
			message: "Post content cannot be empty.",
			errCode: "INVALID_CONTENT",
		};
	}

	try {
		const newPost = await db.collection("posts").add({
			data: {
				_openid: wxContext.OPENID, // User's openid
				authorId: wxContext.OPENID, // Or a custom user ID if you have one
				content: content,
				images: [], // Default to empty array for now
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

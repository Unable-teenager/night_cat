const cloud = require("wx-server-sdk");

cloud.init({
	env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

// Dummy admin check - replace with your actual admin validation logic
async function isAdmin(openid) {
	// IMPORTANT: Replace this with a secure admin check in production!
	return openid === "YOUR_ADMIN_OPENID_HERE"; // Replace with actual admin OpenID
}

// 云函数入口函数
exports.main = async (event, context) => {
	const wxContext = cloud.getWXContext();
	const { postId } = event;

	// Admin check
	const isAdminUser = await isAdmin(wxContext.OPENID);
	if (!isAdminUser) {
		return {
			success: false,
			message: "Unauthorized access. Admin privileges required.",
			errCode: "ADMIN_AUTH_FAILED",
		};
	}

	if (!postId) {
		return {
			success: false,
			message: "Post ID is required.",
			errCode: "INVALID_INPUT",
		};
	}

	try {
		const result = await db.collection("posts").doc(postId).remove();

		if (result.stats.removed === 0) {
			return {
				success: false,
				message: "Post not found or already deleted.",
				errCode: "POST_NOT_FOUND",
			};
		}

		return {
			success: true,
			message: "Post deleted successfully.",
		};
	} catch (e) {
		console.error("Error deleting post:", e);
		return {
			success: false,
			message: "Failed to delete post.",
			error: e,
			errCode: "DATABASE_ERROR",
		};
	}
};

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
	const { postId, status } = event;

	// Admin check
	const isAdminUser = await isAdmin(wxContext.OPENID);
	if (!isAdminUser) {
		return {
			success: false,
			message: "Unauthorized access. Admin privileges required.",
			errCode: "ADMIN_AUTH_FAILED",
		};
	}

	if (!postId || !status) {
		return {
			success: false,
			message: "Post ID and new status are required.",
			errCode: "INVALID_INPUT",
		};
	}

	// You might want to add validation for allowed status values
	const allowedStatuses = ["approved", "pending_review", "rejected", "hidden"];
	if (!allowedStatuses.includes(status)) {
		return {
			success: false,
			message: "Invalid status value.",
			errCode: "INVALID_STATUS",
		};
	}

	try {
		const result = await db
			.collection("posts")
			.doc(postId)
			.update({
				data: {
					status: status,
					updatedAt: db.serverDate(),
				},
			});

		if (result.stats.updated === 0) {
			return {
				success: false,
				message: "Post not found or status already up-to-date.",
				errCode: "POST_NOT_FOUND_OR_NO_CHANGE",
			};
		}

		return {
			success: true,
			message: "Post status updated successfully.",
		};
	} catch (e) {
		console.error("Error updating post status:", e);
		return {
			success: false,
			message: "Failed to update post status.",
			error: e,
			errCode: "DATABASE_ERROR",
		};
	}
};

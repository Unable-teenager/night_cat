const cloud = require("wx-server-sdk");

cloud.init({
	env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();
const _ = db.command;

// Dummy admin check - replace with your actual admin validation logic
async function isAdmin(openid) {
	// Example: Check if openid exists in an 'admins' collection
	// const adminRecord = await db.collection('admins').where({ _openid: openid }).count();
	// return adminRecord.total > 0;
	// For now, let's assume a hardcoded admin OpenID for testing
	// IMPORTANT: Replace this with a secure admin check in production!
	return openid === "YOUR_ADMIN_OPENID_HERE"; // Replace with actual admin OpenID
}

// 云函数入口函数
exports.main = async (event, context) => {
	const wxContext = cloud.getWXContext();

	// Admin check
	const isAdminUser = await isAdmin(wxContext.OPENID);
	if (!isAdminUser) {
		return {
			success: false,
			message: "Unauthorized access. Admin privileges required.",
			errCode: "ADMIN_AUTH_FAILED",
		};
	}

	const {
		page = 1,
		pageSize = 10,
		status = null,
		userId = null,
		sortBy = "createdAt",
		sortOrder = "desc",
	} = event;
	const skip = (page - 1) * pageSize;

	let query = {};

	if (status) {
		query.status = status; // e.g., 'approved', 'pending_review', 'rejected'
	}

	if (userId) {
		query._openid = userId; // Filter by specific user
	}

	try {
		const postsRes = await db
			.collection("posts")
			.where(query)
			.orderBy(sortBy, sortOrder)
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
		console.error("Error fetching posts for admin:", e);
		return {
			success: false,
			message: "Failed to fetch posts for admin.",
			error: e,
			errCode: "DATABASE_ERROR",
		};
	}
};

const util = require("../../utils/util.js");
const app = getApp();

Page({
	data: {
		postId: "",
		post: null,
		comments: [],
		commentContent: "",
		isLoading: true,
		commentsLoading: false,
		hasError: false,
		isLiked: false,
		currentPage: 1,
		pageSize: 20,
		totalPages: 1,
		noMoreComments: false,
		loadingMoreComments: false,
		userInfo: null,
		isLoggedIn: false,
	},

	onLoad: function (options) {
		const { id } = options;
		if (!id) {
			wx.showToast({
				title: "帖子不存在",
				icon: "none",
			});
			setTimeout(() => {
				wx.navigateBack();
			}, 1500);
			return;
		}

		this.setData({
			postId: id,
			userInfo: app.globalData.userInfo || null,
			isLoggedIn: !!app.globalData.userInfo,
		});

		this.loadPostDetail();
		this.loadComments(true);
		this.checkLikeStatus();
	},

	// 加载帖子详情
	loadPostDetail: function () {
		this.setData({ isLoading: true, hasError: false });

		wx.cloud
			.callFunction({
				name: "getPosts",
				data: {
					postId: this.data.postId,
				},
			})
			.then((res) => {
				if (res.result && res.result.success && res.result.data.length > 0) {
					this.setData({
						post: res.result.data[0],
						hasError: false,
					});
				} else {
					console.error("Failed to load post:", res);
					this.setData({ hasError: true });
					wx.showToast({
						title: "加载帖子失败",
						icon: "none",
					});
				}
			})
			.catch((err) => {
				console.error("Error loading post:", err);
				this.setData({ hasError: true });
				wx.showToast({
					title: "网络错误，请重试",
					icon: "none",
				});
			})
			.finally(() => {
				this.setData({ isLoading: false });
			});
	},

	// 加载评论
	loadComments: function (isRefresh = false) {
		const { postId, currentPage, pageSize } = this.data;

		if (isRefresh) {
			this.setData({
				commentsLoading: true,
				currentPage: 1,
				comments: [],
				noMoreComments: false,
			});
		} else {
			this.setData({ loadingMoreComments: true });
		}

		wx.cloud
			.callFunction({
				name: "getComments",
				data: {
					postId,
					page: isRefresh ? 1 : this.data.currentPage,
					pageSize,
				},
			})
			.then((res) => {
				if (res.result && res.result.success) {
					const newComments = res.result.data || [];
					const updatedComments = isRefresh
						? newComments
						: this.data.comments.concat(newComments);

					this.setData({
						comments: updatedComments,
						totalPages: res.result.pagination.totalPages,
						currentPage:
							(isRefresh ? 1 : this.data.currentPage) +
							(newComments.length > 0 ? 1 : 0),
						noMoreComments:
							newComments.length < this.data.pageSize ||
							(isRefresh ? 1 : this.data.currentPage) >=
								res.result.pagination.totalPages,
					});
				} else {
					console.error("Failed to load comments:", res);
					wx.showToast({
						title: "加载评论失败",
						icon: "none",
					});
				}
			})
			.catch((err) => {
				console.error("Error loading comments:", err);
				wx.showToast({
					title: "网络错误，请重试",
					icon: "none",
				});
			})
			.finally(() => {
				this.setData({
					commentsLoading: false,
					loadingMoreComments: false,
				});
			});
	},

	// 检查点赞状态
	checkLikeStatus: function () {
		if (!this.data.isLoggedIn) return;

		wx.cloud
			.callFunction({
				name: "checkPostLiked",
				data: {
					postId: this.data.postId,
				},
			})
			.then((res) => {
				if (res.result && res.result.success) {
					this.setData({
						isLiked: res.result.liked,
					});
				}
			})
			.catch((err) => {
				console.error("Error checking like status:", err);
			});
	},

	// 处理点赞/取消点赞
	handleLike: function () {
		if (!this.data.isLoggedIn) {
			wx.showToast({
				title: "请先登录",
				icon: "none",
			});
			return;
		}

		wx.cloud
			.callFunction({
				name: "likePost",
				data: {
					postId: this.data.postId,
				},
			})
			.then((res) => {
				if (res.result && res.result.success) {
					// 更新本地状态
					const post = this.data.post;
					post.likes = post.likes || 0;

					if (res.result.liked) {
						post.likes += 1;
					} else {
						post.likes = Math.max(0, post.likes - 1);
					}

					this.setData({
						post: post,
						isLiked: res.result.liked,
					});

					wx.showToast({
						title: res.result.liked ? "已赞" : "已取消",
						icon: "success",
					});
				} else {
					wx.showToast({
						title: "操作失败，请重试",
						icon: "none",
					});
				}
			})
			.catch((err) => {
				console.error("Error liking post:", err);
				wx.showToast({
					title: "网络错误，请重试",
					icon: "none",
				});
			});
	},

	// 处理评论内容变化
	handleCommentInput: function (e) {
		this.setData({
			commentContent: e.detail.value,
		});
	},

	// 提交评论
	submitComment: function () {
		if (!this.data.isLoggedIn) {
			wx.showToast({
				title: "请先登录",
				icon: "none",
			});
			return;
		}

		const content = this.data.commentContent.trim();
		if (!content) {
			wx.showToast({
				title: "评论内容不能为空",
				icon: "none",
			});
			return;
		}

		wx.showLoading({ title: "提交中..." });

		wx.cloud
			.callFunction({
				name: "addComment",
				data: {
					postId: this.data.postId,
					content,
				},
			})
			.then((res) => {
				if (res.result && res.result.success) {
					wx.showToast({
						title: "评论成功",
						icon: "success",
					});

					// 更新帖子评论数
					const post = this.data.post;
					post.commentsCount = (post.commentsCount || 0) + 1;

					this.setData({
						commentContent: "",
						post: post,
					});

					// 重新加载评论
					this.loadComments(true);
				} else {
					wx.showToast({
						title: "评论失败，请重试",
						icon: "none",
					});
				}
			})
			.catch((err) => {
				console.error("Error adding comment:", err);
				wx.showToast({
					title: "网络错误，请重试",
					icon: "none",
				});
			})
			.finally(() => {
				wx.hideLoading();
			});
	},

	// 加载更多评论
	loadMoreComments: function () {
		if (this.data.loadingMoreComments || this.data.noMoreComments) return;
		this.loadComments(false);
	},

	// 预览图片
	previewImage: function (e) {
		const src = e.currentTarget.dataset.src;
		const urls = e.currentTarget.dataset.urls;

		wx.previewImage({
			current: src,
			urls: urls,
		});
	},

	// 格式化时间
	formatTime: function (timestamp) {
		if (!timestamp) return "";

		let date;
		if (timestamp instanceof Date) {
			date = timestamp;
		} else if (timestamp.hasOwnProperty("$date")) {
			// 处理MongoDB日期格式
			date = new Date(timestamp.$date);
		} else {
			// 处理普通时间戳
			date = new Date(timestamp);
		}

		return util.formatTime(date);
	},

	// 获取分类名称
	getCategoryName: function (category) {
		const categoryMap = {
			question: "问题",
			share: "分享",
			discussion: "讨论",
			suggestion: "建议",
		};

		return categoryMap[category] || "分享";
	},

	// 分享
	onShareAppMessage: function () {
		const post = this.data.post;
		return {
			title: post ? post.title || "分享一篇帖子" : "分享一篇帖子",
			path: `/pages/post-detail/post-detail?id=${this.data.postId}`,
		};
	},

	// 下拉刷新
	onPullDownRefresh: function () {
		this.loadPostDetail();
		this.loadComments(true);
		this.checkLikeStatus();
		wx.stopPullDownRefresh();
	},

	// 上拉加载更多评论
	onReachBottom: function () {
		this.loadMoreComments();
	},
});

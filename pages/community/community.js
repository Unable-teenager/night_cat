//index.js

const util = require("../../utils/util.js");
const app = getApp();

Page({
	data: {
		feed: [],
		// originalFeed: [], // No longer needed if always fetching from backend
		feed_length: 0,
		searchQuery: "", // 搜索关键词
		selectedCategory: "", // 选中的分类，空字符串表示全部
		isLoading: true, // Initial loading state
		hasError: false, // 错误状态
		isRefreshing: false,
		loadingMore: false,
		currentPage: 1, // For pagination
		pageSize: 10, // For pagination
		totalPages: 1, // For pagination
		noMoreData: false, // To indicate if all posts are loaded
		userInfo: null,
		isLoggedIn: false,
	},
	//事件处理函数
	bindItemTap: function (e) {
		const postId = e.currentTarget.dataset.id;
		wx.navigateTo({
			url: `../post-detail/post-detail?id=${postId}`, // Assuming a post-detail page
		});
	},
	bindQueTap: function (e) {
		// This function seems related to a Q&A feature, might need separate handling
		// For now, let's assume it also navigates to a post detail or a specific question page
		const postId = e.currentTarget.dataset.id;
		wx.navigateTo({
			url: `../post-detail/post-detail?id=${postId}`,
		});
	},
	onLoad: function () {
		console.log("onLoad community");
		// 获取用户信息
		this.setData({
			userInfo: app.globalData.userInfo || null,
			isLoggedIn: !!app.globalData.userInfo,
		});
		this.loadPosts(true); // Load initial posts
	},
	// 下拉刷新
	onPullDownRefresh: function () {
		this.setData({
			isRefreshing: true,
			currentPage: 1,
			noMoreData: false,
		});
		this.loadPosts(true); // Refresh data
	},
	// 上拉加载更多
	onReachBottom: function () {
		if (this.data.loadingMore || this.data.noMoreData) return;
		this.setData({ loadingMore: true });
		this.loadPosts(false); // Load more data
	},

	// 加载帖子数据 (initial load or refresh)
	loadPosts: function (isRefresh = false) {
		if (isRefresh) {
			this.setData({ isLoading: true, hasError: false, feed: [] });
		} else {
			this.setData({ loadingMore: true });
		}

		const requestData = {
			page: this.data.currentPage,
			pageSize: this.data.pageSize,
		};

		// 添加分类筛选
		if (this.data.selectedCategory) {
			requestData.category = this.data.selectedCategory;
		}

		// 添加搜索关键词
		if (this.data.searchQuery) {
			requestData.searchQuery = this.data.searchQuery;
		}

		wx.cloud
			.callFunction({
				name: "getPosts",
				data: requestData,
			})
			.then((res) => {
				if (res.result && res.result.success) {
					const newPosts = res.result.data || [];
					const updatedFeed = isRefresh
						? newPosts
						: this.data.feed.concat(newPosts);

					this.setData({
						feed: updatedFeed,
						feed_length: updatedFeed.length,
						totalPages: res.result.pagination.totalPages,
						currentPage: this.data.currentPage + (newPosts.length > 0 ? 1 : 0),
						noMoreData:
							newPosts.length < this.data.pageSize ||
							this.data.currentPage > res.result.pagination.totalPages,
						hasError: false,
					});

					// 如果用户已登录，检查每个帖子的点赞状态
					if (this.data.isLoggedIn && updatedFeed.length > 0) {
						this.checkPostsLikeStatus(updatedFeed);
					}
				} else {
					console.error(
						"Failed to load posts:",
						res.result ? res.result.message : "Unknown error",
					);
					this.setData({ hasError: true });
					wx.showToast({
						title: res.result ? res.result.message : "加载帖子失败",
						icon: "none",
					});
				}
			})
			.catch((err) => {
				console.error("Error calling getPosts function:", err);
				this.setData({ hasError: true });
				wx.showToast({
					title: "网络错误，请重试",
					icon: "none",
				});
			})
			.finally(() => {
				this.setData({
					isLoading: false,
					isRefreshing: false,
					loadingMore: false,
				});
				if (isRefresh) {
					wx.stopPullDownRefresh();
				}
				wx.hideNavigationBarLoading();
			});
	},

	// 检查帖子的点赞状态
	checkPostsLikeStatus: function (posts) {
		if (!this.data.isLoggedIn || !posts || posts.length === 0) return;

		// 获取所有帖子ID
		const postIds = posts.map((post) => post._id);

		// 批量检查点赞状态
		Promise.all(
			postIds.map((postId) =>
				wx.cloud.callFunction({
					name: "checkPostLiked",
					data: { postId },
				}),
			),
		)
			.then((results) => {
				const feed = [...this.data.feed];

				results.forEach((res, index) => {
					if (res.result && res.result.success) {
						const postIndex = feed.findIndex(
							(post) => post._id === postIds[index],
						);
						if (postIndex !== -1) {
							feed[postIndex].isLiked = res.result.liked;
						}
					}
				});

				this.setData({ feed });
			})
			.catch((err) => {
				console.error("Error checking posts like status:", err);
			});
	},

	// 刷新数据 (kept for compatibility with wxml, now calls loadPosts)
	refreshData: function () {
		this.onPullDownRefresh();
	},

	// 加载更多数据 (kept for compatibility with wxml, now calls loadPosts)
	loadMoreData: function () {
		this.onReachBottom();
	},

	// 向上滚动刷新 (kept for compatibility with wxml)
	upper: function () {
		// This is typically handled by onPullDownRefresh
		// this.refreshData();
	},
	// 向下滚动加载更多 (kept for compatibility with wxml)
	lower: function (e) {
		// This is typically handled by onReachBottom
		// wx.showNavigationBarLoading();
		// var that = this;
		// setTimeout(function(){wx.hideNavigationBarLoading();that.loadMoreData();}, 1000);
		// console.log("lower")
	},

	/**
	 * 搜索输入事件
	 */
	onSearchInput: function (e) {
		this.setData({
			searchQuery: e.detail.value,
		});
		// 如果搜索框清空，重置搜索
		if (!e.detail.value.trim()) {
			this.setData({
				searchQuery: "",
				currentPage: 1,
				noMoreData: false,
			});
			this.loadPosts(true);
		}
	},

	/**
	 * 搜索确认事件
	 */
	onSearchConfirm: function () {
		const query = this.data.searchQuery.trim();
		if (!query) {
			this.setData({
				searchQuery: "",
				currentPage: 1,
				noMoreData: false,
			});
			this.loadPosts(true); // 搜索为空时重新加载所有帖子
			return;
		}

		// 执行搜索
		this.setData({
			isLoading: true,
			currentPage: 1,
			noMoreData: false,
			feed: [],
		});

		this.loadPosts(true);
	},

	/**
	 * 分类筛选事件
	 */
	onCategoryFilter: function (e) {
		const category = e.currentTarget.dataset.category;
		this.setData({
			selectedCategory: category,
			currentPage: 1,
			noMoreData: false,
			feed: [],
			isLoading: true,
		});

		this.loadPosts(true);
	},

	/**
	 * 重置筛选条件
	 */
	resetFilters: function () {
		this.setData({
			searchQuery: "",
			selectedCategory: "",
			currentPage: 1,
			noMoreData: false,
			feed: [],
			isLoading: true,
		});

		this.loadPosts(true);
	},

	/**
	 * 图片预览
	 */
	previewImage: function (e) {
		const src = e.currentTarget.dataset.src;
		const urls = e.currentTarget.dataset.urls;

		wx.previewImage({
			current: src,
			urls: urls,
		});
	},

	/**
	 * 格式化时间
	 */
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

	/**
	 * 获取分类名称
	 */
	getCategoryName: function (category) {
		const categoryMap = {
			question: "问题",
			share: "分享",
			discussion: "讨论",
			suggestion: "建议",
		};

		return categoryMap[category] || "分享";
	},

	// 点击发布按钮
	onPostTap: function () {
		wx.navigateTo({
			url: "../post-create/post-create", // Navigate to a new page for creating posts
		});
	},

	// 处理点赞/取消点赞
	handleLike: function (e) {
		// 阻止事件冒泡，防止触发帖子详情页面跳转
		e.stopPropagation();

		if (!this.data.isLoggedIn) {
			wx.showToast({
				title: "请先登录",
				icon: "none",
			});
			return;
		}

		const postId = e.currentTarget.dataset.id;
		if (!postId) return;

		wx.cloud
			.callFunction({
				name: "likePost",
				data: {
					postId: postId,
				},
			})
			.then((res) => {
				if (res.result && res.result.success) {
					// 更新本地状态
					const feed = [...this.data.feed];
					const postIndex = feed.findIndex((item) => item._id === postId);

					if (postIndex !== -1) {
						feed[postIndex].likes = feed[postIndex].likes || 0;

						if (res.result.liked) {
							feed[postIndex].likes += 1;
							feed[postIndex].isLiked = true;
						} else {
							feed[postIndex].likes = Math.max(0, feed[postIndex].likes - 1);
							feed[postIndex].isLiked = false;
						}

						this.setData({
							feed: feed,
						});
					}
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

	// 跳转到评论页面
	goToComments: function (e) {
		// 阻止事件冒泡，防止触发帖子详情页面跳转
		e.stopPropagation();

		const postId = e.currentTarget.dataset.id;
		if (!postId) return;

		wx.navigateTo({
			url: `../post-detail/post-detail?id=${postId}`,
		});
	},

	/**
	 * 用户点击右上角分享
	 */
	onShareAppMessage: function (res) {
		if (res.from === "button") {
			// 来自页面内转发按钮
			const postIndex = this.data.feed.findIndex(
				(item) => item._id === res.target.dataset.id,
			);
			if (postIndex !== -1) {
				const post = this.data.feed[postIndex];
				return {
					title: post.title || post.topic || "社区分享",
					path: `/pages/post-detail/post-detail?id=${post._id}`,
					imageUrl: post.images && post.images.length > 0 ? post.images[0] : "",
				};
			}
		}

		// 默认分享
		return {
			title: "社区 - 分享健康养生经验",
			path: "/pages/community/community",
		};
	},
});

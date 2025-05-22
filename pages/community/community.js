//index.js

const util = require("../../utils/util.js");
const app = getApp();

Page({
	data: {
		feed: [],
		// originalFeed: [], // No longer needed if always fetching from backend
		feed_length: 0,
		searchQuery: "", // 搜索关键词
		isLoading: true, // Initial loading state
		hasError: false, // 错误状态
		isRefreshing: false,
		loadingMore: false,
		currentPage: 1, // For pagination
		pageSize: 10, // For pagination
		totalPages: 1, // For pagination
		noMoreData: false, // To indicate if all posts are loaded
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

		wx.cloud
			.callFunction({
				name: "getPosts",
				data: {
					page: this.data.currentPage,
					pageSize: this.data.pageSize,
					// topic: null, // Add if topic filtering is needed
					// userId: null // Add if user-specific posts are needed
				},
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
		// If search query is cleared, reload all posts or implement local filtering if posts are already loaded
		if (!e.detail.value.trim()) {
			this.setData({ currentPage: 1, noMoreData: false });
			this.loadPosts(true);
		}
	},

	/**
	 * 搜索确认事件
	 */
	onSearchConfirm: function () {
		const query = this.data.searchQuery.trim().toLowerCase();
		if (!query) {
			this.setData({ currentPage: 1, noMoreData: false });
			this.loadPosts(true); // Reload all if query is empty
			return;
		}

		// Implement search by calling a modified getPosts or a new searchPosts cloud function
		// For now, let's assume getPosts can handle a search query or we add a new function
		this.setData({
			isLoading: true,
			currentPage: 1,
			noMoreData: false,
			feed: [],
		});
		wx.cloud
			.callFunction({
				name: "getPosts", // Or a new 'searchPosts' function
				data: {
					page: 1,
					pageSize: this.data.pageSize,
					searchQuery: query, // Pass search query to backend
				},
			})
			.then((res) => {
				if (res.result && res.result.success) {
					const searchResults = res.result.data || [];
					this.setData({
						feed: searchResults,
						feed_length: searchResults.length,
						totalPages: res.result.pagination.totalPages,
						currentPage: 2, // Ready for next page if results exist
						noMoreData:
							searchResults.length < this.data.pageSize ||
							1 >= res.result.pagination.totalPages,
						hasError: false,
					});
					if (searchResults.length === 0) {
						wx.showToast({
							title: "没有找到相关内容",
							icon: "none",
						});
					}
				} else {
					this.setData({ hasError: true, feed: [] });
					wx.showToast({
						title: res.result ? res.result.message : "搜索失败",
						icon: "none",
					});
				}
			})
			.catch((err) => {
				console.error("Error during search:", err);
				this.setData({ hasError: true, feed: [] });
				wx.showToast({
					title: "搜索出错，请重试",
					icon: "none",
				});
			})
			.finally(() => {
				this.setData({ isLoading: false });
			});
	},

	//network请求数据, 实现首页刷新 (This seems like a duplicate or old function)
	// refresh0: function(){
	//   var index_api = '';
	//   util.getData(index_api)
	//       .then(function(data){
	//         //this.setData({
	//         //
	//         //});
	//         console.log(data);
	//       });
	// },

	// 点击发布按钮
	onPostTap: function () {
		wx.navigateTo({
			url: "../post-create/post-create", // Navigate to a new page for creating posts
		});
	},

	/**
	 * 用户点击右上角分享
	 */
	onShareAppMessage: function () {
		return {
			title: "社区 - 分享健康养生经验",
			path: "/pages/community/community",
		};
	},
});

Page({
	data: {
		topic: "",
		content: "",
		isSubmitting: false,
		// TODO: Add fields for images and videos
	},

	onTopicInput(e) {
		this.setData({
			topic: e.detail.value,
		});
	},

	onContentInput(e) {
		this.setData({
			content: e.detail.value,
		});
	},

	onSubmitPost(e) {
		if (this.data.isSubmitting) return;
		if (!this.data.content.trim()) {
			wx.showToast({
				title: "内容不能为空",
				icon: "none",
			});
			return;
		}

		this.setData({ isSubmitting: true });
		wx.showLoading({ title: "发布中..." });

		wx.cloud
			.callFunction({
				name: "createPost",
				data: {
					topic: this.data.topic.trim(),
					content: this.data.content.trim(),
					// TODO: Pass image and video data here
					images: [],
					videos: [],
				},
			})
			.then((res) => {
				wx.hideLoading();
				if (res.result && res.result.success) {
					wx.showToast({
						title: "发布成功",
						icon: "success",
						duration: 1500,
					});
					// Navigate back or to the new post
					// For example, navigate back to the community page
					setTimeout(() => {
						wx.navigateBack();
						// Optionally, refresh the community page data
						const pages = getCurrentPages();
						const communityPage = pages.find(
							(p) => p.route === "pages/community/community",
						);
						if (communityPage) {
							communityPage.onPullDownRefresh(); // Or a specific method to reload
						}
					}, 1500);
				} else {
					this.setData({ isSubmitting: false });
					wx.showToast({
						title: res.result ? res.result.message : "发布失败",
						icon: "none",
					});
				}
			})
			.catch((err) => {
				wx.hideLoading();
				this.setData({ isSubmitting: false });
				console.error("Error creating post:", err);
				wx.showToast({
					title: "发布失败，请重试",
					icon: "none",
				});
			});
	},

	onCancel() {
		if (this.data.isSubmitting) return;
		wx.navigateBack();
	},
});

Page({
	data: {
		content: "",
		isSubmitting: false,
		// TODO: Add fields for images and videos
	},

	onContentInput(e) {
		this.setData({
			content: e.detail.value,
		});
		// console.log('Content updated:', this.data.content, 'Trimmed empty:', !this.data.content.trim()); // For debugging button state
	},

	onSubmitPost() {
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
					content: this.data.content.trim(),
					// images: [], // Removed as per requirement for text-only posts for now
					// videos: []  // Removed as per requirement for text-only posts for now
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
					setTimeout(() => {
						wx.navigateBack();
						const pages = getCurrentPages();
						const communityPage = pages.find(
							(p) => p.route === "pages/community/community",
						);
						if (
							communityPage &&
							typeof communityPage.onPullDownRefresh === "function"
						) {
							communityPage.onPullDownRefresh();
						}
					}, 1500);
				} else {
					this.setData({ isSubmitting: false });
					wx.showToast({
						title:
							res.result && res.result.message
								? res.result.message
								: "发布失败",
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

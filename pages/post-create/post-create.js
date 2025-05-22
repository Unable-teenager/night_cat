Page({
	data: {
		title: "",
		content: "",
		isSubmitting: false,
		uploadedImages: [], // 存储上传的图片
		selectedCategory: "share", // 默认分类为分享
	},

	onTitleInput(e) {
		this.setData({
			title: e.detail.value,
		});
	},

	onContentInput(e) {
		this.setData({
			content: e.detail.value,
		});
		// console.log('Content updated:', this.data.content, 'Trimmed empty:', !this.data.content.trim()); // For debugging button state
	},

	// 选择分类
	onCategorySelect(e) {
		const category = e.currentTarget.dataset.category;
		this.setData({
			selectedCategory: category,
		});
	},

	// 选择图片
	chooseImage() {
		const that = this;
		wx.chooseMedia({
			count: 9 - that.data.uploadedImages.length,
			mediaType: ["image"],
			sourceType: ["album", "camera"],
			camera: "back",
			success(res) {
				const tempFiles = res.tempFiles;
				const newImages = tempFiles.map((file) => ({
					tempFilePath: file.tempFilePath,
					size: file.size,
				}));

				that.setData({
					uploadedImages: [...that.data.uploadedImages, ...newImages],
				});
			},
		});
	},

	// 预览图片
	previewImage(e) {
		const current = e.currentTarget.dataset.src;
		const urls = this.data.uploadedImages.map((img) => img.tempFilePath);

		wx.previewImage({
			current,
			urls,
		});
	},

	// 删除图片
	removeImage(e) {
		const index = e.currentTarget.dataset.index;
		const images = this.data.uploadedImages;
		images.splice(index, 1);

		this.setData({
			uploadedImages: images,
		});
	},

	// 上传图片到云存储
	uploadImagesToCloud() {
		if (this.data.uploadedImages.length === 0) {
			return Promise.resolve([]);
		}

		const uploadTasks = this.data.uploadedImages.map((image, index) => {
			return new Promise((resolve, reject) => {
				const cloudPath = `post-images/${Date.now()}_${index}.${image.tempFilePath.match(/\.(\w+)$/)[1]}`;

				wx.cloud.uploadFile({
					cloudPath,
					filePath: image.tempFilePath,
					success: (res) => {
						resolve(res.fileID);
					},
					fail: (err) => {
						console.error("上传图片失败:", err);
						reject(err);
					},
				});
			});
		});

		return Promise.all(uploadTasks);
	},

	onSubmitPost(e) {
		// Get form values directly from the event
		const formData = e.detail.value;
		const title = formData.title.trim();
		const content = formData.content.trim();
		const category = formData.category;

		// Validate form data
		if (!title) {
			wx.showToast({
				title: "标题不能为空",
				icon: "none",
			});
			return;
		}

		if (!content) {
			wx.showToast({
				title: "内容不能为空",
				icon: "none",
			});
			return;
		}

		// Prevent multiple submissions
		if (this.data.isSubmitting) return;

		// Show loading state
		this.setData({ isSubmitting: true });
		wx.showLoading({ title: "发布中..." });

		// 先上传图片，再创建帖子
		this.uploadImagesToCloud()
			.then((fileIDs) => {
				// 调用云函数创建帖子
				return wx.cloud.callFunction({
					name: "createPost",
					data: {
						title: title,
						content: content,
						category: category,
						images: fileIDs,
					},
				});
			})
			.then((res) => {
				wx.hideLoading();

				if (res.result && res.result.success) {
					// Show success message
					wx.showToast({
						title: "发布成功",
						icon: "success",
						duration: 1500,
					});

					// Navigate back after a short delay
					setTimeout(() => {
						wx.navigateBack();

						// Refresh the community page if it exists in the stack
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
					// Show error message
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
				// Handle error
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

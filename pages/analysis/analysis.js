// pages/analysis/analysis.js
Page({
	data: {
		currentDate: "",
		sleepData: {
			qualityScore: 0,
			duration: "",
			deepSleep: "",
			lightSleep: "",
			awakeTime: "",
		},
		sleepAnalysis: {
			quality: "",
			suggestion: "",
		},
		chartImage:
			"https://img-blog.csdnimg.cn/8d9a0221276b479c8997865363bc5973.png",
	},

	onLoad: function (options) {
		this.setCurrentDate();
		this.loadSleepData();
		this.generateSleepAnalysis();
	},

	setCurrentDate: function () {
		const now = new Date();
		const year = now.getFullYear();
		const month = now.getMonth() + 1;
		const day = now.getDate();
		this.setData({
			currentDate: `${year}年${month}月${day}日`,
		});
	},

	loadSleepData: function () {
		// Try to load sleep data from storage
		const storedSleepData = wx.getStorageSync("currentSleepData");

		if (storedSleepData) {
			this.setData({
				sleepData: storedSleepData,
			});
		} else {
			// If no data in storage, generate mock data
			this.generateMockData();
		}
	},

	generateMockData: function () {
		// Random data for demo
		const random = () => Math.floor(Math.random() * 100);
		this.setData({
			"sleepData.qualityScore": (random() % 50) + 50, // 50-100
			"sleepData.duration": `${(random() % 4) + 5}小时${random() % 60}分钟`,
			"sleepData.deepSleep": `${(random() % 2) + 1}小时${random() % 60}分钟`,
			"sleepData.lightSleep": `${(random() % 3) + 3}小时${random() % 60}分钟`,
			"sleepData.awakeTime": `${random() % 4}次`,
		});
	},

	generateSleepAnalysis: function () {
		const score = this.data.sleepData.qualityScore;
		let quality = "";
		let suggestion = "";

		if (score >= 80) {
			quality =
				"您的睡眠质量很好，深度睡眠时间充足，有助于身体恢复和记忆巩固。";
			suggestion = "继续保持良好的睡眠习惯，规律作息，避免睡前大量饮水或进食。";
		} else if (score >= 60) {
			quality =
				"您的睡眠质量良好，但深度睡眠时间略有不足，可能会影响身体恢复。";
			suggestion =
				"尝试在睡前1小时关闭电子设备，保持睡眠环境安静、黑暗和舒适。";
		} else if (score >= 40) {
			quality =
				"您的睡眠质量一般，深度睡眠不足，可能会感到疲惫和注意力不集中。";
			suggestion =
				"建议规律作息，避免咖啡因，睡前可以进行冥想或深呼吸放松身心。";
		} else {
			quality = "您的睡眠质量较差，深度睡眠严重不足，可能影响健康和日常表现。";
			suggestion = "建议咨询医生或睡眠专家，调整睡眠环境，建立健康的睡前习惯。";
		}

		this.setData({
			"sleepAnalysis.quality": quality,
			"sleepAnalysis.suggestion": suggestion,
		});
	},

	navigateBack: function () {
		wx.navigateBack();
	},

	prevDate: function () {
		// In a real app, this would load the previous day's data
		wx.showToast({
			title: "加载前一天数据",
			icon: "none",
		});
		this.generateMockData();
		this.generateSleepAnalysis();
	},

	nextDate: function () {
		// In a real app, this would load the next day's data
		wx.showToast({
			title: "加载后一天数据",
			icon: "none",
		});
		this.generateMockData();
		this.generateSleepAnalysis();
	},
});
